from app.providers.base import BaseLLMProvider, LLMResponse
from app.providers.gemini import GeminiProvider
from app.providers.mock import MockLLMProvider

def get_llm_provider() -> BaseLLMProvider:
    from app.config import settings
    if settings.gemini_api_key:
        return GeminiProvider(api_key=settings.gemini_api_key, model=settings.gemini_model)
    return MockLLMProvider()

__all__ = [
    "BaseLLMProvider",
    "LLMResponse",
    "GeminiProvider",
    "MockLLMProvider",
    "get_llm_provider"
]
