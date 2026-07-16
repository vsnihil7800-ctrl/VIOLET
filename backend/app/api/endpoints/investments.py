from datetime import datetime, timezone
from typing import Any, List, Dict
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api import deps
from app.core.database import get_db
from app.models.user import User
from app.models.investment import InvestmentTransaction, Watchlist
from app.schemas.investment import (
    InvestmentTransactionCreate,
    InvestmentTransactionResponse,
    WatchlistCreate,
    WatchlistResponse,
    Holding,
    AllocationBreakdown,
    TickerAllocation,
    InvestmentPortfolio
)

router = APIRouter()

# Mock live pricing feed for development & AI analytics
MOCK_PRICES: Dict[str, float] = {
    "AAPL": 224.50,
    "MSFT": 435.20,
    "TSLA": 254.80,
    "NVDA": 128.30,
    "AMZN": 184.60,
    "GOOGL": 178.90,
    "BTC": 64250.00,
    "ETH": 3420.50,
    "SOL": 142.80,
    "ADA": 0.38,
    "DOT": 6.20,
}

# ----------------- Transactions Endpoints -----------------

@router.get("/transactions", response_model=List[InvestmentTransactionResponse])
def read_investment_transactions(
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """List user's historic stock & cryptocurrency trades."""
    return db.query(InvestmentTransaction).filter(
        InvestmentTransaction.user_id == current_user.id
    ).order_by(InvestmentTransaction.date.desc()).all()

@router.post("/transactions", response_model=InvestmentTransactionResponse, status_code=status.HTTP_201_CREATED)
def create_investment_transaction(
    trade_in: InvestmentTransactionCreate,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Log a new stock or crypto transaction."""
    # If sell trade, verify user holds enough quantity
    if trade_in.transaction_type == "sell":
        user_trades = db.query(InvestmentTransaction).filter(
            InvestmentTransaction.user_id == current_user.id,
            InvestmentTransaction.ticker == trade_in.ticker.upper()
        ).all()
        
        owned_qty = 0.0
        for t in user_trades:
            if t.transaction_type == "buy":
                owned_qty += t.quantity
            else:
                owned_qty -= t.quantity
                
        if owned_qty < trade_in.quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient holdings to sell {trade_in.quantity} units of {trade_in.ticker.upper()}. You only hold {owned_qty} units."
            )
            
    db_trade = InvestmentTransaction(
        user_id=current_user.id,
        asset_type=trade_in.asset_type.lower(),
        ticker=trade_in.ticker.upper(),
        name=trade_in.name,
        transaction_type=trade_in.transaction_type.lower(),
        quantity=trade_in.quantity,
        price=trade_in.price,
        date=trade_in.date or datetime.now(timezone.utc)
    )
    db.add(db_trade)
    db.commit()
    db.refresh(db_trade)
    return db_trade


@router.delete("/transactions/{transaction_id}", status_code=status.HTTP_200_OK)
def delete_investment_transaction(
    transaction_id: str,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Delete a logged trade transaction. Recomputes holdings/averages on next portfolio fetch."""
    db_trade = db.query(InvestmentTransaction).filter(
        InvestmentTransaction.id == transaction_id,
        InvestmentTransaction.user_id == current_user.id
    ).first()

    if not db_trade:
        raise HTTPException(status_code=404, detail="Transaction not found")

    db.delete(db_trade)
    db.commit()
    return {"detail": f"Deleted trade record {transaction_id}"}


# ----------------- Watchlist Endpoints -----------------

@router.get("/watchlist", response_model=List[WatchlistResponse])
def read_watchlist(
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """List all assets watched by the current user."""
    return db.query(Watchlist).filter(Watchlist.user_id == current_user.id).all()

@router.post("/watchlist", response_model=WatchlistResponse, status_code=status.HTTP_201_CREATED)
def add_to_watchlist(
    watch_in: WatchlistCreate,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Add an asset to the user's watchlist."""
    existing = db.query(Watchlist).filter(
        Watchlist.user_id == current_user.id,
        Watchlist.ticker == watch_in.ticker.upper()
    ).first()
    
    if existing:
        return existing
        
    db_watch = Watchlist(
        user_id=current_user.id,
        asset_type=watch_in.asset_type.lower(),
        ticker=watch_in.ticker.upper(),
        name=watch_in.name
    )
    db.add(db_watch)
    db.commit()
    db.refresh(db_watch)
    return db_watch

@router.delete("/watchlist/{ticker}", status_code=status.HTTP_200_OK)
def remove_from_watchlist(
    ticker: str,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Remove a symbol from the watchlist."""
    db_watch = db.query(Watchlist).filter(
        Watchlist.user_id == current_user.id,
        Watchlist.ticker == ticker.upper()
    ).first()
    
    if not db_watch:
        raise HTTPException(status_code=404, detail="Watchlist item not found")
        
    db.delete(db_watch)
    db.commit()
    return {"detail": f"Unwatched {ticker.upper()}"}


# ----------------- Portfolio Analytics -----------------

@router.get("/portfolio", response_model=InvestmentPortfolio)
def read_portfolio_details(
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """Calculate average costs, holdings, and portfolio distributions."""
    trades = db.query(InvestmentTransaction).filter(
        InvestmentTransaction.user_id == current_user.id
    ).order_by(InvestmentTransaction.date.asc()).all()
    
    # Process trades chronologically to calculate average costs & quantities
    # Structure: { ticker: { qty, total_cost, name, type } }
    holdings_dict: Dict[str, Dict[str, Any]] = {}
    
    for t in trades:
        tk = t.ticker
        if tk not in holdings_dict:
            holdings_dict[tk] = {
                "qty": 0.0,
                "avg_cost": 0.0,
                "name": t.name,
                "asset_type": t.asset_type
            }
            
        h = holdings_dict[tk]
        if t.transaction_type == "buy":
            # New Average Cost = (Old Value + Trade Value) / New Quantity
            old_val = h["qty"] * h["avg_cost"]
            trade_val = t.quantity * t.price
            new_qty = h["qty"] + t.quantity
            h["avg_cost"] = (old_val + trade_val) / new_qty if new_qty > 0 else 0.0
            h["qty"] = new_qty
        else:
            # Sell trade reduces quantity, average purchase cost stays the same
            h["qty"] = max(0.0, h["qty"] - t.quantity)
            
    # Calculate valuations
    holdings_list: List[Holding] = []
    total_value = 0.0
    total_cost = 0.0
    
    type_totals: Dict[str, float] = {"stock": 0.0, "crypto": 0.0}
    ticker_totals: Dict[str, float] = {}
    
    for tk, h in holdings_dict.items():
        if h["qty"] <= 0.0:
            continue
            
        # Get live pricing feed or fallback
        current_price = MOCK_PRICES.get(tk, h["avg_cost"] if h["avg_cost"] > 0 else 100.0)
        
        current_val = h["qty"] * current_price
        cost_basis = h["qty"] * h["avg_cost"]
        
        total_pl = current_val - cost_basis
        pl_percent = (total_pl / cost_basis * 100) if cost_basis > 0 else 0.0
        
        total_value += current_val
        total_cost += cost_basis
        
        type_totals[h["asset_type"]] = type_totals.get(h["asset_type"], 0.0) + current_val
        ticker_totals[tk] = current_val
        
        holdings_list.append(Holding(
            ticker=tk,
            name=h["name"],
            asset_type=h["asset_type"],
            quantity=h["qty"],
            average_cost=round(h["avg_cost"], 4),
            current_price=round(current_price, 4),
            total_value=round(current_val, 2),
            total_pl=round(total_pl, 2),
            pl_percentage=round(pl_percent, 2)
        ))
        
    portfolio_pl = total_value - total_cost
    portfolio_pl_percent = (portfolio_pl / total_cost * 100) if total_cost > 0 else 0.0
    
    # Formulate allocations
    allocation_list: List[AllocationBreakdown] = []
    for asset_type, val in type_totals.items():
        percent = (val / total_value * 100) if total_value > 0 else 0.0
        allocation_list.append(AllocationBreakdown(
            name=asset_type,
            value=round(val, 2),
            percentage=round(percent, 1)
        ))
        
    ticker_allocation_list: List[TickerAllocation] = []
    for tk, val in ticker_totals.items():
        percent = (val / total_value * 100) if total_value > 0 else 0.0
        ticker_allocation_list.append(TickerAllocation(
            ticker=tk,
            value=round(val, 2),
            percentage=round(percent, 1)
        ))
    ticker_allocation_list.sort(key=lambda x: x.value, reverse=True)
    
    # Fetch watchlist
    watchlist_items = db.query(Watchlist).filter(Watchlist.user_id == current_user.id).all()
    
    return InvestmentPortfolio(
        total_value=round(total_value, 2),
        total_cost=round(total_cost, 2),
        total_pl=round(portfolio_pl, 2),
        pl_percentage=round(portfolio_pl_percent, 2),
        allocation=allocation_list,
        ticker_allocation=ticker_allocation_list,
        holdings=holdings_list,
        watchlist=watchlist_items
    )
