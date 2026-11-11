import time
from typing import Optional
from app.providers.base import BaseLLMProvider, LLMResponse

class MockLLMProvider(BaseLLMProvider):
    def __init__(self, fixed_response: str = "Mock answer synthesized from provided knowledge objects."):
        self.fixed_response = fixed_response

    def generate(self, prompt: str, system_instruction: Optional[str] = None) -> LLMResponse:
        start_time = time.time()
        # Simple simulated extraction from prompt context
        response_text = self.fixed_response
        if "jwt" in prompt.lower() or "expiry" in prompt.lower():
            response_text = (
                "Based on the knowledge base: To handle JWT expiry and avoid race conditions, "
                "verify token expiration using `test-jwt-expiry` and implement refresh token rotation "
                "with a grace period as documented in `pat-refresh-token-rotation` and `playbook-jwt-debug`."
            )
        
        latency = (time.time() - start_time) * 1000
        return LLMResponse(
            text=response_text,
            input_tokens=len(prompt.split()),
            output_tokens=len(response_text.split()),
            latency_ms=latency,
            model="mock-v1",
            provider="mock"
        )

    def health_check(self) -> bool:
        return True
