from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

# ----------------- Watchlist -----------------
class WatchlistCreate(BaseModel):
    asset_type: str = Field(..., description="'stock' or 'crypto'")
    ticker: str = Field(..., description="e.g. AAPL, BTC")
    name: str = Field(..., description="Full asset name")

class WatchlistResponse(WatchlistCreate):
    id: str
    user_id: str
    created_at: datetime

    class Config:
        from_attributes = True


# ----------------- Transactions -----------------
class InvestmentTransactionCreate(BaseModel):
    asset_type: str = Field(..., description="'stock' or 'crypto'")
    ticker: str = Field(..., description="e.g. AAPL, BTC")
    name: str = Field(..., description="Full asset name")
    transaction_type: str = Field(..., description="'buy' or 'sell'")
    quantity: float = Field(..., gt=0, description="Amount bought/sold")
    price: float = Field(..., gt=0, description="Unit cost at transaction")
    date: Optional[datetime] = None

class InvestmentTransactionResponse(InvestmentTransactionCreate):
    id: str
    user_id: str
    date: datetime
    created_at: datetime

    class Config:
        from_attributes = True


# ----------------- Portfolio Analytics -----------------
class Holding(BaseModel):
    ticker: str
    name: str
    asset_type: str
    quantity: float
    average_cost: float
    current_price: float
    total_value: float
    total_pl: float
    pl_percentage: float

class AllocationBreakdown(BaseModel):
    name: str  # "stock" or "crypto"
    value: float
    percentage: float

class TickerAllocation(BaseModel):
    ticker: str
    value: float
    percentage: float

class InvestmentPortfolio(BaseModel):
    total_value: float
    total_cost: float
    total_pl: float
    pl_percentage: float
    allocation: List[AllocationBreakdown]
    ticker_allocation: List[TickerAllocation]
    holdings: List[Holding]
    watchlist: List[WatchlistResponse]
