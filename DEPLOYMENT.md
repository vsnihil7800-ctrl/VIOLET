# Violet AI Personal Assistant - Deployment & Running Guide

This guide details how to run the **Violet** monorepo application locally (in development and Docker sandboxes) and deploy it to production platforms (GitHub, Neon, Railway, and Vercel).

---

## 💻 Part 1: Local Development

You can run the application locally using SQLite (development default) or Docker Compose (PostgreSQL).

### Option A: Automated PowerShell Launcher (Recommended)
We have created a helper setup script to automate virtual environments, package installations, tests, and server spin-ups.
1. Open PowerShell in the root project folder.
2. Run the script:
   ```powershell
   .\setup.ps1
   ```
3. Choose **Option 1** from the interactive menu to boot both backend (`http://localhost:8000`) and frontend (`http://localhost:5173`) concurrently.

### Option B: Manual Command Execution
If you prefer running services manually in separate terminals:

#### Terminal 1: FastAPI Backend
```bash
cd backend
# Create venv if needed: python -m venv venv
# Windows:
.\venv\Scripts\activate
# macOS/Linux: source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

#### Terminal 2: Vite React Frontend
```bash
cd frontend
npm install
npm run dev
```

---

## 🐳 Part 2: Local Docker Sandbox (PostgreSQL)

To run the entire stack locally in a containerized environment backed by PostgreSQL:
1. Ensure Docker Desktop is active.
2. In the root directory, run:
   ```bash
   docker-compose up --build
   ```
3. Open your browser to `http://localhost`. The frontend reverse proxy redirects all calls to the backend container automatically.

---

## 🚀 Part 3: Production Deployment Guide

Follow these steps to deploy Violet to production.

### Step 1: Push to GitHub
Create a new repository named `violet` on your [GitHub](https://github.com) account, then link and push:
```bash
# Initialize and stage files
git add .
git commit -m "feat: production deployment preparation"
git branch -M main

# Link remote origin (replace with your repository url)
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/violet.git

# Push to main
git push -u origin main
```
*Note: Pushing will trigger your GitHub Actions verification pipeline (`.github/workflows/ci.yml`).*

### Step 2: Spin Up Neon PostgreSQL
1. Log in to the [Neon Console](https://console.neon.tech).
2. Create a new project and select the **PostgreSQL** version.
3. Copy the **Connection String** from the landing dashboard (choose the Pyformat URL scheme). Example:
   `postgres://user:password@host.us-east-2.aws.neon.tech/neondb?sslmode=require`

### Step 3: Deploy Backend on Railway
1. Log in to [Railway](https://railway.app).
2. Click **New Project** > **Deploy from GitHub repo** and select `violet`.
3. Railway will build your service using `backend/Dockerfile` and the context folder specified in `railway.json`.
4. Go to the **Variables** tab of the service and add:
   - `DATABASE_URL` = `[Your Neon Connection String]`
   - `JWT_SECRET_KEY` = `[Generate a secure 32-character string]`
   - `JWT_REFRESH_SECRET_KEY` = `[Generate another secure 32-character string]`
   - `ACCESS_TOKEN_EXPIRE_MINUTES` = `30`
   - `REFRESH_TOKEN_EXPIRE_DAYS` = `7`
5. Go to the **Settings** tab and generate a domain. Copy this URL (e.g. `https://violet-production.up.railway.app`).

### Step 4: Deploy Frontend on Vercel
1. Log in to [Vercel](https://vercel.com).
2. Click **Add New** > **Project** and import your `violet` repository.
3. Edit the project settings:
   - **Root Directory**: `frontend`
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Add the following **Environment Variable**:
   - `VITE_API_URL` = `https://violet-production.up.railway.app/api/v1` *(Point to your deployed Railway backend URL)*
5. Click **Deploy**. Vercel will build the React bundle and configure Single Page App (SPA) routes via `vercel.json`.

---

## 🔑 Environment Variables Reference Card

### Backend (`backend/.env`)
| Variable Name | Description | Default / Example Value |
| :--- | :--- | :--- |
| `PROJECT_NAME` | Name of the web application service. | `Violet AI Personal Assistant` |
| `DATABASE_URL` | SQLAlchemy connection string. | `postgresql://user:pass@host:5432/db` |
| `JWT_SECRET_KEY` | Hex token signing encryption key. | `violet-local-development-secret-key-32-bytes` |
| `JWT_REFRESH_SECRET_KEY` | Hex refresh signing encryption key. | `violet-local-development-refresh-secret-key-32-bytes` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Lifetime of an access token. | `30` |
| `REFRESH_TOKEN_EXPIRE_DAYS` | Lifetime of a refresh token. | `7` |

### Frontend (`frontend/.env`)
| Variable Name | Description | Default / Example Value |
| :--- | :--- | :--- |
| `VITE_API_URL` | Base API target URL. | `http://localhost:8000/api/v1` |
