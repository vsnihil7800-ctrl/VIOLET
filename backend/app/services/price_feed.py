"""
Live price feed for the Investments tab.

- Crypto prices come from CoinGecko (free, no API key), quoted directly in INR.
- Stock prices come from Finnhub (free tier, needs FINNHUB_API_KEY), quoted in USD
  and converted to INR at a fixed approximate rate (not live forex).
- Results are cached in-memory for CACHE_TTL_SECONDS to respect free-tier rate limits.
- On any failure (network error, unsupported ticker, missing API key), a ticker is
  simply omitted from the returned dict — callers should fall back to average buy
  cost for anything missing.
"""

import time
from typing import Dict, List, Optional

import httpx

from app.core.config import settings

CACHE_TTL_SECONDS = 300  # 5 minutes

# Fixed approximate USD -> INR conversion rate. NOT live forex.
USD_TO_INR_RATE = 87.0

# CoinGecko ticker -> coin id mapping (direct INR pricing, no conversion needed)
CRYPTO_COINGECKO_IDS: Dict[str, str] = {
    "BTC": "bitcoin",
    "ETH": "ethereum",
    "SOL": "solana",
    "ADA": "cardano",
    "DOT": "polkadot",
}

# Supported stock tickers via Finnhub
SUPPORTED_STOCK_TICKERS = {"AAPL", "MSFT", "TSLA", "NVDA", "AMZN", "GOOGL"}

# In-memory cache: { ticker: (price_inr, fetched_at_epoch_seconds) }
_price_cache: Dict[str, tuple] = {}


def _get_cached(ticker: str) -> Optional[float]:
    entry = _price_cache.get(ticker)
    if not entry:
        return None
    price, fetched_at = entry
    if time.time() - fetched_at > CACHE_TTL_SECONDS:
        return None
    return price


def _set_cached(ticker: str, price: float) -> None:
    _price_cache[ticker] = (price, time.time())


def _fetch_crypto_prices(tickers: List[str]) -> Dict[str, float]:
    """Fetch INR prices for a batch of crypto tickers from CoinGecko."""
    ids_needed = {t: CRYPTO_COINGECKO_IDS[t] for t in tickers if t in CRYPTO_COINGECKO_IDS}
    if not ids_needed:
        return {}

    results: Dict[str, float] = {}
    id_to_ticker = {v: k for k, v in ids_needed.items()}
    ids_param = ",".join(ids_needed.values())

    try:
        resp = httpx.get(
            "https://api.coingecko.com/api/v3/simple/price",
            params={"ids": ids_param, "vs_currencies": "inr"},
            timeout=8.0,
        )
        resp.raise_for_status()
        data = resp.json()
        for coin_id, values in data.items():
            ticker = id_to_ticker.get(coin_id)
            price = values.get("inr")
            if ticker and price is not None:
                results[ticker] = float(price)
                _set_cached(ticker, float(price))
    except (httpx.HTTPError, ValueError, KeyError):
        # Network error, bad response, etc. -- caller falls back to avg cost.
        pass

    return results


def _fetch_stock_prices(tickers: List[str]) -> Dict[str, float]:
    """Fetch USD prices for a batch of stock tickers from Finnhub, converted to INR."""
    supported = [t for t in tickers if t in SUPPORTED_STOCK_TICKERS]
    if not supported:
        return {}

    api_key = getattr(settings, "FINNHUB_API_KEY", "")
    if not api_key:
        return {}

    results: Dict[str, float] = {}
    for ticker in supported:
        try:
            resp = httpx.get(
                "https://finnhub.io/api/v1/quote",
                params={"symbol": ticker, "token": api_key},
                timeout=8.0,
            )
            resp.raise_for_status()
            data = resp.json()
            usd_price = data.get("c")  # "current price" field
            if usd_price:
                inr_price = float(usd_price) * USD_TO_INR_RATE
                results[ticker] = inr_price
                _set_cached(ticker, inr_price)
        except (httpx.HTTPError, ValueError, KeyError):
            continue

    return results


def get_live_prices_batch(tickers: List[str]) -> Dict[str, float]:
    """
    Given a list of tickers (mixed stock/crypto), return a dict of
    {ticker: price_in_inr} for whichever ones could be resolved.
    Missing tickers should be handled by the caller (fallback to avg cost).
    """
    unique_tickers = list({t.upper() for t in tickers})

    results: Dict[str, float] = {}
    to_fetch: List[str] = []

    for t in unique_tickers:
        cached = _get_cached(t)
        if cached is not None:
            results[t] = cached
        else:
            to_fetch.append(t)

    if to_fetch:
        crypto_tickers = [t for t in to_fetch if t in CRYPTO_COINGECKO_IDS]
        stock_tickers = [t for t in to_fetch if t in SUPPORTED_STOCK_TICKERS]

        results.update(_fetch_crypto_prices(crypto_tickers))
        results.update(_fetch_stock_prices(stock_tickers))

    return results
