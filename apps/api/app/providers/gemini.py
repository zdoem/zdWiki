import time
import logging
from typing import Optional, List, Iterator
from app.providers.base import BaseLLMProvider, LLMResponse
from app.config import settings

logger = logging.getLogger("zdwiki.gemini")

class GeminiProvider(BaseLLMProvider):
    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        self.api_key = api_key or settings.gemini_api_key
        self.model_name = model or settings.gemini_model or "gemini-1.5-flash"
        self._client = None
        
        if self.api_key:
            try:
                from google import genai
                self._client = genai.Client(api_key=self.api_key)
            except Exception as e:
                logger.warning(f"Could not initialize google-genai client: {e}")

    def generate(self, prompt: str, system_instruction: Optional[str] = None) -> LLMResponse:
        if not self.api_key or not self._client:
            raise RuntimeError("GEMINI_API_KEY is not configured or client failed to initialize.")

        candidate_models = [self.model_name, "gemini-1.5-flash", "gemini-1.5-pro", "gemini-1.5-flash-8b"]
        candidate_models = list(dict.fromkeys(candidate_models))

        start_time = time.time()
        last_error = None

        for model_to_try in candidate_models:
            for attempt in range(2):
                try:
                    config = {}
                    if system_instruction:
                        config["system_instruction"] = system_instruction
                        
                    response = self._client.models.generate_content(
                        model=model_to_try,
                        contents=prompt,
                        config=config if config else None
                    )
                    latency = (time.time() - start_time) * 1000
                    
                    usage = getattr(response, "usage_metadata", None)
                    input_tokens = getattr(usage, "prompt_token_count", len(prompt.split())) if usage else len(prompt.split())
                    output_tokens = getattr(usage, "candidates_token_count", len(response.text.split())) if usage and response.text else (len(response.text.split()) if response.text else 0)

                    return LLMResponse(
                        text=response.text or "",
                        input_tokens=input_tokens,
                        output_tokens=output_tokens,
                        latency_ms=latency,
                        model=model_to_try,
                        provider="gemini"
                    )
                except Exception as e:
                    last_error = e
                    err_msg = str(e)
                    logger.warning(f"Attempt {attempt + 1} with model {model_to_try} failed: {err_msg}")
                    if "503" in err_msg or "429" in err_msg or "UNAVAILABLE" in err_msg:
                        time.sleep(1.0 * (attempt + 1))
                        continue
                    break

        logger.error(f"All Gemini models and retry attempts failed: {last_error}")
        raise RuntimeError(f"Gemini API request failed: {last_error}") from last_error

    def generate_stream(self, prompt: str, system_instruction: Optional[str] = None) -> Iterator[str]:
        if not self.api_key or not self._client:
            raise RuntimeError("GEMINI_API_KEY is not configured or client failed to initialize.")

        candidate_models = [self.model_name, "gemini-1.5-flash", "gemini-1.5-pro"]
        candidate_models = list(dict.fromkeys(candidate_models))

        for model_to_try in candidate_models:
            try:
                config = {}
                if system_instruction:
                    config["system_instruction"] = system_instruction
                
                response_stream = self._client.models.generate_content_stream(
                    model=model_to_try,
                    contents=prompt,
                    config=config if config else None
                )
                for chunk in response_stream:
                    if chunk.text:
                        yield chunk.text
                return
            except Exception as e:
                logger.warning(f"Stream with {model_to_try} failed: {e}")
                continue

        # If stream fails, fallback to generate
        resp = self.generate(prompt=prompt, system_instruction=system_instruction)
        words = resp.text.split(" ")
        for i in range(0, len(words), 4):
            yield " ".join(words[i:i+4]) + " "

    def health_check(self) -> bool:
        return bool(self.api_key and self._client)
