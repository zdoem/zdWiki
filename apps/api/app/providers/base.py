from abc import ABC, abstractmethod
from typing import Optional, Dict, Any, Type, Iterator
from pydantic import BaseModel

class LLMResponse(BaseModel):
    text: str
    input_tokens: int = 0
    output_tokens: int = 0
    latency_ms: float = 0.0
    model: str = ""
    provider: str = ""

class BaseLLMProvider(ABC):
    @abstractmethod
    def generate(self, prompt: str, system_instruction: Optional[str] = None) -> LLMResponse:
        pass

    def generate_stream(self, prompt: str, system_instruction: Optional[str] = None) -> Iterator[str]:
        resp = self.generate(prompt=prompt, system_instruction=system_instruction)
        # Default fallback stream chunking
        words = resp.text.split(" ")
        for i in range(0, len(words), 3):
            yield " ".join(words[i:i+3]) + " "

    @abstractmethod
    def health_check(self) -> bool:
        pass
