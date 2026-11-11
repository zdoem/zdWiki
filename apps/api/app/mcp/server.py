import sys
import json
import logging
from typing import Optional, Dict, Any

from app.mcp.protocol import (
    JSONRPCRequest,
    JSONRPCResponse,
    MCP_PROTOCOL_VERSION,
    SERVER_NAME,
    SERVER_VERSION,
    PromptDefinition,
    PromptArgument,
    PromptMessage,
    ContentItem
)
from app.mcp.tools import TOOL_DEFINITIONS, execute_tool
from app.mcp.resources import list_resources, read_resource

# Configure stderr-only logger for MCP server
logger = logging.getLogger("zdwiki.mcp")
logger.setLevel(logging.INFO)
stderr_handler = logging.StreamHandler(sys.stderr)
stderr_handler.setFormatter(logging.Formatter("[%(asctime)s] [MCP] [%(levelname)s] %(message)s"))
logger.handlers = [stderr_handler]

# Prompts Catalog
PROMPT_DEFINITIONS = [
    PromptDefinition(
        name="engineering_task_context",
        description="Prepares a comprehensive context bundle for planning and implementing an engineering task.",
        arguments=[
            PromptArgument(name="task_description", description="Description of the task", required=True),
            PromptArgument(name="project_path", description="Optional project.yaml path", required=False)
        ]
    ),
    PromptDefinition(
        name="debug_with_zdwiki",
        description="Retrieves failure modes, regression tests, and debug playbooks for an issue.",
        arguments=[
            PromptArgument(name="issue_description", description="Error message or symptom", required=True)
        ]
    )
]


def _serialize_response(resp) -> str:
    import json
    data = resp.model_dump()
    if data.get("error") is not None:
        data.pop("result", None)
    else:
        data.pop("error", None)
    return json.dumps(data)

class MCPServer:
    def __init__(self, read_only: bool = False):
        self.read_only = read_only
        self.is_initialized = False

    def handle_request(self, req: JSONRPCRequest) -> Optional[JSONRPCResponse]:
        method = req.method
        params = req.params or {}

        # 1. Initialize
        if method == "initialize":
            self.is_initialized = True
            logger.info("Client connected & initialized (read_only=%s)", self.read_only)
            return JSONRPCResponse(
                id=req.id,
                result={
                    "protocolVersion": MCP_PROTOCOL_VERSION,
                    "capabilities": {
                        "tools": {"listChanged": False},
                        "resources": {"subscribe": False, "listChanged": False},
                        "prompts": {"listChanged": False}
                    },
                    "serverInfo": {
                        "name": SERVER_NAME,
                        "version": SERVER_VERSION
                    }
                }
            )

        # 2. Initialized Notification
        if method == "notifications/initialized":
            logger.info("Client acknowledged initialized notification")
            return None

        # 3. Ping
        if method == "ping":
            return JSONRPCResponse(id=req.id, result={})

        # 4. Tools List
        if method == "tools/list":
            tools = TOOL_DEFINITIONS
            if self.read_only:
                mutating_names = {"start_loop", "update_loop", "record_test_result", "record_verification", "propose_lesson"}
                tools = [t for t in tools if t.name not in mutating_names]

            return JSONRPCResponse(
                id=req.id,
                result={"tools": [t.model_dump() for t in tools]}
            )

        # 5. Tools Call
        if method == "tools/call":
            tool_name = params.get("name")
            tool_args = params.get("arguments", {})
            logger.info("Executing tool '%s' with args %s", tool_name, list(tool_args.keys()))

            tool_result = execute_tool(tool_name, tool_args, read_only=self.read_only)
            return JSONRPCResponse(
                id=req.id,
                result=tool_result.model_dump()
            )

        # 6. Resources List
        if method == "resources/list":
            res_list = list_resources()
            return JSONRPCResponse(
                id=req.id,
                result={"resources": [r.model_dump() for r in res_list]}
            )

        # 7. Resources Read
        if method == "resources/read":
            uri = params.get("uri", "")
            res_content = read_resource(uri)
            if not res_content:
                return JSONRPCResponse(
                    id=req.id,
                    error={"code": -32602, "message": f"Resource with URI '{uri}' not found"}
                )
            return JSONRPCResponse(
                id=req.id,
                result={"contents": [res_content.model_dump()]}
            )

        # 8. Prompts List
        if method == "prompts/list":
            return JSONRPCResponse(
                id=req.id,
                result={"prompts": [p.model_dump() for p in PROMPT_DEFINITIONS]}
            )

        # 9. Prompts Get
        if method == "prompts/get":
            pname = params.get("name")
            pargs = params.get("arguments", {})
            if pname == "engineering_task_context":
                task = pargs.get("task_description", "")
                msg = (
                    f"Use zdWiki to analyze and prepare context for the task: '{task}'.\n"
                    f"1. Call `get_context` to fetch bounded architectural patterns and standards.\n"
                    f"2. Follow the disciplined engineering loop (Plan → Implement → Test → Verify → Learn)."
                )
                return JSONRPCResponse(
                    id=req.id,
                    result={
                        "description": "Context for task",
                        "messages": [PromptMessage(role="user", content=ContentItem(type="text", text=msg)).model_dump()]
                    }
                )
            elif pname == "debug_with_zdwiki":
                issue = pargs.get("issue_description", "")
                msg = (
                    f"Debug issue with zdWiki: '{issue}'.\n"
                    f"1. Call `find_bugs` and `find_debug_playbooks` for matching symptoms.\n"
                    f"2. Check related tests using `find_tests`."
                )
                return JSONRPCResponse(
                    id=req.id,
                    result={
                        "description": "Debug prompt",
                        "messages": [PromptMessage(role="user", content=ContentItem(type="text", text=msg)).model_dump()]
                    }
                )
            else:
                return JSONRPCResponse(
                    id=req.id,
                    error={"code": -32602, "message": f"Prompt '{pname}' not found"}
                )

        # Method Not Found
        logger.warning("Unknown JSON-RPC method: %s", method)
        return JSONRPCResponse(
            id=req.id,
            error={"code": -32601, "message": f"Method '{method}' not found"}
        )

    def serve_stdio(self):
        """Runs the JSON-RPC stdio event loop."""
        logger.info("Starting zdWiki MCP stdio server (read_only=%s)...", self.read_only)
        for line in sys.stdin:
            line_str = line.strip()
            if not line_str:
                continue

            try:
                raw_json = json.loads(line_str)
                req = JSONRPCRequest(**raw_json)
                resp = self.handle_request(req)
                if resp is not None:
                    sys.stdout.write(_serialize_response(resp) + "\n")
                    sys.stdout.flush()
            except json.JSONDecodeError as e:
                err_resp = JSONRPCResponse(
                    id=None,
                    error={"code": -32700, "message": f"JSON Parse error: {str(e)}"}
                )
                sys.stdout.write(_serialize_response(err_resp) + "\n")
                sys.stdout.flush()
            except Exception as e:
                logger.error("Unhandled error processing request: %s", str(e), exc_info=True)
                err_resp = JSONRPCResponse(
                    id=None,
                    error={"code": -32603, "message": f"Internal server error: {str(e)}"}
                )
                sys.stdout.write(_serialize_response(err_resp) + "\n")
                sys.stdout.flush()

def main():
    import argparse
    parser = argparse.ArgumentParser(description="zdWiki MCP Server")
    parser.add_argument("--read-only", action="store_true", help="Run MCP server in read-only mode")
    args = parser.parse_args()

    server = MCPServer(read_only=args.read_only)
    server.serve_stdio()

if __name__ == "__main__":
    main()
