from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

# ----------------- Transactions -----------------
class TransactionBase(BaseModel):
    type: str = Field(..., description="'income' or 'expense'")
    category: str = Field(..., description="Category like Food, Bills, etc.")
    amount: float = Field(..., gt=0, description="Amount of transaction")
    date: Optional[datetime] = None
    description: Optional[str] = None

class TransactionCreate(TransactionBase):
    pass

class TransactionUpdate(BaseModel):
    type: Optional[str] = None
    category: Optional[str] = None
    amount: Optional[float] = Field(None, gt=0)
    date: Optional[datetime] = None
    description: Optional[str] = None

class TransactionResponse(TransactionBase):
    id: str
    user_id: str
    date: datetime
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ----------------- Budgets -----------------
class BudgetBase(BaseModel):
    category: str = Field(..., description="Category name, or 'all' for overall budget")
    limit_amount: float = Field(..., gt=0, description="Budget spending limit")
    month: int = Field(..., ge=1, le=12)
    year: int

class BudgetCreate(BudgetBase):
    pass

class BudgetResponse(BudgetBase):
    id: str
    user_id: str

    class Config:
        from_attributes = True


# ----------------- Debts -----------------
class DebtBase(BaseModel):
    type: str = Field(..., description="'owed_by_me' or 'owed_to_me'")
    person: str = Field(..., description="Person's name")
    amount: float = Field(..., gt=0)
    description: Optional[str] = None
    due_date: Optional[datetime] = None

class DebtCreate(DebtBase):
    pass

class DebtUpdate(BaseModel):
    type: Optional[str] = None
    person: Optional[str] = None
    amount: Optional[float] = Field(None, gt=0)
    description: Optional[str] = None
    is_settled: Optional[bool] = None
    due_date: Optional[datetime] = None

class DebtResponse(DebtBase):
    id: str
    user_id: str
    is_settled: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ----------------- Reports & Dashboards -----------------
class CategoryBreakdown(BaseModel):
    category: str
    total: float
    percentage: float

class BudgetStatus(BaseModel):
    id: str
    category: str
    limit_amount: float
    spent: float
    percent: float

class CashFlowMonth(BaseModel):
    month: str
    income: float
    expenses: float

class FinanceSummary(BaseModel):
    total_income: float
    total_expenses: float
    net_savings: float
    total_owed_to_me: float
    total_owed_by_me: float
    categories: List[CategoryBreakdown]
    budgets: List[BudgetStatus]
    recent_transactions: List[TransactionResponse]
    cash_flow_history: Optional[List[CashFlowMonth]] = None
