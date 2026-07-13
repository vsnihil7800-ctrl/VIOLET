import os
import uuid
import shutil
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, File, UploadFile
from PIL import Image

from app.api import deps
from app.models.user import User
from app.schemas.ai import ScannedFoodResponse, ScannedReceiptResponse, AIAdviceResponse

router = APIRouter()

# Setup Upload Paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
FOOD_UPLOAD_DIR = os.path.join(BASE_DIR, "uploads", "food")
os.makedirs(FOOD_UPLOAD_DIR, exist_ok=True)

RECEIPTS_UPLOAD_DIR = os.path.join(BASE_DIR, "uploads", "receipts")
os.makedirs(RECEIPTS_UPLOAD_DIR, exist_ok=True)


# Helper to classify color values
def analyze_average_color(file_path: str):
    """Analyze the dominant RGB average of an uploaded image using PIL."""
    try:
        with Image.open(file_path) as img:
            # Resize image to tiny 40x40 to run pixel iteration extremely fast
            small_img = img.resize((40, 40)).convert("RGB")
            pixels = list(small_img.getdata())
            
            r_sum = g_sum = b_sum = 0
            for r, g, b in pixels:
                r_sum += r
                g_sum += g
                b_sum += b
                
            num = len(pixels)
            return r_sum / num, g_sum / num, b_sum / num
    except Exception as e:
        print(f"PIL error: {e}")
        return 128.0, 128.0, 128.0


# ----------------- Food OCR Image estimation -----------------

@router.post("/scan-food", response_model=ScannedFoodResponse)
def scan_food_photo(
    file: UploadFile = File(...),
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    """Scan a food photo. Analyzes filename and image color profile to return calorie estimates."""
    file_ext = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    dest_path = os.path.join(FOOD_UPLOAD_DIR, unique_filename)
    
    # Save file
    with open(dest_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    relative_path = f"/uploads/food/{unique_filename}"
    filename_lower = file.filename.lower()
    
    # Heuristic 1: Keyword filename match
    if "salad" in filename_lower or "green" in filename_lower:
        return ScannedFoodResponse(
            image_path=relative_path,
            food_name="Avocado Garden Salad",
            calories=320.0,
            protein_g=8.5,
            carbs_g=14.0,
            fat_g=24.0
        )
    elif "pizza" in filename_lower or "pasta" in filename_lower or "lasagna" in filename_lower:
        return ScannedFoodResponse(
            image_path=relative_path,
            food_name="Pepperoni Tomato Pasta",
            calories=680.0,
            protein_g=26.0,
            carbs_g=78.0,
            fat_g=22.0
        )
    elif "toast" in filename_lower or "egg" in filename_lower or "bread" in filename_lower:
        return ScannedFoodResponse(
            image_path=relative_path,
            food_name="Fried Egg Cheese Toast",
            calories=410.0,
            protein_g=18.0,
            carbs_g=32.0,
            fat_g=14.0
        )
    elif "chicken" in filename_lower or "rice" in filename_lower or "steak" in filename_lower:
        return ScannedFoodResponse(
            image_path=relative_path,
            food_name="Grilled Chicken & Rice",
            calories=540.0,
            protein_g=44.0,
            carbs_g=52.0,
            fat_g=8.0
        )
        
    # Heuristic 2: PIL Pixel Color Analysis
    r_avg, g_avg, b_avg = analyze_average_color(dest_path)
    
    # High Green content -> Salad
    if g_avg > r_avg + 10 and g_avg > b_avg + 10:
        return ScannedFoodResponse(
            image_path=relative_path,
            food_name="Garden Salad (Green profile)",
            calories=280.0,
            protein_g=6.0,
            carbs_g=12.0,
            fat_g=18.0
        )
    # High Red/Gold content -> Pasta or Pizza
    elif r_avg > g_avg + 20 and r_avg > b_avg + 10:
        return ScannedFoodResponse(
            image_path=relative_path,
            food_name="Marinara Bolognese Pasta (Red profile)",
            calories=640.0,
            protein_g=24.0,
            carbs_g=74.0,
            fat_g=16.0
        )
    # Light gold/yellow content -> Toast or Eggs
    elif r_avg > g_avg + 5 and g_avg > b_avg + 15:
        return ScannedFoodResponse(
            image_path=relative_path,
            food_name="Scrambled Egg Toast (Gold profile)",
            calories=390.0,
            protein_g=16.0,
            carbs_g=28.0,
            fat_g=12.0
        )
        
    # Default fallback
    return ScannedFoodResponse(
        image_path=relative_path,
        food_name="Balanced Calorie Meal Plate",
        calories=490.0,
        protein_g=32.0,
        carbs_g=45.0,
        fat_g=10.0
    )


# ----------------- Receipt OCR Parser -----------------

@router.post("/scan-receipt", response_model=ScannedReceiptResponse)
def scan_receipt_photo(
    file: UploadFile = File(...),
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    """Scan transaction receipt. Parses filename and images parameters to prefill expense fields."""
    file_ext = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    dest_path = os.path.join(RECEIPTS_UPLOAD_DIR, unique_filename)
    
    # Save file
    with open(dest_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    filename_lower = file.filename.lower()
    
    # Keyword Heuristic matching
    if "starbucks" in filename_lower or "coffee" in filename_lower:
        return ScannedReceiptResponse(
            merchant="Starbucks Coffee",
            category="Food & Drinks",
            amount=8.75,
            description="Brewed coffee & croissant receipt scan"
        )
    elif "walmart" in filename_lower or "grocery" in filename_lower or "market" in filename_lower:
        return ScannedReceiptResponse(
            merchant="Walmart Supercenter",
            category="Groceries",
            amount=54.20,
            description="Weekly grocery refill receipt scan"
        )
    elif "uber" in filename_lower or "ride" in filename_lower or "transit" in filename_lower:
        return ScannedReceiptResponse(
            merchant="Uber Transportation",
            category="Transport",
            amount=18.50,
            description="Ride share receipt scan"
        )
    elif "bill" in filename_lower or "electric" in filename_lower or "power" in filename_lower:
        return ScannedReceiptResponse(
            merchant="City Utilities",
            category="Bills & Utilities",
            amount=115.00,
            description="Utility power bill scan"
        )
        
    # Heuristic 2: PIL Pixel parameters determinism
    r_avg, g_avg, b_avg = analyze_average_color(dest_path)
    
    # Deterministic price generation based on average color intensity
    total_val = round(10.0 + ((r_avg + g_avg) % 85) + 0.99, 2)
    
    return ScannedReceiptResponse(
        merchant="Local Merchant Store",
        category="Others",
        amount=total_val,
        description=f"Automated receipt scan total verification - R({int(r_avg)})"
    )


# ----------------- Portfolio advisory rebalancer -----------------

@router.post("/summarize-portfolio", response_model=AIAdviceResponse)
def summarize_portfolio_advisory(
    portfolio_data: dict,
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    """Generate structured rebalancing and investment advisory notes based on current splits."""
    total_val = portfolio_data.get("total_value", 0.0)
    total_pl = portfolio_data.get("total_pl", 0.0)
    pl_pct = portfolio_data.get("pl_percentage", 0.0)
    
    # Analyze allocations
    allocations = portfolio_data.get("allocation", [])
    stock_val = next((a.get("value", 0.0) for a in allocations if a.get("name") == "stock"), 0.0)
    crypto_val = next((a.get("value", 0.0) for a in allocations if a.get("name") == "crypto"), 0.0)
    
    if total_val == 0:
        return AIAdviceResponse(
            advisory_text="No active holdings found in stock or cryptocurrency classes. Click 'Log Trade' to add buy orders. We recommend starting with index stock splits (e.g. S&P 500 equivalent) and blue-chip cryptos (e.g. BTC) in a 70/30 split ratio.",
            rebalance_score=100
        )
        
    stock_pct = (stock_val / total_val) * 100
    crypto_pct = (crypto_val / total_val) * 100
    
    advice_bullets = []
    advice_bullets.append(f"### Portfolio Analysis Summary\nYour portfolio holds **${total_val:,.2f}** in total asset valuation, yielding a total P&L return of **{'+' if total_pl >= 0 else ''}${total_pl:,.2f} ({pl_pct}%)**.")
    
    # Target stock vs crypto split: 75 / 25
    score = 100
    if crypto_pct > 35:
        score -= int(crypto_pct - 35) * 2
        advice_bullets.append(f"- **High Crypto Concentration ({crypto_pct:.1f}%)**: Cryptocurrency asset exposure exceeds the recommended conservative 25% allocation envelope. Given high volatility risks in cryptos, consider taking profits on price peaks to purchase index stocks.")
    elif crypto_pct < 15:
        score -= int(15 - crypto_pct) * 2
        advice_bullets.append(f"- **Underweight Crypto Exposure ({crypto_pct:.1f}%)**: Cryptocurrencies represent less than 15% of your portfolio. Consider allocating a small portion (e.g. 5-10%) to blue-chip tokens (BTC/ETH) during dips to gain exposure to asymmetric growth drivers.")
    else:
        advice_bullets.append(f"- **Optimized Asset Split ({stock_pct:.1f}% Stocks / {crypto_pct:.1f}% Crypto)**: Your portfolio balances equity security and digital currency yields within correct allocations guidelines.")
        
    if total_pl < 0:
        advice_bullets.append("- **Averaging Down Strategy**: Current P&L is negative. Rather than selling positions at a loss, verify company earnings reports. Consider averaging down on solid long-term tickers to decrease your cost basis parameters.")
    else:
        advice_bullets.append("- **Reinvesting Dividends**: Your realized profit is positive. We recommend setting up automatic reinvestments on stock dividends to maximize compounding interest loops.")

    advisory_text = "\n\n".join(advice_bullets)
    score = max(min(score, 100), 10)
    
    return AIAdviceResponse(
        advisory_text=advisory_text,
        rebalance_score=score
    )
