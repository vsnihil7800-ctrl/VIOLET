import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, ForeignKey, String, Float
from sqlalchemy.orm import relationship
from app.core.database import Base

class InvestmentTransaction(Base):
    __tablename__ = "investment_transactions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    asset_type = Column(String, nullable=False)  # "stock" or "crypto"
    ticker = Column(String, nullable=False, index=True)  # e.g., "AAPL", "BTC"
    name = Column(String, nullable=False)  # e.g., "Apple Inc.", "Bitcoin"
    transaction_type = Column(String, nullable=False)  # "buy" or "sell"
    quantity = Column(Float, nullable=False)
    price = Column(Float, nullable=False)
    date = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime, 
        default=lambda: datetime.now(timezone.utc), 
        onupdate=lambda: datetime.now(timezone.utc)
    )

    # Relationship
    user = relationship("User", backref="investment_transactions")


class Watchlist(Base):
    __tablename__ = "watchlist"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    asset_type = Column(String, nullable=False)  # "stock" or "crypto"
    ticker = Column(String, nullable=False, index=True)
    name = Column(String, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationship
    user = relationship("User", backref="watchlist_items")
