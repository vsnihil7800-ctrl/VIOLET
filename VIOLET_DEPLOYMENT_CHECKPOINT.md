# Violet AI - Deployment Checkpoint (Updated)
Last updated: July 17, 2026 (Schedule tab + Fitness goals session added)

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

2. **Missing Pillow dependency (RECURRED TWICE)**: `backend/requirements.txt` needs `Pillow>=10.0.0` (used for image/receipt OCR features in `ai.py`). Dropped accidentally twice during requirements.txt edits, the second time crashing the entire backend on boot (`ModuleNotFoundError: No module named 'PIL'`), breaking login and everything else. **Always view/diff the full requirements.txt after any edit to confirm Pillow (and every other existing dependency) is still present before committing.**

3. **Auth token refresh bug**: `backend/app/api/deps.py` was returning HTTP 403 for expired/invalid JWT tokens, but the frontend's axios interceptor (`frontend/src/services/api.ts`) only auto-refreshes on 401. Fixed by changing to `status.HTTP_401_UNAUTHORIZED`. This was blocking trade submissions and other authenticated actions after ~30 min sessions.

4. **Service worker caching bug (IMPORTANT)**: `frontend/public/sw.js` originally used a cache-first strategy with a static cache name (`violet-cache-v1`), meaning updates NEVER showed up on devices that had visited before, no matter how much cache was cleared manually. Fixed by rewriting to network-first strategy (always fetch fresh, only fall back to cache when offline) and bumping cache name to `v2`. Future deploys generally show up automatically now, though one edge case still needed a manual cache clear (see item 10).

5. **Currency symbol**: Entire app was hardcoded to `$` (USD) instead of `₹` (INR). Fixed across: Dashboard.tsx, Finance.tsx, Investments.tsx, and modal components (BudgetModal, TransactionModal, DebtModal, TradeModal, WatchlistModal). Also fixed in AI-generated advisor text in `backend/app/api/endpoints/ai.py` (this text is rule-based templated text, NOT a real Claude/LLM API call, despite being called "AI Advisor").

6. **Missing DELETE endpoint for investment trades (FIXED)**: `backend/app/api/endpoints/investments.py` never defined `DELETE /investments/transactions/{id}` even though the frontend called it, causing a silent 404. Added the missing endpoint, scoped to `current_user`. Confirmed working.

7. **Live investment pricing (BUILT & FIXED)**: Built `backend/app/services/price_feed.py` from scratch - live crypto prices from CoinGecko (direct INR), live stock prices from Finnhub (USD converted to INR at a fixed ~87 rate), in-memory 5-minute cache per ticker, silent fallback to avg buy cost on fetch failure. Supported crypto: BTC, ETH, SOL, ADA, DOT. Supported stocks: AAPL, MSFT, TSLA, NVDA, AMZN, GOOGL. Confirmed working end-to-end with real distinct live prices per ticker.

8. **Daily calorie history bar chart (BUILT & CONFIRMED WORKING)**: Added `GET /fitness/meals/calories-history?days=7` (zero-filled per day) and a "Past Day Calories" toggle on the Fitness Meals tab rendering an SVG bar chart. Confirmed working on live deploy.

9. **Productivity tab - todo creation 500 crash (FIXED)**: `create_todo` crashed on blank/null `priority` (`AttributeError` on `.lower()`). Fixed by defaulting to `"medium"`.

10. **Productivity tab - missing coding streak delete (FIXED, backend + frontend)**: No DELETE route existed for coding streaks, and the frontend table had no delete button at all. Added both. One-off: after pushing, the new bundle didn't show in a regular browser window until the old service worker was manually cleared (likely a leftover pre-item-4-fix worker) - worked instantly in incognito.

11. **Schedule Dashboard widget - IST timezone bug (FIXED this session)**: `backend/app/api/endpoints/schedule.py`'s `/summary` endpoint computed "today" using raw UTC (`datetime.now(timezone.utc).strftime("%Y-%m-%d")`), so any event created before ~5:30 AM IST (India is UTC+5:30) fell on the *previous* UTC calendar day and was silently excluded from the Dashboard's "Today's Planners" widget, even though it displayed correctly on the Schedule page itself (which isn't date-filtered). Fixed by computing an explicit IST day-boundary range (`start_of_day_utc` / `end_of_day_utc`, offset by `timedelta(hours=5, minutes=30)`) and filtering `start_time` against that range instead of comparing raw date strings. Confirmed working after fix - events now appear correctly in the Dashboard widget.
    - Note: the Dashboard's "Today's Planners" widget only counts **Calendar Events**, not **Reminders/Alarms** - these are two separate features on the Schedule page (events have start/end time + color tag; reminders are a single title + alert time). Reminders show separately via the "Alarms scheduled: N active" line. This is expected/correct behavior, not a bug - confirmed with user via a live example ("Meeting" reminder correctly did NOT show in Today's Planners, correctly did show in the Alarms count).

12. **Schedule - missing Edit functionality (FIXED this session, backend + frontend)**: Backend only had GET/POST/DELETE for both `/schedule/events` and `/schedule/reminders` - no PUT/edit route existed at all, and the frontend had no edit UI either. Added:
    - `CalendarEventUpdate` / `ReminderUpdate` Pydantic schemas (all fields optional, partial update via `exclude_unset`)
    - `PUT /schedule/events/{id}` and `PUT /schedule/reminders/{id}` endpoints, scoped to `current_user`, with the same end-after-start validation as create
    - Frontend (`Schedule.tsx`): reused the existing create modal/form for events (now branches between create/update based on an `editingEventId` state, dynamic header/button text "Edit Calendar Event" / "Save Changes"), added a Pencil edit button next to the existing Trash delete button in the events table. Reminders got the same treatment inline in the "Set Reminder Alert" form (pencil button on each reminder card pre-fills the form and switches it to update mode, with a Cancel option to exit edit mode).
    - Pushed as part of commit `daafed8` ("fix: schedule timezone bug, add event/reminder editing, add editable fitness goals backend"). Confirmed working live: edit buttons now present and functional for both events and reminders.

13. **Editable fitness goals - BACKEND ONLY, frontend UI NOT YET BUILT**: Calorie target (`2200.0`) and protein target (`130` in the Dashboard's progress bar divisor) were hardcoded rather than user-configurable, and didn't match Nihil's actual targets (3,000 kcal / 110g protein). Rather than just hardcoding the correct numbers again, built proper per-user editable goals:
    - Added `target_calories` (default 3000.0) and `target_protein` (default 110.0) `Float` columns to `backend/app/models/user.py`
    - New Alembic migration `1c99cc1d94fd_add_fitness_goals_to_user.py` (down_revision chained off the existing `584e466f3f55_initial_schema_setup`), adds both columns with `server_default` so existing rows backfill automatically
    - `UserUpdate` schema (`backend/app/schemas/user.py`) now accepts optional `target_calories` / `target_protein`; `UserResponse` now returns them
    - `PUT /users/me` (`backend/app/api/endpoints/users.py`) now saves these fields when provided
    - `backend/app/api/endpoints/fitness.py`'s `/summary` now returns `current_user.target_calories` / `current_user.target_protein` instead of hardcoded values; `FitnessSummary` schema (`backend/app/schemas/fitness.py`) gained a `target_protein` field
    - **NOT YET DONE**: no UI exists yet for the user to actually type in and save their own goals - Dashboard.tsx's protein bar still needs to be pointed at `fitnessSummary?.target_protein` instead of a hardcoded divisor, and a settings form (likely on Profile or Fitness page) needs to be built to call `PUT /users/me` with the new values. This is the immediate next step if resuming fitness work.

## Fitness photo-scan feature - important caveat (discovered this session)
The Meals tab's camera/scan feature (`POST /ai/scan-food` in `backend/app/api/endpoints/ai.py`) is **not real AI food recognition**. It's a placeholder/mock: it first checks the uploaded **filename** for keywords (`pizza`, `egg`, `chicken`, `salad`, etc.), and if nothing matches, falls back to guessing a food label purely from the photo's **average pixel color** (e.g. golden/tan tones -> "Scrambled Egg Toast", greenish -> "Salad"). Confirmed with a real-world test: a chapathi photo (tan/golden color) was misidentified as "Scrambled Egg Toast" because of this color-bucket fallback, not a bug - it's working exactly as (minimally) implemented. Manual meal logging is accurate and unaffected. Building real food recognition (e.g. a proper vision API call) would be a genuine feature build, not a quick fix - not started.

## Recurring workflow pattern learned
- Nihil downloads fixed files from chat as a zip; extracting it creates a **nested duplicate folder** (e.g. `violet_schedule_fix\violet_schedule_fix\...`) rather than dropping files directly - always run `Get-ChildItem -Recurse` on the extracted folder first to see the real path before writing `Move-Item` commands, then move each file individually into its correct project subfolder with `-Force`, and delete the leftover zip + extracted folder afterward.
- Always verify with `git status` before committing to catch misplaced or stray files.
- Always confirm the terminal prompt shows the VIOLET root folder before running `git` commands - `git commands only work from the root`; running `cd backend` while *already inside* `backend` throws `PathNotFound`, a good sanity-check tell that you're already in the right place.
- `alembic` is not installed/runnable locally on Nihil's machine (Python/pip not set up outside Docker) - this is fine, since **Railway's Docker container runs `alembic upgrade head` automatically on every boot** (confirmed in deployment logs previously), so any new migration just needs to be committed and pushed, not run manually.
- `git add -A` will also stage stray downloaded zips/files sitting in the repo root if you forget to delete them first - always read the full `git status` file list before committing.
- LF/CRLF warnings from git on Windows during `git add`/`git commit` are harmless and expected - not an error.
- The GitHub remote shows a "This repository moved..." notice on every push (repo name casing changed) - harmless, push still succeeds.
- A checkpoint file claiming a feature is "confirmed working" is not sufficient proof it was actually committed/deployed - always worth spot-checking the actual repo/deployed code when something behaves unexpectedly.

## Investments tab feature summary
- **Log Trade**: manually record buy/sell transactions - confirmed working, including full position liquidation on sell
- **Delete Trade**: working (fixed - was missing backend route)
- **Watchlist**: track tickers without owning them - separate from an actual trade
- **Portfolio Overview**: auto-calculated from trades - confirmed correct across multiple holdings
- **AI Advisor**: rule-based (not real LLM) portfolio analysis + rebalance score
- **Market Price**: genuinely live for supported tickers (BTC, ETH, SOL, ADA, DOT, AAPL, MSFT, TSLA, NVDA, AMZN, GOOGL), falls back to avg cost for unsupported tickers, 5-minute cache confirmed

## Fitness tab feature summary
- **Log Meal**: manual entry - confirmed working, daily totals track correctly against targets
- **AI Calorie Scanner**: photo upload -> auto-filled meal form - **confirmed this session to be a placeholder/mock (filename keyword + average-color guess, not real food recognition)** - see caveat section above. Not a bug, just a known limitation.
- **Past Day Calories**: 7-day bar chart of daily calorie totals - confirmed working on live deploy
- **Log Workout**: confirmed working, appears in history, delete confirmed working
- **Gym Streak**: shown on Dashboard - not explicitly re-verified this session
- **Log Weight**: confirmed working, shows correctly in trend chart/history
- **Calorie/Protein Goals**: backend now supports per-user editable targets (item 13 above), defaulting to 3,000 kcal / 110g protein - **frontend settings UI to actually edit them is not built yet**

## Schedule tab feature summary (first full test pass this session)
- **Calendar Events**: create works; **Edit now works** (fixed this session, item 12); delete works; correctly distinct from Reminders
- **Reminders/Alarms**: create works; **Edit now works** (fixed this session, item 12); delete works
- **Dashboard "Today's Planners" widget**: **now correctly shows today's events in IST** (fixed this session, item 11) - previously silently broken for any event created before ~5:30 AM IST
- **Dashboard "Alarms scheduled: N active" line**: confirmed correctly counts unsent reminders, separately from calendar events
- Documents sub-feature (upload/list/delete) mentioned in the backend (`/schedule/documents`) - not yet feature-tested this session

## Productivity tab feature summary
- **To-Do Checklist**: create, toggle complete/incomplete, edit, delete - all confirmed working. Priority-blank 500 crash fixed (item 9).
- **Stickies Board**: create, edit, pin, delete - confirmed working, pinned notes sort to top correctly.
- **Coding Log History**: logging works, delete now added end-to-end (item 10).
- **Workspace Summary widget**: confirmed accurate.
- Not yet explicitly tested: All/Active/Completed filter tabs on the Task Records panel.

## Not yet done / possible next steps
- **Build the Fitness goals settings UI** (immediate next step - backend is ready, see item 13): a form (Profile page or Fitness page) to edit target_calories/target_protein via `PUT /users/me`, plus point Dashboard.tsx's protein bar at `fitnessSummary?.target_protein` instead of its old hardcoded divisor
- Confirm Gym Streak counter increments correctly after a workout-logging test
- Could expand live pricing to more tickers; could add real forex conversion instead of fixed ~87 USD/INR rate
- Verify the All/Active/Completed todo filter tabs actually filter correctly (Productivity tab)
- Feature-test the Schedule Documents sub-feature (upload/list/delete)
- Vault and Assistant (AI command center) tabs still haven't been feature-tested at all
- Consider real food-photo recognition to replace the current filename/color-guess placeholder scanner (not started, genuine feature build)
- CORS between Vercel frontend and Railway backend - working currently, `backend/app/core/config.py` has `CORS_ORIGINS` if it ever needs adjusting
- Consider `git remote set-url origin https://github.com/vsnihil7800-ctrl/violet.git` to silence the repo-moved notice on every push (cosmetic only)

## To resume in a new chat
Paste this whole file and describe what you want to work on next (e.g. "build the fitness goals settings UI" or "test the Vault tab").
