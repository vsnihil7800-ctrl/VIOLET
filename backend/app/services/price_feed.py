"""
Live price feed service.
- Crypto prices via CoinGecko (free, no API key required)
- Stock prices via Finnhub (free tier, requires FINNHUB_API_KEY)

Prices are cached in-memory for CACHE_TTL_SECONDS to avoid hitting rate limits
on every page load. Falls back gracefully to a provided fallback price
(e.g. the user's average buy cost) if a live lookup fails.
"""
import time
from typing import Dict, Optional
import httpx
from app.core.config import settings

CACHE_TTL_SECONDS = 300  # 5 minutes

# In-memory cache: { ticker: (price, fetched_at_timestamp) }
_price_cache: Dict[str, tuple] = {}

# Map our internal crypto tickers to CoinGecko's ID system
CRYPTO_ID_MAP = {
    "BTC": "bitcoin",
    "ETH": "ethereum",
    "SOL": "solana",
    "ADA": "cardano",
    "DOT": "polkadot",
}

KNOWN_STOCK_TICKERS = {"AAPL", "MSFT", "TSLA", "NVDA", "AMZN", "GOOGL"}


def _get_cached(ticker: str) -> Optional[float]:
    entry = _price_cache.get(ticker)
    if entry is None:
        return None
    price, fetched_at = entry
    if time.time() - fetched_at > CACHE_TTL_SECONDS:
        return None
    return price


def _set_cache(ticker: str, price: float) -> None:
    _price_cache[ticker] = (price, time.time())


def _fetch_crypto_prices(tickers: list) -> Dict[str, float]:
    """Fetch live crypto prices from CoinGecko for a batch of tickers (in USD converted to INR isn't needed;
    CoinGecko supports 'inr' vs_currency directly)."""
    ids = [CRYPTO_ID_MAP[t] for t in tickers if t in CRYPTO_ID_MAP]
    if not ids:
        return {}
    try:
        resp = httpx.get(
            "https://api.coingecko.com/api/v3/simple/price",
            params={"ids": ",".join(ids), "vs_currencies": "inr"},
            timeout=5.0,
        )
        resp.raise_for_status()
        data = resp.json()
        result = {}
        for ticker, cg_id in CRYPTO_ID_MAP.items():
            if cg_id in data and "inr" in data[cg_id]:
                result[ticker] = float(data[cg_id]["inr"])
        return result
    except Exception:
        return {}


def _fetch_stock_price(ticker: str) -> Optional[float]:
    """Fetch a single live stock price from Finnhub. Finnhub returns USD;
    we convert to INR using a fixed approximate rate since a free forex API
    is out of scope here."""
    if not settings.FINNHUB_API_KEY:
        return None
    try:
        resp = httpx.get(
            "https://finnhub.io/api/v1/quote",
            params={"symbol": ticker, "token": settings.FINNHUB_API_KEY},
            timeout=5.0,
        )
        resp.raise_for_status()
        data = resp.json()
        usd_price = data.get("c")  # 'c' = current price
        if not usd_price or usd_price == 0:
            return None
        # Approximate USD -> INR conversion (static rate; good enough for a portfolio tracker,
        # not for financial-grade accuracy)
        USD_TO_INR = 87.0
        return round(float(usd_price) * USD_TO_INR, 2)
    except Exception:
        return None


def get_live_price(ticker: str, fallback: float) -> float:
    """
    Get the live price for a ticker, using cache first, then live API,
    then falling back to the provided fallback value (e.g. average buy cost).
    """
    ticker = ticker.upper()

    cached = _get_cached(ticker)
    if cached is not None:
        return cached

    price: Optional[float] = None

    if ticker in CRYPTO_ID_MAP:
        prices = _fetch_crypto_prices([ticker])
        price = prices.get(ticker)
    elif ticker in KNOWN_STOCK_TICKERS:
        price = _fetch_stock_price(ticker)

    if price is not None:
        _set_cache(ticker, price)
        return price

    # Live lookup failed or ticker not supported - use fallback
    return fallback


def get_live_prices_batch(tickers: list, fallbacks: Dict[str, float]) -> Dict[str, float]:
    """
    Efficiently fetch live prices for multiple tickers at once.
    Crypto tickers are batched into a single CoinGecko call.
    Stock tickers are fetched individually (Finnhub free tier has no batch endpoint).
    """
    result: Dict[str, float] = {}
    uncached_crypto = []

    for t in tickers:
        t = t.upper()
        cached = _get_cached(t)
        if cached is not None:
            result[t] = cached
        elif t in CRYPTO_ID_MAP:
            uncached_crypto.append(t)

    if uncached_crypto:
        fresh_crypto = _fetch_crypto_prices(uncached_crypto)
        for t, price in fresh_crypto.items():
            _set_cache(t, price)
            result[t] = price

    for t in tickers:
        t = t.upper()
        if t in result:
            continue
        if t in KNOWN_STOCK_TICKERS:
            price = _fetch_stock_price(t)
            if price is not None:
                _set_cache(t, price)
                result[t] = price

    # Fill in fallbacks for anything still missing
    for t in tickers:
        t = t.upper()
        if t not in result:
            result[t] = fallbacks.get(t, 100.0)

    return result
