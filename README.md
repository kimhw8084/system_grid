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

# Database Configuration (supports SQLite, PostgreSQL, etc.)
DATABASE_URL=sqlite+aiosqlite:///./system_grid.db

# CORS Configuration
BACKEND_CORS_ORIGINS=["*"]
```

### Frontend Configuration (`frontend/.env`)
Create a `.env` file in the `frontend/` directory:
```bash
# Base URL for the backend API
VITE_API_BASE_URL=http://127.0.0.1:8000
```

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
