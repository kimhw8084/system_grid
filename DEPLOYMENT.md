# SysGrid Deployment Guide

This document outlines the procedures for moving SysGrid from local development to a production cloud environment.

## 🛡️ Forensic Lineage Compliance

SysGrid is built to forensic standards. Every critical entity has versioned history tracking:
- **Monitoring:** All status and owner changes are versioned.
- **FAR (Failure Analysis):** RPN and failure mode updates are versioned.
- **RCA (Root Cause Analysis):** Outage reports, timelines, and mitigations are versioned.

**Mandate:** Never disable the `_history` tables in production. They are required for incident auditing.

---

## ☁️ Cloud Infrastructure Requirements

### 1. Storage Validation
Before using a networked filesystem (EFS, Azure Files, etc.) for the SQLite databases, run the stress test on the target mount:
```bash
python3 stress_test_db.py /path/to/mount --workers 10 --inserts 500
```
- **Constraint:** Ensure `PRAGMA journal_mode=WAL` is supported by the storage driver.

### 2. Database Strategy
- **Small/Medium Teams:** SQLite on AWS EFS is supported (ensure WAL mode).
- **Large Teams:** Migration to PostgreSQL is recommended for high concurrency. (Schema is SQLAlchemy compatible).

---

## 🚀 Production Setup

### 1. Backend Environment (`.env`)
```env
ENVIRONMENT=production
DATABASE_URL=sqlite+aiosqlite:///data/tenant.db
CONFIG_DATABASE_URL=sqlite+aiosqlite:///data/config.db
TENANT_STORAGE_ROOT=/data/tenants
BACKEND_CORS_ORIGINS=["https://sysgrid.yourcompany.com"]
USER_ID_ENV_VAR=X-Forwarded-User  # Or your SSO header
```

### 2. Identity Resolution
SysGrid identifies users via the `X-User-Id` header. In production, configure your Load Balancer or Reverse Proxy (Nginx) to inject this header from your SSO provider.

### 3. Deployment Command
```bash
# Frontend
cd frontend && npm install && npm run build
# Serve the 'dist' folder via Nginx

# Backend
cd backend && pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

---

## 🧪 Post-Deployment Verification

After deployment, run the health check:
`GET https://api.sysgrid.yourcompany.com/api/v1/health`

Verify the bootstrap contract:
`GET https://api.sysgrid.yourcompany.com/api/v1/settings/startup-check`

---

**SysGrid** | Infrastructure Intelligence & Reliability Engine
