from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, Field

# MCP Protocol Version Constants
MCP_PROTOCOL_VERSION = "2024-11-05"
SERVER_NAME = "zdwiki-mcp"
SERVER_VERSION = "1.0.0"

class JSONRPCRequest(BaseModel):
    jsonrpc: str = "2.0"
    id: Optional[Union[str, int]] = None
    method: str
    params: Optional[Dict[str, Any]] = None

class JSONRPCResponse(BaseModel):
    jsonrpc: str = "2.0"
    id: Optional[Union[str, int]] = None
    result: Optional[Any] = None
    error: Optional[Dict[str, Any]] = None

class ToolDefinition(BaseModel):
    name: str
    description: str
    inputSchema: Dict[str, Any] = Field(default_factory=dict)

class ContentItem(BaseModel):
    type: str = "text"
    text: str

class CallToolResult(BaseModel):
    content: List[ContentItem] = Field(default_factory=list)
    isError: bool = False

class ResourceDefinition(BaseModel):
    uri: str
    name: str
    description: Optional[str] = None
    mimeType: Optional[str] = "text/markdown"

class ResourceContent(BaseModel):
    uri: str
    mimeType: Optional[str] = "text/markdown"
    text: str

class PromptArgument(BaseModel):
    name: str
    description: Optional[str] = None
    required: bool = False

class PromptDefinition(BaseModel):
    name: str
    description: Optional[str] = None
    arguments: List[PromptArgument] = Field(default_factory=list)

class PromptMessage(BaseModel):
    role: str = "user"
    content: ContentItem
