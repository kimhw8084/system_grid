# OUT-13 Team Pilot Checklist

Status target: `PARTIAL`, but deploy-ready enough for a controlled 2 to 4 day pilot.

This checklist supports the temporary conclusion state of `OUT-13`. It does not mark `OUT-13` Done; the remaining gate is the copied work-domain diagnostics report.

## Start or Deploy

1. Start the backend with the intended `.env` and confirm `/api/v1/health` and `/api/v1/readiness` respond.
2. Build and serve the frontend through the intended local, company-domain dev, or production-like route.
3. Open the actual browser URL that pilot users will use.

## Open the App

1. Confirm the app loads without the bootstrap failure screen.
2. If bootstrap fails, capture the failure screen details before changing anything.
3. If an old API override is present, use `Clear Overrides & Retry`.

## Run System Diagnostics

1. Open `Settings -> System Diagnostics`.
2. Click `Run All Checks`.
3. Review the four cards:
   - `Environment Summary`
   - `Backend Reachability`
   - `External Export Contract`
   - `Transport / Preflight Risk`
4. Click `Copy Full Report`.

## PASS / PARTIAL / FAIL Meaning

- `PASS`
  The checked layer is deployment-safe for the current runtime.
- `PARTIAL`
  The layer is usable but degraded. Pilot can continue only if the degradation is understood and recorded.
- `FAIL`
  The checked layer is not deploy-safe for the current runtime. Stop and fix before broadening the pilot.

## External Export / Import Test

1. Open `External`.
2. Run the External export flow.
3. Confirm the manifest-backed export succeeds.
4. Run the import preview on the exported file.
5. Confirm the diagnostics card still reports the same runtime behavior after the export.

## First Team Users

If operator provisioning is already in use:

1. Add or verify the first pilot users in `Settings`.
2. Confirm they have the correct tenant assignment and access level.
3. Verify they can load the app without a 403 bootstrap or tenant-selection issue.

If user provisioning is not yet part of the pilot:

1. Use the seeded or known test users only.
2. Record the exact user IDs used in the pilot log.

## Bug Report Capture

For every deployment issue, collect:

1. The copied System Diagnostics report.
2. A screenshot of the failing card or bootstrap screen.
3. The app URL and exact browser origin.
4. The exact time of failure.
5. The failing layer name:
   - environment
   - backend reachability
   - external export contract
   - transport / preflight risk

## Required Screenshots or Reports

- `Settings -> System Diagnostics` after `Run All Checks`
- Bootstrap failure screen if startup fails
- External export success or failure evidence
- Browser network evidence only if needed to confirm redirect/CORS/preflight behavior

## Known Limitations

- Final company-domain proof is still pending until a real work-environment browser run is completed.
- `PARTIAL` may still appear for cross-origin preflight risk even when the External contract is otherwise safe.
- No Monitoring or Services migration is included in this iteration.
- Deployment/data durability implementation is intentionally deferred to the next dedicated goal.
