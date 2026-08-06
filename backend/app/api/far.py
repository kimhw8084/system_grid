from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import JSONResponse, StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..database import get_db
from ..models import models
from ..schemas import schemas
from ..services import far_exchange, far_service

router = APIRouter(prefix="/far", tags=["FAR"])


def _legacy_mutation_response(replacement: str) -> JSONResponse:
    """Fail closed: legacy destructive routes remain discoverable but never mutate."""
    return JSONResponse(
        status_code=status.HTTP_428_PRECONDITION_REQUIRED,
        content={
            "detail": {
                "code": "FAR_LEGACY_DESTRUCTIVE_ROUTE_DISABLED",
                "message": "This route no longer mutates FAR records. Use a server-authoritative preview and execute flow.",
                "replacement": replacement,
            }
        },
        headers={"Deprecation": "true", "Sunset": "never-write"},
    )
    

# --- FAILURE MODES: STATIC COLLECTION ROUTES ---

@router.get("/modes", response_model=list[schemas.FarFailureModeResponse])
async def get_failure_modes(
    request: Request,
    system: str | None = Query(default=None, max_length=200),
    include_retired: bool = Query(default=False),
    db: AsyncSession = Depends(get_db),
):
    far_service.tenant_identity(request)
    return await far_service.list_modes(db, system=system, include_retired=include_retired)
    
    
@router.post("/modes", response_model=schemas.FarFailureModeResponse, status_code=status.HTTP_201_CREATED)
async def create_failure_mode(
    data: schemas.FarFailureModeCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    return await far_service.create_mode(db, request, data)

    
@router.post("/modes/retirement/preview", response_model=schemas.FarOperationPreviewResponse)
async def preview_failure_mode_retirement(
    data: schemas.FarRetirementPreviewRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    return await far_service.preview_retirement(db, request, data)


@router.post("/modes/retirement/execute", response_model=schemas.FarMutationResult)
async def execute_failure_mode_retirement(
    data: schemas.FarOperationExecuteRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    return await far_service.execute_retirement(db, request, data)

    
@router.post("/modes/bulk-delete")
async def deprecated_bulk_delete_failure_modes(request: Request, db: AsyncSession = Depends(get_db)):
    far_service.require_role(request, {"ADMIN"})
    return _legacy_mutation_response("POST /api/v1/far/modes/retirement/preview then /execute")


# --- FAILURE MODES: ITEM ROUTES ---

@router.get("/modes/{mode_id}", response_model=schemas.FarFailureModeResponse)
async def get_failure_mode(
    mode_id: int,
    request: Request,
    include_retired: bool = Query(default=False),
    include_retired_nested: bool = Query(default=False),
    db: AsyncSession = Depends(get_db),
):
    far_service.tenant_identity(request)
    mode = await far_service.get_mode(db, mode_id, include_retired=include_retired)
    return far_service.serialize_mode(mode, include_retired_nested=include_retired_nested)


@router.get("/modes/{mode_id}/history", response_model=list[schemas.FarEntityHistoryResponse])
async def get_failure_mode_history(
    mode_id: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    far_service.tenant_identity(request)
    await far_service.get_mode(db, mode_id, include_retired=True)
    return await far_service.mode_history(db, mode_id)


@router.put("/modes/{mode_id}", response_model=schemas.FarFailureModeResponse)
async def update_failure_mode(
    mode_id: int,
    data: schemas.FarFailureModeUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    return await far_service.update_mode(db, request, mode_id, data)
    
    
@router.post("/modes/{mode_id}/restore", response_model=schemas.FarMutationResult)
async def restore_failure_mode(
    mode_id: int,
    data: schemas.FarRestoreRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    return await far_service.restore_mode(db, request, mode_id, data)
    
            
@router.post("/modes/{mode_id}/history/restore", response_model=schemas.FarMutationResult)
async def restore_failure_mode_history(
    mode_id: int,
    data: schemas.FarHistoryRestoreRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    return await far_service.restore_history(db, request, mode_id, data)
            

@router.delete("/modes/{mode_id}")
async def deprecated_delete_failure_mode(mode_id: int, request: Request, db: AsyncSession = Depends(get_db)):
    far_service.require_role(request, {"ADMIN"})
    await far_service.get_mode(db, mode_id, include_retired=True)
    return _legacy_mutation_response("POST /api/v1/far/modes/retirement/preview then /execute")
    

# --- NESTED ENTITIES ---
    
@router.get("/causes", response_model=list[schemas.FarFailureCauseResponse])
async def get_causes(
    request: Request,
    include_retired: bool = Query(default=False),
    db: AsyncSession = Depends(get_db),
):
    far_service.tenant_identity(request)
    stmt = select(models.FarFailureCause).options(
        selectinload(models.FarFailureCause.resolutions).selectinload(models.FarResolution.knowledge_bkm),
        selectinload(models.FarFailureCause.mitigations),
        selectinload(models.FarFailureCause.prevention_actions),
    )
    if not include_retired:
        stmt = stmt.where(models.FarFailureCause.is_retired == False)
    result = await db.execute(stmt.order_by(models.FarFailureCause.id.asc()))
    return [far_service.serialize_cause(item, include_retired_nested=include_retired) for item in result.unique().scalars().all()]


@router.post("/causes", response_model=schemas.FarFailureCauseResponse, status_code=status.HTTP_201_CREATED)
async def create_cause(data: schemas.FarCauseCreate, request: Request, db: AsyncSession = Depends(get_db)):
    return await far_service.create_cause(db, request, data)


@router.put("/causes/{cause_id}", response_model=schemas.FarFailureCauseResponse)
async def update_cause(
    cause_id: int,
    data: schemas.FarCauseUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    return await far_service.update_cause(db, request, cause_id, data)


@router.post("/mitigations", response_model=schemas.FarMitigationResponse, status_code=status.HTTP_201_CREATED)
async def create_mitigation(data: schemas.FarMitigationCreate, request: Request, db: AsyncSession = Depends(get_db)):
    return await far_service.create_mitigation(db, request, data)


@router.post("/prevention", response_model=schemas.FarPreventionResponse, status_code=status.HTTP_201_CREATED)
async def create_prevention(data: schemas.FarPreventionCreate, request: Request, db: AsyncSession = Depends(get_db)):
    return await far_service.create_prevention(db, request, data)


@router.post("/prevention/projects", status_code=status.HTTP_201_CREATED)
async def create_prevention_project(
    data: schemas.FarPreventionProjectCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    return await far_service.create_prevention_project(db, request, data)


@router.post("/resolutions", response_model=schemas.FarResolutionResponse, status_code=status.HTTP_201_CREATED)
async def create_resolution(data: schemas.FarResolutionCreate, request: Request, db: AsyncSession = Depends(get_db)):
    return await far_service.create_resolution(db, request, data)


@router.post("/nested/retirement/execute", response_model=schemas.FarMutationResult)
async def execute_nested_retirement(
    data: schemas.FarOperationExecuteRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    return await far_service.execute_nested_retirement(db, request, data)


@router.get("/{entity_type}/{entity_id}/history", response_model=list[schemas.FarEntityHistoryResponse])
async def get_nested_entity_history(
    entity_type: Literal["cause", "mitigation", "prevention", "resolution"],
    entity_id: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    far_service.tenant_identity(request)
    return await far_service.nested_entity_history(db, entity_type, entity_id)


@router.post("/{entity_type}/{entity_id}/retirement/preview", response_model=schemas.FarOperationPreviewResponse)
async def preview_nested_entity_retirement(
    entity_type: Literal["cause", "mitigation", "prevention", "resolution"],
    entity_id: int,
    data: schemas.FarNestedRetireRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    return await far_service.preview_nested_retirement(
        db,
        request,
        entity_type=entity_type,
        entity_id=entity_id,
        data=data,
    )
    
        
@router.post("/{entity_type}/{entity_id}/restore", response_model=schemas.FarMutationResult)
async def restore_nested_entity(
    entity_type: Literal["cause", "mitigation", "prevention", "resolution"],
    entity_id: int,
    data: schemas.FarRestoreRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    return await far_service.restore_nested_entity(
        db,
        request,
        entity_type=entity_type,
        entity_id=entity_id,
        data=data,
    )
    

@router.post("/{entity_type}/{entity_id}/history/restore", response_model=schemas.FarMutationResult)
async def restore_nested_entity_history(
    entity_type: Literal["cause", "mitigation", "prevention", "resolution"],
    entity_id: int,
    data: schemas.FarHistoryRestoreRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    return await far_service.restore_nested_history(
        db,
        request,
        entity_type=entity_type,
        entity_id=entity_id,
        data=data,
    )


@router.post("/{entity_type}/{entity_id}/retire")
async def deprecated_direct_nested_retire(
    entity_type: Literal["cause", "mitigation", "prevention", "resolution"],
    entity_id: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    far_service.require_role(request, {"ADMIN"})
    await far_service.get_nested_entity(db, entity_type, entity_id, include_retired=True)
    return _legacy_mutation_response(
        f"POST /api/v1/far/{entity_type}/{entity_id}/retirement/preview then /api/v1/far/nested/retirement/execute"
    )


# Historical DELETE routes remain non-mutating and guide callers to retirement.
@router.delete("/causes/{cause_id}")
async def deprecated_delete_cause(cause_id: int, request: Request, db: AsyncSession = Depends(get_db)):
    far_service.require_role(request, {"ADMIN"})
    if await db.get(models.FarFailureCause, cause_id) is None:
        raise HTTPException(status_code=404, detail={"code": "FAR_NESTED_NOT_FOUND", "entity_type": "cause"})
    return _legacy_mutation_response(f"POST /api/v1/far/cause/{cause_id}/retirement/preview then /api/v1/far/nested/retirement/execute")


@router.delete("/mitigations/{mitigation_id}")
async def deprecated_delete_mitigation(mitigation_id: int, request: Request, db: AsyncSession = Depends(get_db)):
    far_service.require_role(request, {"ADMIN"})
    if await db.get(models.FarMitigation, mitigation_id) is None:
        raise HTTPException(status_code=404, detail={"code": "FAR_NESTED_NOT_FOUND", "entity_type": "mitigation"})
    return _legacy_mutation_response(f"POST /api/v1/far/mitigation/{mitigation_id}/retirement/preview then /api/v1/far/nested/retirement/execute")


@router.delete("/prevention/{prevention_id}")
async def deprecated_delete_prevention(prevention_id: int, request: Request, db: AsyncSession = Depends(get_db)):
    far_service.require_role(request, {"ADMIN"})
    if await db.get(models.FarPrevention, prevention_id) is None:
        raise HTTPException(status_code=404, detail={"code": "FAR_NESTED_NOT_FOUND", "entity_type": "prevention"})
    return _legacy_mutation_response(f"POST /api/v1/far/prevention/{prevention_id}/retirement/preview then /api/v1/far/nested/retirement/execute")


@router.delete("/resolutions/{resolution_id}")
async def deprecated_delete_resolution(resolution_id: int, request: Request, db: AsyncSession = Depends(get_db)):
    far_service.require_role(request, {"ADMIN"})
    if await db.get(models.FarResolution, resolution_id) is None:
        raise HTTPException(status_code=404, detail={"code": "FAR_NESTED_NOT_FOUND", "entity_type": "resolution"})
    return _legacy_mutation_response(f"POST /api/v1/far/resolution/{resolution_id}/retirement/preview then /api/v1/far/nested/retirement/execute")


# --- DEDICATED FAR EXCHANGE ---

@router.post("/exchange/import/preview")
async def preview_far_import(
    data: schemas.FarExchangePreviewRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    return await far_exchange.preview_import(db, request, data)


@router.post("/exchange/import/execute", response_model=schemas.FarMutationResult)
async def execute_far_import(
    data: schemas.FarExchangeExecuteRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    return await far_exchange.execute_import(db, request, data)


@router.get("/exchange/export/structured")
async def export_far_structured(
    request: Request,
    include_retired: bool = Query(default=False),
    db: AsyncSession = Depends(get_db),
):
    far_service.tenant_identity(request)
    return await far_exchange.structured_export(db, include_retired=include_retired)


@router.get("/exchange/export/csv")
async def export_far_csv(
    request: Request,
    include_retired: bool = Query(default=False),
    db: AsyncSession = Depends(get_db),
):
    far_service.tenant_identity(request)
    payload = await far_exchange.csv_export(db, include_retired=include_retired)
    return StreamingResponse(
        iter([payload]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": "attachment; filename=sysgrid-far.csv"},
    )
