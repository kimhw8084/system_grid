# SysGrid Deployment Readiness Guide

This document is the current `OUT-13` deployment-readiness baseline for a 2 to 4 day team pilot.

Status: `PARTIAL`

Reason:

- Local and source-level deployment hardening is in place.
- Runtime diagnostics, readiness, and External export contract checks are now deploy-focused.
- `startup-check` is now sanitized for team-pilot safety and does not return raw DB URLs, file paths, tenant DB URLs, or sensitive identity values.
- Final company-domain proof is still blocked on a real work-environment browser run.

Temporary conclusion stance:

- `OUT-13` is ready for work-domain verification.
- `OUT-13` is temporarily concluded for transition into the next dedicated deployment/data-durability goal.
- `OUT-13` is not Done until the copied work-domain diagnostics report is reviewed.

## Deployment Environment Matrix

| Mode | Frontend Origin | API Base URL | Auth / Proxy Behavior | CORS Requirement | Cookies / Credentials | Diagnostics Expectation | External Export Expectation |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Local direct | `http://localhost:<frontend-port>` or same-origin local host | Explicit backend origin such as `http://localhost:8000`, or blank when local proxy is intentionally used | No company OAuth expected. Direct browser-to-backend or local dev proxy. | Required only when frontend and backend are on different local origins. | Same-origin requests use `same-origin`; cross-origin local requests use `include`. | Environment Summary should show local direct or same-origin runtime. Backend Reachability and External Export should be `PASS` or targeted `PARTIAL`. | Manifest, CSV, and preview should pass. Preflight risk may be `PARTIAL` if custom identity headers cross origins. |
| Company-domain dev | Company-routed dev URL or forwarded company URL | Company-routed backend origin or same-origin company proxy path | Browser may cross proxy, SSO, OAuth, and header-rewriting layers. Redirects to login are deployment failures for API JSON routes. | Exact frontend origin must be allowed when runtime is cross-origin. Same-origin proxy mode is preferred. | Same-origin stays `same-origin`; cross-origin company routing uses `include`. | Startup diagnostics should show company-ready origin alignment. Any OAuth redirect, backend JSON mismatch, or loopback API base is a `FAIL`. | `PASS` is ideal. `PARTIAL` is acceptable only for unreadable custom headers with valid manifest fallback. |
| Production-like | Official deployed company frontend route | Official backend route or official same-origin company routing | Full company routing, SSO, and proxy policy should already match expected production behavior. | Must be explicit and stable. Wildcard expose-header behavior is not acceptable. | Must preserve authenticated browser session behavior without exposing secrets. | Environment, backend, and transport cards should be clean. Any stale bundle mismatch or routing drift should surface before pilot expansion. | External manifest-backed export/import round-trip should pass from actual browser runtime. |

## Runtime Validation Rules

SysGrid now treats the following as explicit runtime checks:

- missing API base URL
  Allowed only when the deployment is intentionally same-origin or relative-proxy based.
- invalid API base URL
  Fails fast when the configured base is neither blank, root-relative, nor an `http/https` origin.
- frontend origin mismatch
  Fails when a hosted/company frontend still points at `localhost` or `127.0.0.1`.
- backend unreachable
  Reported through `/api/v1/readiness` and `/api/v1/settings/startup-check`.
- manifest endpoint unreachable
  Reported through the External Export Contract diagnostics card.
- redirect or OAuth response where backend JSON was expected
  Reported by startup diagnostics, readiness checks, and JSON client helpers.
- wildcard expose headers on app-generated direct response
  Reported as a transport failure.
- stale frontend bundle risk if detectable
  Reported when the frontend bundle version differs from the backend’s frontend-version hint.

## Deploy Commands

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run build
```

Serve `frontend/dist/` through the intended company route or local static hosting layer.

## Required Safe Endpoints

- `GET /api/v1/health`
- `GET /api/v1/readiness`
- `GET /api/v1/settings/startup-check`
- `GET /api/v1/import/snapshot/external_entities/manifest`

`/api/v1/readiness` now reports only safe facts:

- app alive
- API prefix and version
- import/export contract availability
- External schema version
- server timestamp
- sanitized environment mode
- frontend build version hint when detectable

`/api/v1/settings/startup-check` now reports only sanitized deployment facts:

- API prefix
- request origin and request base origin
- whether the request origin is allowed by CORS
- configured CORS origin count
- whether `VITE_API_BASE_URL` is configured
- whether `VITE_API_BASE_URL` incorrectly includes `/api/v1`
- sanitized configured API origin
- whether the default user is still the fallback
- whether the identity env value is present
- whether a selected tenant is present
- accessible tenant count
- frontend build version hint
- import/export contract summary
- warning list

## Team-Pilot Operator Flow

1. Open the deployed app in the target browser.
2. Go to `Settings -> System Diagnostics`.
3. Click `Run All Checks`.
4. Review:
   - `Environment Summary`
   - `Backend Reachability`
   - `External Export Contract`
   - `Transport / Preflight Risk`
5. Click `Copy Full Report` and attach the output to the pilot run log.

## Known Readiness Limits

- Startup diagnostics are now safe for a team pilot, but OUT-13 remains `PARTIAL` until a copied work-domain diagnostics report is attached.
- Real company-domain proof is not yet attached.
- Cross-origin company deployments may still show `PARTIAL` transport risk when custom identity headers force preflight.
- Large frontend bundle warnings still exist at build time, but they are not currently blocking the pilot.

## Related Pilot Docs

- [OUT-13 team pilot checklist](docs/OUT-13-team-pilot-checklist.md)
- [OUT-13 rollback and recovery](docs/OUT-13-rollback-plan.md)
- [OUT-13 deployment risk register](docs/OUT-13-deployment-risk-register.md)
- [OUT-13 temporary conclusion handoff](docs/OUT-13-temporary-conclusion-handoff.md)
- [OUT-13 final review manifest](docs/OUT-13-final-review-manifest.md)


## Production Safety Gate

A production process now refuses startup when the identity, CORS, host, database, tenant-storage, public-readonly, or auto-admin contract is unsafe. Copy and customize:

- `deploy/backend.env.production.example`
- `deploy/frontend.env.production.example`

The reverse proxy must strip any incoming client copy of `TRUSTED_PROXY_USER_HEADER`, authenticate the request, and inject the verified identity header. The frontend must use `VITE_IDENTITY_MODE=trusted_proxy`, which prevents the browser from sending `X-User-Id`.

Run the source-level gate from the repository root:

```bash
python scripts/production-preflight.py
```

The preflight intentionally reports missing lockfiles as deployment blockers. It does not replace the full Playwright suite, a company-domain browser run, or the backup/restore drill.
