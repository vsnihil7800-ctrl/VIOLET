# Violet AI - Deployment Checkpoint (Updated)
Last updated: July 16, 2026

## Project
Violet AI Personal Assistant - FastAPI backend + React/Vite frontend monorepo
Local path: C:\Users\vsnih\OneDrive\Desktop\CR\Projects\VIOLET
GitHub repo: https://github.com/vsnihil7800-ctrl/VIOLET (main branch)

## Status: FULLY DEPLOYED AND WORKING ✅

### Live URLs
- **Frontend**: https://violet-rho.vercel.app
- **Backend**: https://violet-production-adb5.up.railway.app
- **Backend API docs**: https://violet-production-adb5.up.railway.app/docs
- **Database**: Neon PostgreSQL (connection string stored in Railway env vars)

---

## Deployment Stack
- GitHub -> source control
- Railway -> backend (FastAPI), Root Directory set to `backend`
- Vercel -> frontend (Vite/React), Root Directory set to `frontend`
- Neon -> PostgreSQL database

## Key fixes made during deployment (for reference if similar issues recur)

1. **railway.json**: `builder` must be `"DOCKERFILE"` not `"DOCKER"`. After setting Root Directory to `backend` in Railway Settings, `dockerfilePath` should just be `"Dockerfile"` (not `"backend/Dockerfile"`) since Root Directory already scopes into backend/.

2. **Missing Pillow dependency (RECURRED AGAIN this session)**: `backend/requirements.txt` needs `Pillow>=10.0.0` (used for image/receipt OCR features in `ai.py`). This has now been accidentally dropped TWICE during requirements.txt edits - once previously, and once again this session when adding `httpx` for the live pricing feature. The second time it caused the ENTIRE backend to crash on boot (uvicorn `ModuleNotFoundError: No module named 'PIL'`), which broke login and everything else, not just the feature being added. **Always view/diff the full requirements.txt after any edit to confirm Pillow (and every other existing dependency) is still present before committing.**

3. **Auth token refresh bug**: `backend/app/api/deps.py` was returning HTTP 403 for expired/invalid JWT tokens, but the frontend's axios interceptor (`frontend/src/services/api.ts`) only auto-refreshes on 401. Fixed by changing to `status.HTTP_401_UNAUTHORIZED`. This was blocking trade submissions and other authenticated actions after ~30 min sessions.

4. **Service worker caching bug (IMPORTANT)**: `frontend/public/sw.js` originally used a cache-first strategy with a static cache name (`violet-cache-v1`), meaning updates NEVER showed up on devices that had visited before, no matter how much cache was cleared manually. Fixed by rewriting to network-first strategy (always fetch fresh, only fall back to cache when offline) and bumping cache name to `v2`. This fix means future deploys should now show up automatically without manual cache-clearing.

5. **Currency symbol**: Entire app was hardcoded to `$` (USD) instead of `Rs` (INR). Fixed across: Dashboard.tsx, Finance.tsx, Investments.tsx, and modal components (BudgetModal, TransactionModal, DebtModal, TradeModal, WatchlistModal). Also fixed in AI-generated advisor text in `backend/app/api/endpoints/ai.py` (this text is rule-based templated text, NOT a real Claude/LLM API call, despite being called "AI Advisor").

6. **Missing DELETE endpoint for investment trades (FIXED this session)**: Frontend's `Investments.tsx` already called `DELETE /investments/transactions/{id}`, but `backend/app/api/endpoints/investments.py` never defined that route - only `/watchlist/{ticker}` had a DELETE. This made the delete-trade button in the Trade Audit Log silently fail (404). Added the missing `delete_investment_transaction` endpoint, scoped to `current_user` and matching the `String` (UUID) primary key type used by `InvestmentTransaction`. Confirmed working: trades delete cleanly and portfolio totals recalculate correctly afterward.

7. **Live investment pricing (BUILT & FIXED this session - previous checkpoint claimed this was done, but it was never actually committed to the repo)**:
   - Investigated after user reported AAPL Market Price showing "₹224.5" (obviously wrong - a raw USD-looking number, not INR). Checked the repo directly and found `backend/app/services/price_feed.py` did not exist anywhere - `investments.py` only had a hardcoded `MOCK_PRICES` dict with AAPL: 224.50. There was also a `violet_inr_fix.zip` sitting untouched in the repo root, but it only contained the earlier $-to-Rs currency-symbol fix (item 5), not the live pricing feature - the live pricing code described as "confirmed working" in the previous checkpoint had apparently never made it into version control at all.
   - Built `backend/app/services/price_feed.py` from scratch: fetches live crypto prices from CoinGecko (free, no key, direct INR pricing) and live stock prices from Finnhub (free tier, needs API key, USD converted to INR at a fixed ~87 rate). In-memory cache, 5-minute TTL per ticker. Falls back silently (omits the ticker) on any fetch failure so the caller can fall back to average buy cost.
   - Modified `backend/app/api/endpoints/investments.py` to call `get_live_prices_batch()` instead of `MOCK_PRICES`.
   - Added `FINNHUB_API_KEY: str = ""` setting to `backend/app/core/config.py`.
   - Added `httpx>=0.24.0` to `backend/requirements.txt` (needed for price_feed.py's HTTP calls) - this edit is what caused the Pillow-drop crash in item 2 above.
   - Supported crypto: BTC, ETH, SOL, ADA, DOT. Supported stocks: AAPL, MSFT, TSLA, NVDA, AMZN, GOOGL.
   - Confirmed working end-to-end after the Pillow fix: AAPL showed live ₹28,492.5, MSFT showed live ₹34,419.81, BTC showed live ₹6.17M/coin - all distinct, realistic, moving slightly on cache refresh. Unsupported ticker (RELIANCE) correctly fell back to avg buy cost (₹2,900, 0% P&L) instead of crashing.
   - Confirm `FINNHUB_API_KEY` is actually set in Railway's Variables tab for the backend service - checkpoint previously claimed it was added, but given the price_feed.py file itself was missing from the repo, this env var should be re-verified too rather than assumed.

## Recurring workflow pattern learned this session
- Nihil downloads fixed files from chat, but they land in the VIOLET root folder instead of their proper subfolder. **Standard fix**: use `Move-Item -Path .\filename.ext -Destination .\correct\subfolder\path\filename.ext -Force` before `git add`. If the destination subfolder doesn't exist yet (e.g. a brand new `services/` folder), run `New-Item -ItemType Directory -Path .\correct\subfolder\path -Force` first (safe to run even if it already exists).
- Always verify with `git status` before committing to catch misplaced files.
- Always confirm `pwd` shows the VIOLET folder before running git commands (once accidentally ran from C:\Users\vsnih root, which would have tried to commit the entire Windows user profile - caught before any damage).
- Extracting downloaded zips on Windows often creates a nested subfolder - always check with `dir -Force` after extraction and flatten with Move-Item if needed.
- LF/CRLF warnings from git on Windows during `git add`/`git commit` are harmless and expected - not an error.
- The GitHub remote shows a "This repository moved... use https://github.com/vsnihil7800-ctrl/violet.git" notice on push (repo name casing changed) - also harmless, push still succeeds. Can be silenced with `git remote set-url origin https://github.com/vsnihil7800-ctrl/violet.git` if desired.
- A checkpoint file claiming a feature is "confirmed working" is not sufficient proof it was actually committed/deployed - this session found a whole feature (live pricing) that was documented as done but was never in the repo at all. Worth spot-checking the actual deployed code/repo when a described feature behaves unexpectedly.

## Investments tab feature summary
- **Log Trade**: manually record buy/sell transactions (ticker, quantity, price, date) - buy and sell both confirmed working, including full position liquidation on sell
- **Delete Trade**: NOW WORKING (was silently broken before this session - missing backend route)
- **Watchlist**: track tickers without owning them (separate from logging an actual trade - adding a ticker to Watchlist does NOT create a portfolio position)
- **Portfolio Overview**: auto-calculated from trades - total value, P&L, stock/crypto allocation - confirmed correct across multiple holdings
- **AI Advisor**: rule-based (not real LLM) portfolio analysis + rebalance score
- **Market Price**: NOW GENUINELY LIVE for supported tickers (see list above) - confirmed with real distinct prices per ticker, falls back to avg cost for unsupported tickers (confirmed with RELIANCE test), 5-minute cache confirmed (small realistic price drift on refresh, not random jumps)
- Old test trades with unrealistic placeholder prices (e.g. AAPL at Rs 28/share) were cleaned up now that delete works - use realistic current prices for any new test trades going forward

## Not yet done / possible next steps
- Could expand live pricing to more tickers
- Could add real forex conversion instead of fixed ~87 USD/INR rate
- Other app sections (Fitness, Productivity, Schedule, Assistant/Vault) haven't been feature-tested yet this session
- CORS between Vercel frontend and Railway backend - working currently, but worth knowing `backend/app/core/config.py` has a `CORS_ORIGINS` setting if that ever needs adjusting

## To resume in a new chat
Paste this whole file and describe what you want to work on next (e.g. "test the Fitness tab" or "add real forex conversion to investment pricing").
