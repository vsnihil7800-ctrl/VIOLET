from pydantic import BaseModel, Field
from typing import Optional

class ScannedFoodResponse(BaseModel):
    image_path: str
    food_name: str
    calories: float
    protein_g: float
    carbs_g: float
    fat_g: float

class ScannedReceiptResponse(BaseModel):
    merchant: str
    category: str
    amount: float
    description: str

class AIAdviceResponse(BaseModel):
    advisory_text: str
    rebalance_score: int  # 1 to 100
