import uuid
from datetime import datetime, timezone
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Float
from sqlalchemy.orm import relationship
from app.core.database import Base

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    type = Column(String, nullable=False)  # "income" or "expense"
    category = Column(String, nullable=False)  # e.g., "Food", "Bills", "Salary"
    amount = Column(Float, nullable=False)
    date = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    description = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime, 
        default=lambda: datetime.now(timezone.utc), 
        onupdate=lambda: datetime.now(timezone.utc)
    )

    # Relationship
    user = relationship("User", backref="transactions")


class Budget(Base):
    __tablename__ = "budgets"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    category = Column(String, nullable=False)  # "all" or specific category e.g., "Food"
    limit_amount = Column(Float, nullable=False)
    month = Column(Integer, nullable=False)  # 1-12
    year = Column(Integer, nullable=False)

    # Relationship
    user = relationship("User", backref="budgets")


class Debt(Base):
    __tablename__ = "debts"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    type = Column(String, nullable=False)  # "owed_by_me" (I owe) or "owed_to_me" (Owed to me)
    person = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    description = Column(String, nullable=True)
    is_settled = Column(Boolean, default=False, nullable=False)
    due_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime, 
        default=lambda: datetime.now(timezone.utc), 
        onupdate=lambda: datetime.now(timezone.utc)
    )

    # Relationship
    user = relationship("User", backref="debts")
