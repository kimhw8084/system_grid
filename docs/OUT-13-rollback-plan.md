# OUT-13 Rollback And Recovery Plan

Use this only if the pilot deployment is failing and the issue cannot be corrected safely in place.

This document supports the temporary conclusion state of `OUT-13`. It is a pilot-safety artifact, not proof that work-domain verification is complete.

## Stop the App

1. Stop the frontend static host or revert its active build directory.
2. Stop the backend process or remove it from the active service slot.

## Capture Diagnostics Before Rollback

1. Open `Settings -> System Diagnostics` if the app is still reachable.
2. Click `Run All Checks`.
3. Click `Copy Full Report`.
4. Capture a screenshot of the failing card or bootstrap screen.

If the app does not load:

1. Capture the bootstrap failure screen.
2. Record the failing URL and current frontend origin.

## Revert To Previous Build Or Zip

1. Restore the previously known-good frontend build or zip artifact.
2. Restore the previously known-good backend deployment artifact.
3. Restart the reverted backend.
4. Repoint the frontend host or company route to the reverted build.

## Preserve Before Cleanup

Keep these files or artifacts before replacing anything:

- copied System Diagnostics report
- bootstrap failure screenshot if present
- backend process logs
- reverse proxy or company-routing logs if available
- current frontend build identifier or zip name
- current backend artifact identifier or zip name

## Report The Failure Layer

Classify the rollback cause as one of:

- environment summary
- backend reachability
- external export contract
- transport / preflight risk
- bootstrap failure

Include the exact failing layer label from the UI or report in the rollback note.
