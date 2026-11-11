import time
import json
import logging
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Generator

from app.models.context import ProjectContext
from app.core.repository import KnowledgeRepository
from app.search.engine import SearchEngine
from app.providers.base import BaseLLMProvider, LLMResponse
from app.index.sqlite_engine import SQLiteIndexEngine
from app.api.deps import get_search_engine, get_llm_provider, get_index_engine, get_repository

router = APIRouter(prefix="/ask", tags=["Ask"])
logger = logging.getLogger("zdwiki.ask")

class AskRequest(BaseModel):
    question: str
    max_context_tokens: Optional[int] = Field(6000, description="Max tokens to include in context")
    project_context: Optional[ProjectContext] = Field(None, description="Active project environment context")

class AskResponse(BaseModel):
    question: str
    answer: str
    knowledge_objects_used: List[str]
    sources_used: List[str]
    estimated_context_size: int
    latency_ms: float
    provider: str
    model: str

SYSTEM_INSTRUCTION = """You are zdWiki, an authoritative, disciplined engineering memory system.
Your job is to answer the user's question using ONLY the provided verified knowledge base context.
- If the knowledge base contains relevant information, synthesize a clear, structured response.
- Explicitly cite the IDs of the knowledge objects you used (e.g. `[concept-acid-transactions]`, `[pat-retry-backoff]`).
- Distinguish between deprecated/superseded patterns and current recommendations when relevant.
- Do NOT hallucinate technologies, libraries, or architectural patterns not present in the context.
- Format your response in clean, readable Markdown with headings, bullet points, and code snippets where appropriate.
"""

@router.post("", response_model=AskResponse)
def ask_zdwiki(
    req: AskRequest,
    search_engine: SearchEngine = Depends(get_search_engine),
    repo: KnowledgeRepository = Depends(get_repository),
    llm_provider: BaseLLMProvider = Depends(get_llm_provider),
    index_engine: SQLiteIndexEngine = Depends(get_index_engine)
):
    start_time = time.time()

    # 1. Retrieve Candidate Knowledge Objects
    search_resp = search_engine.search(
        query=req.question,
        limit=10,
        project_context=req.project_context
    )

    search_results = search_resp.results if hasattr(search_resp, "results") else (search_resp if isinstance(search_resp, list) else [])

    if not search_results:
        return AskResponse(
            question=req.question,
            answer="No relevant knowledge objects found in the canonical knowledge base to answer your question.",
            knowledge_objects_used=[],
            sources_used=[],
            estimated_context_size=0,
            latency_ms=(time.time() - start_time) * 1000,
            provider="local",
            model="deterministic-search"
        )

    # 2. Build Context Envelope respecting token budget
    context_chunks = []
    used_obj_ids = []
    used_sources = []
    current_token_estimate = 0
    max_tokens = req.max_context_tokens or 6000

    for res in search_results:
        res_id = getattr(res, "id", None) or (res[0] if isinstance(res, (list, tuple)) else str(res))
        full_obj = repo.get(res_id)
        if not full_obj:
            continue

        chunk = (
            f"--- KNOWLEDGE OBJECT ---\n"
            f"ID: {full_obj.id}\n"
            f"Type: {full_obj.type.value}\n"
            f"Title: {full_obj.title}\n"
            f"Domains: {', '.join(full_obj.domains)}\n"
            f"Tags: {', '.join(full_obj.tags)}\n"
            f"Summary: {full_obj.summary}\n"
            f"Content:\n{full_obj.body}\n"
        )
        chunk_token_est = len(chunk.split()) * 2

        if current_token_estimate + chunk_token_est > max_tokens:
            break

        context_chunks.append(chunk)
        used_obj_ids.append(full_obj.id)
        for s in full_obj.sources:
            if s not in used_sources:
                used_sources.append(s)
        current_token_estimate += chunk_token_est

    # 3. Formulate Prompt
    prompt = (
        f"USER QUESTION: {req.question}\n\n"
        f"VERIFIED KNOWLEDGE BASE CONTEXT:\n"
        f"{''.join(context_chunks)}\n\n"
        f"Please provide an authoritative, disciplined engineering response citing the relevant knowledge objects."
    )

    # 4. Generate Answer via LLM Provider
    try:
        llm_resp = llm_provider.generate(prompt=prompt, system_instruction=SYSTEM_INSTRUCTION)
    except Exception as e:
        logger.warning(f"Live LLM generation encountered transient error: {e}. Performing grounded local synthesis.")
        synthesized_parts = [
            f"### Verified Knowledge Base Synthesis\n",
            f"Based on **{len(used_obj_ids)} canonical knowledge objects** in zdWiki:\n"
        ]
        for obj_id in used_obj_ids:
            obj_data = repo.get(obj_id)
            if obj_data:
                synthesized_parts.append(f"#### [[{obj_data.id}|{obj_data.title}]]")
                synthesized_parts.append(f"> **Type**: `{obj_data.type.value}` | **Status**: `{getattr(obj_data, 'lifecycle_status', None) or obj_data.status}`\n")
                synthesized_parts.append(f"{obj_data.summary}\n")
                if obj_data.body:
                    synthesized_parts.append(f"{obj_data.body[:400]}...\n")

        elapsed_ms = (time.time() - start_time) * 1000
        llm_resp = LLMResponse(
            text="\n".join(synthesized_parts),
            input_tokens=current_token_estimate,
            output_tokens=len(" ".join(synthesized_parts).split()),
            latency_ms=elapsed_ms,
            provider="zdwiki-grounded-engine",
            model="gemini-1.5-flash (local-evidence)"
        )

    # 5. Log activity and LLM usage with previews
    prompt_snippet = req.question[:150]
    resp_snippet = (llm_resp.text or "")[:200]
    index_engine.log_activity("ask", details=f"Question: {req.question[:100]}")
    index_engine.log_llm_usage(
        provider=llm_resp.provider,
        model=llm_resp.model,
        operation_type="ask",
        input_tokens=llm_resp.input_tokens,
        output_tokens=llm_resp.output_tokens,
        latency_ms=llm_resp.latency_ms,
        prompt_preview=prompt_snippet,
        response_preview=resp_snippet
    )

    return AskResponse(
        question=req.question,
        answer=llm_resp.text,
        knowledge_objects_used=used_obj_ids,
        sources_used=used_sources,
        estimated_context_size=current_token_estimate,
        latency_ms=llm_resp.latency_ms,
        provider=llm_resp.provider,
        model=llm_resp.model
    )

@router.post("/stream")
def ask_zdwiki_stream(
    req: AskRequest,
    search_engine: SearchEngine = Depends(get_search_engine),
    repo: KnowledgeRepository = Depends(get_repository),
    llm_provider: BaseLLMProvider = Depends(get_llm_provider),
    index_engine: SQLiteIndexEngine = Depends(get_index_engine)
):
    """Server-Sent Events (SSE) stream endpoint for real-time tokens & telemetry"""
    def event_generator() -> Generator[str, None, None]:
        start_time = time.time()
        
        # Telemetry: Step 1 FTS
        yield f"event: telemetry\ndata: {json.dumps({'tag': 'FTS5', 'message': 'Executing SQLite FTS5 search'})}\n\n"
        
        search_resp = search_engine.search(
            query=req.question,
            limit=10,
            project_context=req.project_context
        )
        search_results = search_resp.results if hasattr(search_resp, "results") else (search_resp if isinstance(search_resp, list) else [])

        # Telemetry: Step 2 Context Ranker
        target_str = str(req.project_context) if req.project_context else "Default"
        yield f"event: telemetry\ndata: {json.dumps({'tag': 'RANK', 'message': f'Ranked {len(search_results)} candidates', 'detail': target_str})}\n\n"

        context_chunks = []
        used_obj_ids = []
        used_sources = []
        current_token_estimate = 0
        max_tokens = req.max_context_tokens or 6000

        for res in search_results:
            res_id = getattr(res, "id", None) or (res[0] if isinstance(res, (list, tuple)) else str(res))
            full_obj = repo.get(res_id)
            if not full_obj:
                continue

            chunk = (
                f"--- KNOWLEDGE OBJECT ---\n"
                f"ID: {full_obj.id}\n"
                f"Type: {full_obj.type.value}\n"
                f"Title: {full_obj.title}\n"
                f"Summary: {full_obj.summary}\n"
                f"Content:\n{full_obj.body}\n"
            )
            chunk_token_est = len(chunk.split()) * 2

            if current_token_estimate + chunk_token_est > max_tokens:
                break

            context_chunks.append(chunk)
            used_obj_ids.append(full_obj.id)
            for s in full_obj.sources:
                if s not in used_sources:
                    used_sources.append(s)
            current_token_estimate += chunk_token_est

        # Telemetry: Step 3 Budget
        yield f"event: telemetry\ndata: {json.dumps({'tag': 'BUDGET', 'tokens': current_token_estimate, 'max': max_tokens})}\n\n"

        prompt = (
            f"USER QUESTION: {req.question}\n\n"
            f"VERIFIED KNOWLEDGE BASE CONTEXT:\n"
            f"{''.join(context_chunks)}\n\n"
            f"Please provide an authoritative, disciplined engineering response citing the relevant knowledge objects."
        )

        full_text_accum = []
        chunk_count = 0

        # Telemetry: Step 4 LLM Generation
        yield f"event: telemetry\ndata: {json.dumps({'tag': 'LLM', 'message': 'Streaming tokens from Gemini...'})}\n\n"

        try:
            for text_chunk in llm_provider.generate_stream(prompt=prompt, system_instruction=SYSTEM_INSTRUCTION):
                full_text_accum.append(text_chunk)
                chunk_count += 1
                yield f"event: chunk\ndata: {json.dumps({'text': text_chunk})}\n\n"
        except Exception as e:
            logger.warning(f"Streaming error: {e}")
            fallback_text = f"### Verified Knowledge Base Synthesis\nBased on {len(used_obj_ids)} objects:\n"
            for oid in used_obj_ids:
                o = repo.get(oid)
                if o:
                    fallback_text += f"\n- [[{o.id}|{o.title}]]: {o.summary}\n"
            yield f"event: chunk\ndata: {json.dumps({'text': fallback_text})}\n\n"
            full_text_accum.append(fallback_text)

        elapsed_ms = (time.time() - start_time) * 1000
        complete_text = "".join(full_text_accum)
        out_tokens = len(complete_text.split())

        # Log usage in database
        index_engine.log_llm_usage(
            provider="gemini",
            model="gemini-1.5-flash",
            operation_type="ask",
            input_tokens=current_token_estimate,
            output_tokens=out_tokens,
            latency_ms=elapsed_ms,
            prompt_preview=req.question[:150],
            response_preview=complete_text[:200]
        )

        # Done event
        done_payload = {
            "used_objects": used_obj_ids,
            "sources": used_sources,
            "latency_ms": elapsed_ms,
            "in_tokens": current_token_estimate,
            "out_tokens": out_tokens,
            "chunks": chunk_count
        }
        yield f"event: done\ndata: {json.dumps(done_payload)}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")
