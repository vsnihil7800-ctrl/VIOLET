# Violet AI - Deployment Checkpoint (Updated)
Last updated: July 16, 2026 (Productivity tab session added)

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

6. **Missing DELETE endpoint for investment trades (FIXED)**: Frontend's `Investments.tsx` already called `DELETE /investments/transactions/{id}`, but `backend/app/api/endpoints/investments.py` never defined that route - only `/watchlist/{ticker}` had a DELETE. This made the delete-trade button in the Trade Audit Log silently fail (404). Added the missing `delete_investment_transaction` endpoint, scoped to `current_user` and matching the `String` (UUID) primary key type used by `InvestmentTransaction`. Confirmed working: trades delete cleanly and portfolio totals recalculate correctly afterward.

7. **Live investment pricing (BUILT & FIXED - previous checkpoint claimed this was done, but it was never actually committed to the repo)**:
   - Investigated after user reported AAPL Market Price showing "₹224.5" (obviously wrong - a raw USD-looking number, not INR). Checked the repo directly and found `backend/app/services/price_feed.py` did not exist anywhere - `investments.py` only had a hardcoded `MOCK_PRICES` dict with AAPL: 224.50. There was also a `violet_inr_fix.zip` sitting untouched in the repo root, but it only contained the earlier $-to-Rs currency-symbol fix (item 5), not the live pricing feature - the live pricing code described as "confirmed working" in the previous checkpoint had apparently never made it into version control at all.
   - Built `backend/app/services/price_feed.py` from scratch: fetches live crypto prices from CoinGecko (free, no key, direct INR pricing) and live stock prices from Finnhub (free tier, needs API key, USD converted to INR at a fixed ~87 rate). In-memory cache, 5-minute TTL per ticker. Falls back silently (omits the ticker) on any fetch failure so the caller can fall back to average buy cost.
   - Modified `backend/app/api/endpoints/investments.py` to call `get_live_prices_batch()` instead of `MOCK_PRICES`.
   - Added `FINNHUB_API_KEY: str = ""` setting to `backend/app/core/config.py`.
   - Added `httpx>=0.24.0` to `backend/requirements.txt` (needed for price_feed.py's HTTP calls) - this edit is what caused the Pillow-drop crash in item 2 above.
   - Supported crypto: BTC, ETH, SOL, ADA, DOT. Supported stocks: AAPL, MSFT, TSLA, NVDA, AMZN, GOOGL.
   - Confirmed working end-to-end after the Pillow fix: AAPL showed live ₹28,492.5, MSFT showed live ₹34,419.81, BTC showed live ₹6.17M/coin - all distinct, realistic, moving slightly on cache refresh. Unsupported ticker (RELIANCE) correctly fell back to avg buy cost (₹2,900, 0% P&L) instead of crashing.
   - Confirm `FINNHUB_API_KEY` is actually set in Railway's Variables tab for the backend service - checkpoint previously claimed it was added, but given the price_feed.py file itself was missing from the repo, this env var should be re-verified too rather than assumed.

8. **Daily calorie history bar chart (BUILT, PUSHED, AND CONFIRMED WORKING this session)**:
   - Added `GET /fitness/meals/calories-history?days=7` to `backend/app/api/endpoints/fitness.py`, returning per-day total calories for the last N days (zero-filled for days with no logged meals, so the chart never has gaps). New `DailyCalories` schema added to `backend/app/schemas/fitness.py`.
   - Added a "Past Day Calories" toggle button to the Meals tab in `frontend/src/pages/Fitness.tsx` that fetches the 7-day history and renders an SVG bar chart (same visual style as the existing weight trend chart) - hover shows exact kcal per day, today's bar is highlighted.
   - Committed and pushed to `main` (commits `5ef5ee8` -> `6721ed8`, with a follow-up commit removing a stray `violet-updated.zip` that got swept into the first commit by `git add -A` and adding it to `.gitignore`).
   - Railway and Vercel auto-redeployed off the push; user confirmed the bar chart renders correctly on the live Vercel URL.

9. **Productivity tab - todo creation 500 crash (FIXED)**:
   - `backend/app/api/endpoints/productivity.py` `create_todo` did `todo_in.priority.lower()` with no null check. If `priority` ever arrived blank/`None` from the frontend, this threw `AttributeError` and the whole create request failed with a 500 - meaning the todo was never saved, so the checklist looked "blank" even though the user had submitted something.
   - Fixed by defaulting to `"medium"`: `priority=(todo_in.priority or "medium").lower()`.
   - Confirmed working: todos now save and appear in the list correctly.

10. **Productivity tab - missing coding streak delete (FIXED, backend + frontend)**:
   - Backend had `GET /productivity/streaks` and `POST /productivity/streaks` but no `DELETE` route at all - same pattern as the earlier missing investment-trade delete route (item 6).
   - Added `DELETE /productivity/streaks/{id}` to `backend/app/api/endpoints/productivity.py`, scoped to `current_user`, matching the todo/note delete pattern.
   - Frontend's `frontend/src/pages/Productivity.tsx` Coding Log History table also had no delete button/Actions column at all (not just a failed call - the UI never had one). Added a `deleteStreakMutation`, `handleDeleteStreak` handler (with confirm prompt, matching the note-delete pattern), and an Actions column with a trash icon to the table.
   - After pushing the frontend change, the new bundle didn't show up immediately in a regular (non-incognito) browser window even though the Vercel build succeeded - worked instantly in incognito. Resolved by clearing site data / unregistering the old service worker in the regular browser. Likely cause: the browser had already installed the old service worker before the network-first fix (item 4) took effect, so it took a manual clear to pick up the new one this one time.
   - Confirmed working end-to-end: delete button now appears in Coding Log History and successfully deletes entries.

## Fitness & Nutrition tab - test session results (this session)
Full manual pass through Meals, Workouts, and Weights sub-tabs on the live deployed app. **All core flows confirmed working:**
- **Meals**: manual meal logging (name, calories, protein/carbs/fat) works; daily calorie/protein totals track correctly against targets (3,000 kcal / 110g protein); delete meal entry works; new "Past Day Calories" bar chart (item 8 above) renders correctly.
- **Workouts**: logging a workout works, appears correctly in workout history, delete works.
- **Weights**: logging body weight (kg) works, shows correctly in the trend chart/history.
- User reported everything above as working with no bugs flagged (no empty-tab issues, no macro math mismatches, no ₹/$ mixups, no broken delete buttons).

**Not explicitly confirmed this pass:** the AI photo-scan meal feature (upload a food photo -> auto-filled meal form) was flagged as the most likely spot for issues (ties into the Pillow/PIL dependency from item 2) but a specific pass/fail result for it wasn't reported back - worth confirming directly in a future session if it hasn't been tried yet, since it's the one Fitness feature that depends on the OCR pipeline rather than plain CRUD.

## Recurring workflow pattern learned
- Nihil downloads fixed files from chat, but they land in the VIOLET root folder instead of their proper subfolder. **Standard fix**: use `Move-Item -Path .\filename.ext -Destination .\correct\subfolder\path\filename.ext -Force` before `git add`. If the destination subfolder doesn't exist yet (e.g. a brand new `services/` folder), run `New-Item -ItemType Directory -Path .\correct\subfolder\path -Force` first (safe to run even if it already exists).
- Always verify with `git status` before committing to catch misplaced files.
- Always confirm `pwd` shows the VIOLET folder before running git commands (once accidentally ran from C:\Users\vsnih root, which would have tried to commit the entire Windows user profile - caught before any damage).
- Extracting downloaded zips on Windows often creates a nested subfolder - always check with `dir -Force` after extraction and flatten with Move-Item if needed.
- **NEW this session**: `git add -A` will also stage stray downloaded zips/files sitting in the repo root if you forget to delete them first (this happened with `violet-updated.zip`, a full-project zip that got committed alongside 3 intended file changes and had to be removed in a follow-up commit). Always run `git status` and read the full file list *before* committing, not just after - don't assume `git add -A` only picked up what you meant to change.
- LF/CRLF warnings from git on Windows during `git add`/`git commit` are harmless and expected - not an error.
- The GitHub remote shows a "This repository moved... use https://github.com/vsnihil7800-ctrl/VIOLET.git" notice on every push (repo name casing changed) - also harmless, push still succeeds. Can be silenced with `git remote set-url origin https://github.com/vsnihil7800-ctrl/violet.git` if desired (not yet done as of this checkpoint).
- `git pull --rebase origin main` (pull, not push) is the correct command to sync before pushing when the local repo might be behind - easy to mistype/mix up with `git push --rebase` (which isn't a valid push flag and just prints push's usage/help text instead of erroring clearly).
- A checkpoint file claiming a feature is "confirmed working" is not sufficient proof it was actually committed/deployed - a previous session found a whole feature (live pricing) that was documented as done but was never in the repo at all. Worth spot-checking the actual deployed code/repo when a described feature behaves unexpectedly.

## Investments tab feature summary
- **Log Trade**: manually record buy/sell transactions (ticker, quantity, price, date) - buy and sell both confirmed working, including full position liquidation on sell
- **Delete Trade**: working (was silently broken before - missing backend route, now fixed)
- **Watchlist**: track tickers without owning them (separate from logging an actual trade - adding a ticker to Watchlist does NOT create a portfolio position)
- **Portfolio Overview**: auto-calculated from trades - total value, P&L, stock/crypto allocation - confirmed correct across multiple holdings
- **AI Advisor**: rule-based (not real LLM) portfolio analysis + rebalance score
- **Market Price**: genuinely live for supported tickers (see list above) - confirmed with real distinct prices per ticker, falls back to avg cost for unsupported tickers (confirmed with RELIANCE test), 5-minute cache confirmed (small realistic price drift on refresh, not random jumps)
- Old test trades with unrealistic placeholder prices (e.g. AAPL at Rs 28/share) were cleaned up now that delete works - use realistic current prices for any new test trades going forward

## Fitness tab feature summary
- **Log Meal**: manual entry (food name, calories, protein/carbs/fat) - confirmed working, daily totals track correctly against targets
- **AI Calorie Scanner**: photo upload -> auto-filled meal form - implemented, depends on Pillow; not explicitly re-confirmed this session, worth a direct test next time
- **Past Day Calories**: NEW - 7-day bar chart of daily calorie totals, toggleable from the Meals tab - confirmed working on live deploy
- **Log Workout**: exercise type, duration, calories burned - confirmed working, appears in history, delete confirmed working
- **Gym Streak**: shown on Dashboard, calculated from consecutive workout-logged days - not explicitly re-verified against this session's workout test, worth confirming it ticked up correctly
- **Log Weight**: body weight (kg) entries - confirmed working, shows correctly in trend chart/history

## Productivity tab feature summary
- **To-Do Checklist**: create, toggle complete/incomplete, edit, delete - all confirmed working. Creation previously could 500-crash silently on blank priority (item 9, fixed) - now defaults to medium.
- **Stickies Board**: create, edit (title/content/color), pin, delete - confirmed working. Pinned notes correctly sort to the top regardless of last-updated time.
- **Coding Log History**: logging minutes/commits works and correctly aggregates same-day entries; delete was entirely missing (no backend route, no frontend button) - now added end-to-end (item 10).
- **Workspace Summary widget** (Coding Streak / Pending Todos / Total Notes cards + Task Records panel): confirmed accurate - pending count, top todos, notes count, and pinned-first note ordering all match underlying data.
- Not yet explicitly tested: All/Active/Completed filter tabs on the Task Records panel (frontend-only filter, not yet verified to filter correctly).

## Not yet done / possible next steps
- Confirm the AI photo-scan meal feature end-to-end (upload a real food photo, check it returns sensible calorie/macro data rather than garbage)
- Confirm Gym Streak counter increments correctly after this session's workout-logging test
- Could expand live pricing to more tickers
- Could add real forex conversion instead of fixed ~87 USD/INR rate
- Productivity tab now feature-tested (see summary above); still need to verify the All/Active/Completed todo filter tabs actually filter correctly
- Other app sections (Schedule, Assistant/Vault) haven't been feature-tested yet
- CORS between Vercel frontend and Railway backend - working currently, but worth knowing `backend/app/core/config.py` has a `CORS_ORIGINS` setting if that ever needs adjusting
- Consider running `git remote set-url origin https://github.com/vsnihil7800-ctrl/violet.git` to silence the repo-moved notice on every push (cosmetic only, not urgent)

## To resume in a new chat
Paste this whole file and describe what you want to work on next (e.g. "test the AI photo-scan meal feature" or "add real forex conversion to investment pricing").
