## OUT-26 Asset Golden Proof Summary

Date: 2026-07-05

Scope completed in this run:

- Reworked the `/asset` report dossier header and metric bands to use responsive wrapping/grid behavior instead of fixed horizontal rails.
- Added canonical built-in Asset saved views:
  - `Operations Overview`
  - `Security Exposure`
  - `Hardware Inventory`
  - `Dependency Map`
  - `Purged Registry`
  - `Monitoring Coverage`
  - `Owner / Environment Review`
- Wired Asset saved-view defaults through the operational views panel so the presets are visible and first-class, not custom-only entries.

Verification performed:

- `frontend`: `npm run typecheck` passed.
- Browser checked against local app on `http://127.0.0.1:5173/asset`.
- Confirmed `/asset` grid renders live asset rows.
- Confirmed `/asset` report keeps the dossier action rail visible on desktop after the responsive layout change.
- Confirmed the Asset views menu exposes the new built-in presets.
- Confirmed `/asset` map still renders the topology surface with selection controls intact.

Notable residuals observed:

- Existing AG Grid custom-column warnings are still present in console and predate this patch set.
- The 960px-wide shell remains dense because of the global application sidebar/header footprint, but the Asset report regression addressed here is no longer clipping its primary dossier action off the viewport.
