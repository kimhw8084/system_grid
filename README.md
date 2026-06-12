# SysGrid: Infrastructure Intelligence & Reliability Engine

SysGrid is a high-fidelity, multi-tenant platform for tracking physical/virtual assets, managing network topology, and ensuring system reliability through forensic-grade RCA and Failure Analysis (FAR).

---

## 🚀 Fast Track (Local Development)

The fastest way to get a fully populated environment (500+ items) is the **Disposable Local Bootstrap**.

### 1. Prerequisites (Once per machine)
```bash
# Setup Backend
cd backend && python3 -m venv venv
./venv/bin/pip install -r requirements.txt

# Setup Frontend
cd ../frontend && npm install
```

### 2. Start & Seed
Run this one command to clear old data, create fresh databases, and seed a production-scale dataset:
```bash
./scripts/start-local.sh --seed-data
```
*   **UI:** `http://localhost:5173`
*   **Admin User:** `haewon.kim` (Auto-verified)
*   **Data:** 150+ devices, 60 racks, 200+ project tasks, 30 active monitors.

---

## ☁️ Cloud Deployment & S3 Validation

SysGrid is designed for cloud environments. It uses a **Master Config DB** to route users to their specific **Tenant Databases**.

### 🛠️ Storage Stress Test
Before deploying to a mounted S3/network folder, validate your storage driver's concurrency safety:
```bash
python3 stress_test_db.py /path/to/your/s3/mount --workers 10 --inserts 500
```
If this script passes with "Integrity Check: OK", your environment is safe for SysGrid's SQLite-based architecture.

---

## 🏗️ Architecture

SysGrid uses a "Double-DB" strategy for maximum isolation and scalability:

1.  **`config.db` (The Brain):** Stores tenant registry, user access grants, and public UI settings.
2.  **`tenant_xxx.db` (The Muscle):** Stores all business data (Assets, FAR, RCA) for a specific team.

### How Connection Works
1.  Frontend calls `/api/v1/settings/bootstrap` (No auth required).
2.  Backend identifies the user (via `X-User-Id` or env var) and checks `config.db`.
3.  Backend dynamically mounts the correct Tenant DB and serves the data.

---

## 🛡️ Engineering Standards

*   **Golden Pattern:** All UI cards use `rounded-lg` (8px) and a two-column SplitView.
*   **Directive [06]:** All procedural access (BKMs) requires an "Operational Guidance" briefing modal.
*   **Forensic Lineage:** Reverting a record creates a new version labeled "Cloned from [Version]"; we never overwrite history.
*   **Deterministic Persistence:** No auto-save. Explicit "Synchronize" or "Commit" actions are required for logic/settings.

---

## 🧪 Testing & Quality Control

### Backend (Pytest)
```bash
cd backend && ./venv/bin/python -m pytest
```

### Frontend (Production Build)
Always run a build check before committing frontend changes:
```bash
cd frontend && npm run build
```

### Manual Preflight
Validate your environment variables and CORS settings:
```bash
./scripts/preflight.py
```

---

## 🆘 Troubleshooting

### "Connection Failure" on Startup
1.  Check if `VITE_API_BASE_URL` in `frontend/.env` matches your backend origin.
2.  Ensure your frontend origin is in `BACKEND_CORS_ORIGINS` (backend `.env`).
3.  Click **"Clear Overrides & Retry"** on the error screen to wipe stale browser settings.

### 403 Forbidden / No Tenant
This means your `USER_ID` is recognized, but hasn't been granted access to a tenant in `config.db`.
*   **Fix:** Use `./seed.py` to register your user to the local-demo tenant.

---

**SysGrid** | Built for Infrastructure Engineers who value precision over guesswork.
