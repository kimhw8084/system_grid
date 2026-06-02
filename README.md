# 🌌 SYSGRID: THE COMMAND CENTER
**The Definitive Infrastructure Operating System (Single Source of Truth)**

## 🚀 Presidential Setup Guide

### 1. Prerequisites
- **Node.js:** v22.14.0 (Managed via `nvm`)
- **Python:** 3.12+
- **Database:** SQLite (Included)

### 2. Backend Setup (FastAPI)
```bash
cd backend
# 1. CRITICAL: If you are upgrading from an older version, wipe the old DB
rm -f system_grid.db 

# 2. Setup Venv
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 3. Run Production API
export PYTHONPATH=.
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

### 3. Frontend Setup (NVM Standard)
```bash
cd frontend
nvm use --delete-prefix
npm install
npm run dev
```

## ⚙ï¸ Configuration & Environment

SYSGRID uses a rigid environment-based configuration system to ensure portability across any deployment scenario.

### Backend Configuration (`backend/.env`)
Create a `.env` file in the `backend/` directory:
```bash
# API Configuration
PROJECT_NAME="SYSGRID Production API"
API_V1_STR="/api/v1"
ENVIRONMENT="production"
PORT=8000

# Primary tenant database (default local behavior shown here)
DATABASE_URL=sqlite+aiosqlite:///./system_grid.db

# Master config registry database
CONFIG_DATABASE_URL=sqlite+aiosqlite:///./config.db

# Root folder for tenant-local SQLite databases and backups
TENANT_STORAGE_ROOT="/absolute/path/to/tenant-storage"

# Optional explicit env file discovery for admin analysis UI
BACKEND_ENV_FILE_PATH="/absolute/path/to/backend/.env"
FRONTEND_ENV_FILE_PATH="/absolute/path/to/frontend/.env"

# Bootstrap identity and admin policy
DEFAULT_USER_ID="admin_root"
AUTO_ADMIN_USER_IDS="admin_root,platform_admin"
DEFAULT_TENANT_NAME="Default Engine"
DEFAULT_EMAIL_DOMAIN="sysgrid.local"

# Company/package defaults used during first-run seed
DEFAULT_ORG_NAME="Global Infrastructure Corp"
DEFAULT_SITE_ID="HQ-01"
DEFAULT_APP_NAME="SYSGRID ENGINE"
DEFAULT_UI_TITLE="SYSGRID Tactical"
DEFAULT_SUPPORT_EMAIL="admin@infra.local"

# CORS Configuration
BACKEND_CORS_ORIGINS=["*"]
```

### Frontend Configuration (`frontend/.env`)
Create a `.env` file in the `frontend/` directory:
```bash
# Base URL for the backend API
VITE_API_BASE_URL=http://127.0.0.1:8000
```

## Portable Deployment Notes

- With no extra env vars, the current local setup still works exactly as before.
- To relocate the package for another company or environment, change env vars rather than code.
- The admin Settings view can now inspect resolved deployment paths and can attach tenants by either filesystem path or direct database URL.
- Deploy-time settings such as `DATABASE_URL`, `CONFIG_DATABASE_URL`, `TENANT_STORAGE_ROOT`, and admin bootstrap IDs are intentionally not mutable through runtime global settings. They should be managed by environment/bootstrap configuration.

## ðŸ›  Testing Protocol
The application includes a rigorous backend test suite to verify schema integrity and API reliability.
```bash
cd backend
source venv/bin/activate
export PYTHONPATH=.
pytest test_main.py -v -s
```

---
**Site-Wide President Level Award Project**
