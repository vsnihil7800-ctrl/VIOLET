from datetime import datetime, timezone
from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.api import deps
from app.core.database import get_db
from app.models.user import User
from app.models.finance import Transaction, Budget, Debt
from app.schemas.finance import (
    TransactionCreate,
    TransactionUpdate,
    TransactionResponse,
    BudgetCreate,
    BudgetResponse,
    DebtCreate,
    DebtUpdate,
    DebtResponse,
    FinanceSummary,
    CategoryBreakdown,
    BudgetStatus
)

router = APIRouter()

# ----------------- Transactions Endpoints -----------------

@router.get("/transactions", response_model=dict)
def read_transactions(
    type: Optional[str] = None,
    category: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 15,
    offset: int = 0,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Retrieve transactions with search, filter, and pagination support."""
    query = db.query(Transaction).filter(Transaction.user_id == current_user.id)
    
    if type:
        query = query.filter(Transaction.type == type)
    if category:
        query = query.filter(Transaction.category == category)
    if search:
        query = query.filter(
            (Transaction.description.ilike(f"%{search}%")) |
            (Transaction.category.ilike(f"%{search}%"))
        )
        
    total = query.count()
    items = query.order_by(Transaction.date.desc()).offset(offset).limit(limit).all()
    
    return {"items": items, "total": total}

@router.post("/transactions", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
def create_transaction(
    transaction_in: TransactionCreate,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Create a new transaction (income/expense)."""
    db_transaction = Transaction(
        user_id=current_user.id,
        type=transaction_in.type,
        category=transaction_in.category,
        amount=transaction_in.amount,
        date=transaction_in.date or datetime.now(timezone.utc),
        description=transaction_in.description
    )
    db.add(db_transaction)
    db.commit()
    db.refresh(db_transaction)
    return db_transaction

@router.put("/transactions/{id}", response_model=TransactionResponse)
def update_transaction(
    id: str,
    transaction_in: TransactionUpdate,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Update a specific transaction."""
    db_transaction = db.query(Transaction).filter(
        Transaction.id == id, Transaction.user_id == current_user.id
    ).first()
    
    if not db_transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
        
    update_data = transaction_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_transaction, field, value)
        
    db.commit()
    db.refresh(db_transaction)
    return db_transaction

@router.delete("/transactions/{id}", status_code=status.HTTP_200_OK)
def delete_transaction(
    id: str,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Delete a transaction."""
    db_transaction = db.query(Transaction).filter(
        Transaction.id == id, Transaction.user_id == current_user.id
    ).first()
    
    if not db_transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
        
    db.delete(db_transaction)
    db.commit()
    return {"detail": "Transaction successfully deleted"}


# ----------------- Budgets Endpoints -----------------

@router.get("/budgets", response_model=List[BudgetResponse])
def read_budgets(
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """List all budgets of the user."""
    return db.query(Budget).filter(Budget.user_id == current_user.id).all()

@router.post("/budgets", response_model=BudgetResponse)
def create_or_update_budget(
    budget_in: BudgetCreate,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Create or update a budget limit for a category."""
    # Check if budget already exists for category, month, and year
    existing_budget = db.query(Budget).filter(
        Budget.user_id == current_user.id,
        Budget.category == budget_in.category,
        Budget.month == budget_in.month,
        Budget.year == budget_in.year
    ).first()
    
    if existing_budget:
        existing_budget.limit_amount = budget_in.limit_amount
        db.commit()
        db.refresh(existing_budget)
        return existing_budget
        
    db_budget = Budget(
        user_id=current_user.id,
        category=budget_in.category,
        limit_amount=budget_in.limit_amount,
        month=budget_in.month,
        year=budget_in.year
    )
    db.add(db_budget)
    db.commit()
    db.refresh(db_budget)
    return db_budget

@router.delete("/budgets/{id}", status_code=status.HTTP_200_OK)
def delete_budget(
    id: str,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Delete a budget."""
    db_budget = db.query(Budget).filter(
        Budget.id == id, Budget.user_id == current_user.id
    ).first()
    
    if not db_budget:
        raise HTTPException(status_code=404, detail="Budget not found")
        
    db.delete(db_budget)
    db.commit()
    return {"detail": "Budget successfully deleted"}


# ----------------- Debts Endpoints -----------------

@router.get("/debts", response_model=List[DebtResponse])
def read_debts(
    type: Optional[str] = None,
    is_settled: Optional[bool] = None,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """List debts (Money I Owe / Money Owed to Me) with filters."""
    query = db.query(Debt).filter(Debt.user_id == current_user.id)
    if type:
        query = query.filter(Debt.type == type)
    if is_settled is not None:
        query = query.filter(Debt.is_settled == is_settled)
    return query.order_by(Debt.is_settled.asc(), Debt.created_at.desc()).all()

@router.post("/debts", response_model=DebtResponse, status_code=status.HTTP_201_CREATED)
def create_debt(
    debt_in: DebtCreate,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Create a new debt record."""
    db_debt = Debt(
        user_id=current_user.id,
        type=debt_in.type,
        person=debt_in.person,
        amount=debt_in.amount,
        description=debt_in.description,
        due_date=debt_in.due_date,
        is_settled=False
    )
    db.add(db_debt)
    db.commit()
    db.refresh(db_debt)
    return db_debt

@router.put("/debts/{id}", response_model=DebtResponse)
def update_debt(
    id: str,
    debt_in: DebtUpdate,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Update a specific debt record (e.g., mark as settled)."""
    db_debt = db.query(Debt).filter(
        Debt.id == id, Debt.user_id == current_user.id
    ).first()
    
    if not db_debt:
        raise HTTPException(status_code=404, detail="Debt record not found")
        
    update_data = debt_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_debt, field, value)
        
    db.commit()
    db.refresh(db_debt)
    return db_debt

@router.delete("/debts/{id}", status_code=status.HTTP_200_OK)
def delete_debt(
    id: str,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Delete a debt record."""
    db_debt = db.query(Debt).filter(
        Debt.id == id, Debt.user_id == current_user.id
    ).first()
    
    if not db_debt:
        raise HTTPException(status_code=404, detail="Debt record not found")
        
    db.delete(db_debt)
    db.commit()
    return {"detail": "Debt record successfully deleted"}


# ----------------- Summary Dashboard Endpoints -----------------

@router.get("/summary", response_model=FinanceSummary)
def read_finance_summary(
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Get visual analytics report data for the current month."""
    now = datetime.now(timezone.utc)
    current_month = now.month
    current_year = now.year
    
    # 1. Total income & expenses of current month
    monthly_transactions = db.query(Transaction).filter(
        Transaction.user_id == current_user.id,
        func.extract("month", Transaction.date) == current_month,
        func.extract("year", Transaction.date) == current_year
    ).all()
    
    total_income = sum(t.amount for t in monthly_transactions if t.type == "income")
    total_expenses = sum(t.amount for t in monthly_transactions if t.type == "expense")
    net_savings = total_income - total_expenses
    
    # 2. Total Owed (Debts unsettled)
    active_debts = db.query(Debt).filter(
        Debt.user_id == current_user.id,
        Debt.is_settled == False
    ).all()
    
    total_owed_to_me = sum(d.amount for d in active_debts if d.type == "owed_to_me")
    total_owed_by_me = sum(d.amount for d in active_debts if d.type == "owed_by_me")
    
    # 3. Category Breakdown (Expenses only)
    category_totals = {}
    for t in monthly_transactions:
        if t.type == "expense":
            category_totals[t.category] = category_totals.get(t.category, 0) + t.amount
            
    breakdowns = []
    if total_expenses > 0:
        for cat, amount in category_totals.items():
            breakdowns.append(CategoryBreakdown(
                category=cat,
                total=amount,
                percentage=round((amount / total_expenses) * 100, 1)
            ))
    # Sort category breakdowns by total descending
    breakdowns.sort(key=lambda x: x.total, reverse=True)
            
    # 4. Budget Status checks
    user_budgets = db.query(Budget).filter(
        Budget.user_id == current_user.id,
        Budget.month == current_month,
        Budget.year == current_year
    ).all()
    
    budget_statuses = []
    for b in user_budgets:
        if b.category.lower() == "all":
            spent = total_expenses
        else:
            spent = sum(t.amount for t in monthly_transactions if t.type == "expense" and t.category.lower() == b.category.lower())
            
        percent = round((spent / b.limit_amount) * 100, 1) if b.limit_amount > 0 else 0
        budget_statuses.append(BudgetStatus(
            id=b.id,
            category=b.category,
            limit_amount=b.limit_amount,
            spent=spent,
            percent=percent
        ))
        
    # 5. Recent transactions
    recent = db.query(Transaction).filter(
        Transaction.user_id == current_user.id
    ).order_by(Transaction.date.desc()).limit(5).all()
    
    # 6. Cash Flow History (past 6 months)
    cash_flow_history = []
    months_list = []
    temp_month = current_month
    temp_year = current_year
    for _ in range(6):
        months_list.append((temp_month, temp_year))
        temp_month -= 1
        if temp_month == 0:
            temp_month = 12
            temp_year -= 1
            
    months_list.reverse()
    month_names_short = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    
    for m, y in months_list:
        monthly_txs = db.query(Transaction).filter(
            Transaction.user_id == current_user.id,
            func.extract("month", Transaction.date) == m,
            func.extract("year", Transaction.date) == y
        ).all()
        
        inc = sum(t.amount for t in monthly_txs if t.type == "income")
        exp = sum(t.amount for t in monthly_txs if t.type == "expense")
        cash_flow_history.append({
            "month": f"{month_names_short[m]} '{str(y)[-2:]}",
            "income": inc,
            "expenses": exp
        })
    
    return FinanceSummary(
        total_income=total_income,
        total_expenses=total_expenses,
        net_savings=net_savings,
        total_owed_to_me=total_owed_to_me,
        total_owed_by_me=total_owed_by_me,
        categories=breakdowns,
        budgets=budget_statuses,
        recent_transactions=recent,
        cash_flow_history=cash_flow_history
    )
