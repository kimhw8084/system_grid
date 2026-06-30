# OUT-13 Deployment Risk Register

Only narrow deploy-breaking or pilot-breaking risks are tracked here.

## Open Risks

| ID | Severity | Risk | Current Status | Current Mitigation | Next Action |
| --- | --- | --- | --- | --- | --- |
| DR-01 | P0 | Real company-domain runtime proof is still missing. Local and source-level hardening cannot prove final proxy/OAuth behavior. | Open | System Diagnostics and External Export Contract doctor are now ready for real runtime capture. | Run the diagnostics from the actual work-domain browser session and attach the copied report. |
| DR-02 | P1 | Cross-origin requests may still trigger OPTIONS preflight because SysGrid sends `X-User-Id` and `X-Tenant-Id` to the configured API base. | Open | Diagnostics now classify this as `Transport / Preflight Risk`. | Prefer same-origin company routing or confirm OPTIONS and custom-header allowance in proxy/CORS policy. |
| DR-03 | P1 | A hosted frontend can still fail if someone leaves an old loopback API override in local storage. | Mitigated | Runtime now fails fast with a clear frontend-origin mismatch error and the bootstrap screen supports clearing overrides. | Verify once in the real work browser. |
| DR-04 | P1 | Proxy or auth layers may still rewrite API JSON routes to HTML or OAuth pages. | Mitigated | JSON client helpers and diagnostics now report redirect/login HTML as a distinct failure mode. | Capture the real company-domain behavior. |
| DR-05 | P1 | A stale frontend bundle may be served after a backend refresh. | Mitigated | Diagnostics now compare frontend bundle version to backend frontend-version hint when available. | Confirm versions match after the first real deployment. |
| DR-06 | P1 | Frontend build chunk size remains large and may affect slower environments. | Open | Build currently succeeds; no emergency refactor was done in this iteration. | Keep under observation during the pilot; address separately if runtime load pain is confirmed. |

## Audit Notes

### Reviewed

- hardcoded `localhost` and `127.0.0.1` assumptions in runtime config and diagnostics
- hardcoded absolute API URL patterns in the client
- bodyless `GET` and `HEAD` `Content-Type` behavior
- cross-origin custom header use
- credentials behavior
- redirect handling for JSON endpoints
- Content-Disposition and expose-header assumptions for External export

### Fixed In This Iteration

- invalid API base URL now fails fast
- hosted-frontend to loopback-backend mismatch now fails fast
- JSON client surfaces redirect/login HTML as a clear runtime error
- readiness endpoint added
- startup-check now carries deployment-safe version and contract hints
- diagnostics now report wildcard expose-header failure

### Explicitly Deferred

- removing custom identity headers from cross-origin requests globally
- broader fetch-client refactors outside the shared API client
- Monitoring and Services contract migration
