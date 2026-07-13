from pydantic import BaseModel, Field
from typing import List

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, description="User query message")

class ChatResponse(BaseModel):
    response: str = Field(..., description="Violet AI augmented assistant response")
    retrieved_context: List[str] = Field(..., description="Citations of retrieved database contexts")
