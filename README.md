# 🌌 SYSTEM SYSGRID: THE COMMAND CENTER
**The Definitive Infrastructure Operating System (Single Source of Truth)**

## 🚀 Presidential Setup Guide

### 1. Prerequisites
- **Node.js:** v22.14.0 (Managed via `nvm`)
- **Python:** 3.12+
- **Database:** SQLite (Included)

### 2. Frontend Setup (NVM Standard)
```bash
cd frontend
nvm install
nvm use
npm install
npm run dev
```
**Troubleshooting NVM Prefix Error:**
If you see `incompatible with nvm`, run:
`nvm use --delete-prefix`
Or permanently remove the `prefix` line from your `~/.npmrc`.

### 3. Backend Setup (FastAPI)
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
export PYTHONPATH=.
uvicorn app.main:app --reload
```

## 🛠 Project Modules
- **Nexus 3D Viewer:** Immersive Three.js Digital Twin.
- **Command Vault:** High-performance AG Grid Asset Management.
- **Intelligence Engine:** Zero-Manual-Entry Bulk Import (CSV/Excel).
- **16-Table Schema:** Full Relational Infrastructure Traceability.

---
**System Electronics - Site-Wide President Level Award Project**
