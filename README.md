# SYSGRID

SysGrid is designed to run in different environments without code changes.  
The frontend should never need a hardcoded database path. It only needs a reachable backend API origin.  
The backend then resolves the selected tenant database from `config.db`.

## How It Connects

Frontend API resolution order:

1. `localStorage.SYSGRID_OVERRIDE_API_URL`
2. `localStorage.SYSGRID_CONFIG_VITE_API_BASE_URL`
3. `VITE_API_BASE_URL`
4. relative same-origin requests

Important:

- `VITE_API_BASE_URL` must be the backend origin only.
- Use `http://host:8000` or `https://api.company.com`
- Do not include `/api/v1`

If your company environment serves frontend and backend from different origins, you must set:

- frontend: `VITE_API_BASE_URL`
- backend: `BACKEND_CORS_ORIGINS`

If the app still points to an old backend, clear:

- `localStorage.SYSGRID_OVERRIDE_API_URL`
- `localStorage.SYSGRID_CONFIG_VITE_API_BASE_URL`

The app already exposes a recovery path on the bootstrap failure screen:

- `Clear Overrides & Retry`
- `Manually Configure API URL`

## Fastest Local Start

Use the disposable local bootstrap script:

```bash
./scripts/start-local.sh
```

What it does:

- deletes the previous disposable local data set
- recreates a fresh local config DB and local tenant DB
- reseeds only the dummy local tenant
- points the frontend at the local backend
- starts both backend and frontend

What it does not do:

- it does not create a venv
- it does not run `npm install`
- it assumes your dependencies are already installed

Disposable local files:

- `backend/config.local.db`
- `backend/system_grid.local.db`
- `backend/tenants/local-demo/local_demo.db`

This is intentionally separate from:

- `backend/config.db`
- any real team tenant DB

So the local bootstrap path is safe to reset repeatedly.

Prerequisite once per machine:

```bash
cd backend
python3 -m venv venv
venv/bin/pip install -r requirements.txt

cd ../frontend
npm install
```

## Local Preflight

Validate your current env contract:

```bash
./scripts/preflight.py
```

This checks:

- `VITE_API_BASE_URL`
- `BACKEND_CORS_ORIGINS`
- common malformed values like including `/api/v1`
- whether your current local frontend origin is allowed by backend CORS

## Manual Backend Setup

Create `backend/.env`:

```env
PROJECT_NAME="SYSGRID Production API"
API_V1_STR="/api/v1"
ENVIRONMENT=development
PORT=8000

BACKEND_CORS_ORIGINS=["http://127.0.0.1:5173","http://localhost:5173"]

DATABASE_URL=sqlite+aiosqlite:///./system_grid.db
CONFIG_DATABASE_URL=sqlite+aiosqlite:///./config.db
TENANT_STORAGE_ROOT="/absolute/path/to/backend/tenants"

DEFAULT_TENANT_NAME="Primary Tenant"
DEFAULT_USER_ID="haewon.kim"
AUTO_ADMIN_USER_IDS="haewon.kim"
DEFAULT_EMAIL_DOMAIN="sysgrid.local"
DEFAULT_UI_TITLE="SYSGRID Tactical"
```

Notes:

- `BACKEND_CORS_ORIGINS` must be a JSON array string.
- If frontend is hosted at `https://sysgrid.company.com`, add that exact origin.
- If backend is behind a company gateway, use the public frontend origin there, not localhost.

Install and run:

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python seed.py --tenant-name "Primary Tenant" --tenant-db "tenants/primary_tenant.db" --admin-user "haewon.kim" --admin-full-name "Haewon Kim"
venv/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

What `seed.py` does:

- creates or updates `config.db`
- creates the tenant database
- runs tenant migrations
- registers the tenant in `config.db`
- grants tenant access to the admin user

Interactive provisioning is also supported:

```bash
cd backend
venv/bin/python seed.py --interactive
```

## Manual Frontend Setup

Create `frontend/.env`:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
VITE_PORT=5173
VITE_BACKEND_PORT=8000
VITE_BACKEND_HOST=127.0.0.1
```

For company deployment:

```env
VITE_API_BASE_URL=https://api.sysgrid.company.com
```

Install and run:

```bash
cd frontend
npm install
npm run dev
```

## Standard Local Start

Terminal 1:

```bash
cd backend
source venv/bin/activate
venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Terminal 2:

```bash
cd frontend
npm run dev -- --host 127.0.0.1 --port 5173
```

Then open:

```text
http://127.0.0.1:5173
```

If you use the disposable local bootstrap script, it already handles this flow for you.

## Company / Separate-Origin Start

Example:

- frontend: `https://sysgrid.company.com`
- backend: `https://api.sysgrid.company.com`

Frontend `frontend/.env`:

```env
VITE_API_BASE_URL=https://api.sysgrid.company.com
```

Backend `backend/.env`:

```env
BACKEND_CORS_ORIGINS=["https://sysgrid.company.com"]
```

## VS Code Dev Mode On Your Company Machine

If you are running:

- backend on `127.0.0.1:8000`
- frontend on `127.0.0.1:5173`

then use exactly:

`frontend/.env.local`

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
VITE_PORT=5173
VITE_BACKEND_PORT=8000
VITE_BACKEND_HOST=127.0.0.1
```

`backend/.env`

```env
BACKEND_CORS_ORIGINS=["http://127.0.0.1:5173","http://localhost:5173"]
PORT=8000
```

Then start:

```bash
cd backend
source venv/bin/activate
venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

```bash
cd frontend
npm run dev -- --host 127.0.0.1 --port 5173
```

If the browser still shows `Connection Failure`:

1. click `Clear Overrides & Retry`
2. or manually remove:

```js
localStorage.removeItem('SYSGRID_OVERRIDE_API_URL')
localStorage.removeItem('SYSGRID_CONFIG_VITE_API_BASE_URL')
```

3. reload the app

If you have multiple approved frontend origins:

```env
BACKEND_CORS_ORIGINS=["https://sysgrid.company.com","https://sysgrid-staging.company.com"]
```

## Why It Can Fail In Company Environments

The most common causes are:

1. `VITE_API_BASE_URL` is blank while frontend/backend are on different origins.
2. `BACKEND_CORS_ORIGINS` does not include the real frontend origin.
3. Browser local storage still contains an old `SYSGRID_OVERRIDE_API_URL`.
4. Someone entered a backend URL including `/api/v1` instead of just the origin.
5. The selected user has no tenant access in `config.db`.

## Fast Recovery Checklist

1. Confirm backend health:

```bash
curl -i http://127.0.0.1:8000/api/v1/health
```

2. Confirm frontend env:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

3. Confirm backend CORS:

```env
BACKEND_CORS_ORIGINS=["http://127.0.0.1:5173"]
```

4. Clear stale browser overrides:

```js
localStorage.removeItem('SYSGRID_OVERRIDE_API_URL')
localStorage.removeItem('SYSGRID_CONFIG_VITE_API_BASE_URL')
```

5. Reload the app.

## Databases

Runtime model:

- `config.db`: tenant registry and user-to-tenant access
- tenant DB: business data for that tenant

Disposable local builder model:

- `config.local.db`: throwaway local registry
- `local_demo.db`: throwaway seeded local tenant

Recommended workflow:

1. use `./scripts/start-local.sh` for disposable builder work
2. when ready for a real team environment, provision a real tenant with `seed.py`
3. point production frontend/backend env to the real config/tenant databases
4. do not reuse the disposable local DBs for production

That means you usually do not need to “unlink” the dummy DB at all.  
You simply stop using the disposable local config and tenant files.

## Startup Diagnostics

Admin-only backend startup diagnostics:

```text
GET /api/v1/settings/startup-check
```

It reports:

- resolved frontend env API origin
- request origin
- backend CORS configuration
- selected runtime storage/config paths
- warnings for common startup mistakes

The frontend does not point to a database directly.  
It points to the backend API.  
The backend selects the tenant DB from `config.db`.

## Tests

Backend:

```bash
cd backend
source venv/bin/activate
pytest -q
```

Frontend build:

```bash
cd frontend
npm run build
```

Playwright:

```bash
cd frontend
PW_API_BASE=http://127.0.0.1:8000/api/v1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:5173 npx playwright test
```

## One Exact Rule

If SysGrid is being served from anywhere other than the same origin as the backend, set both:

- `frontend/.env -> VITE_API_BASE_URL`
- `backend/.env -> BACKEND_CORS_ORIGINS`

That is the startup contract.
