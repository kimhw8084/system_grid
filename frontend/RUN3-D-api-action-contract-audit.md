# RUN3-D API Action Contract Audit

## Verdict
The action contracts are partially mapped. Core CRUD operations for settings and teams are well-defined in `backend/app/api/settings.py`. However, bulk operations, specific "purge" actions, and unified revert/undo mechanisms require stricter frontend validation to prevent inconsistent UI states and backend rejection.

## Action Support Matrix

| Workspace | UI action | Frontend file | Frontend payload | Backend route/file | Backend supports? | Preconditions | Reversible? | Current guard | Failure mode | Required fix/test |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Settings | Restore Pool | Settings.tsx | `version_id` | `POST /user-pool/restore/{version_id}` | Yes | Valid `version_id` | Partial | UI toast | 404/409 | Add validation of snapshot content |
| Settings | Delete Option | Settings.tsx | `opt_id` | `DELETE /options/{opt_id}` | Yes | Not in use | No | 400 check | 400 | Ensure UI disables delete |
| Teams | Delete Team | Settings.tsx | `team_id` | `DELETE /teams/{team_id}` | Yes | No active refs | No | 400 check | 400 | Ensure UI checks refs |

## Unsupported Action Risks
- `purge`: No explicit endpoint found for purging data. Frontend must not expose this action.

## Unsafe Visible Action Risks
- Teams deletion: Visible deletion without explicit pre-check of active references may lead to 400 errors.
- Settings option deletion: Similarly, deleting used options without pre-check.

## Revert/Undo Contract
- Currently handled via snapshots (`POST /user-pool/restore/{version_id}`). The frontend relies on successful API calls, but lacks robust pre-flight checks of snapshot validity.

## Purge Contract
- **Explicitly missing.** Frontend must be prohibited from offering purge actions.

## Changed Count / No-op Contract
- Frontend `Settings.tsx` tracks `deletedCount`, but must ensure `apiFetch` results match expected modification counts to avoid "success" toast with zero changes.

## Client-Fanout vs Backend-Bulk Differences
- No direct bulk endpoints identified in the immediate scan of `settings.py`. Frontend bulk actions must be analyzed to ensure they don't naively fan out requests causing race conditions.

## Required Guards
- Disable "Delete" buttons for teams/options where active references are detected.
- Implement pre-flight validation for snapshot restores.

## Required Tests
- Test 400 handling for forbidden delete operations.
- Test 404/409 handling for snapshot restoration.

## Backend Evidence Snippets

### Restore User Pool
```python
@router.post("/user-pool/restore/{version_id}")
async def restore_user_pool(version_id: int, request: Request, db: AsyncSession = Depends(get_db)):
    user_id = get_current_user_id(request)
    res = await db.execute(select(models.UserPoolVersion).filter(models.UserPoolVersion.id == version_id))
    version = res.scalar_one_or_none()
    if not version: raise HTTPException(404, "Version not found")
```

### Delete Team
```python
@router.delete("/teams/{team_id}")
async def delete_team(team_id: int, request: Request, db: AsyncSession = Depends(get_db)):
    # ... check references ...
    if active_refs:
        raise HTTPException(status_code=400, detail=f"Cannot delete team while references still exist: {active_refs}")
    await record_team_audit(db, None, "team_deleted", user_id, {"team_id": team.id, "name": team.name})
    await db.execute(delete(models.Team).where(models.Team.id == team_id))
```

## Grep/Proof Commands Used
- `grep -rnE "/restore/" backend/app/api/settings.py`
- `grep -rnE "@router.(post|get|put|patch|delete)" backend/app/api/settings.py`
- `grep -rnE "purge|delete|archive" backend/app/api/settings.py`
