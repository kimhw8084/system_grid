from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from ..database import get_db
from ..models import models
from .utils import get_current_user_id, normalize_json_object

router = APIRouter(prefix="/workspaces", tags=["Workspaces"])

# This registry is deliberately conservative: it reports only capabilities already present.
WORKSPACE_DEFINITIONS = {
    "monitoring": {"key": "monitoring", "route": "/monitoring", "archetype": "table", "schema_version": 1, "capabilities": ["saved_views", "search", "filters", "column_state", "grouping", "selection", "bulk_actions", "import_export", "details", "lifecycle", "relationships"]},
    "external": {"key": "external", "route": "/external", "archetype": "table", "schema_version": 1, "capabilities": ["saved_views", "search", "filters", "column_state", "grouping", "selection", "bulk_actions", "import_export", "details", "relationships"]},
    "services": {"key": "services", "route": "/services", "archetype": "table", "schema_version": 1, "capabilities": ["saved_views", "search", "filters", "column_state", "grouping", "selection", "bulk_actions", "import_export", "details", "relationships"]},
    "network": {"key": "network", "route": "/network", "archetype": "topology_hybrid", "schema_version": 1, "capabilities": ["saved_views", "search", "details", "custom_body"]},
    "far": {"key": "far", "route": "/far", "archetype": "investigation", "schema_version": 1, "capabilities": ["saved_views", "search", "details", "lifecycle", "custom_body"]},
    "research": {"key": "research", "route": "/research", "archetype": "research", "schema_version": 1, "capabilities": ["saved_views", "search", "details", "custom_body"]},
}

class ViewWrite(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    scope: str = "personal"
    team_id: int | None = None
    definition: dict = Field(default_factory=dict)
    schema_version: int = 1
    revision: int | None = None

def definition_for(key: str):
    result = WORKSPACE_DEFINITIONS.get(key)
    if not result:
        raise HTTPException(400, "Unknown workspace key.")
    return result

def view_payload(view):
    return {"id": view.id, "workspace_key": view.workspace_key, "name": view.name, "scope": view.scope, "owner_user_id": view.owner_user_id, "team_id": view.team_id, "definition": view.definition_json, "schema_version": view.schema_version, "revision": view.revision, "created_at": view.created_at, "updated_at": view.updated_at}

def validate_write(key: str, body: ViewWrite):
    definition_for(key)
    if body.scope != "personal" or body.team_id is not None:
        raise HTTPException(403, "Team saved views are unavailable until team authorization semantics are unified.")
    return normalize_json_object(body.definition)

@router.get("/definitions")
async def list_definitions(): return {"definitions": list(WORKSPACE_DEFINITIONS.values())}

@router.get("/{workspace_key}/views")
async def list_views(workspace_key: str, request: Request, db: AsyncSession = Depends(get_db)):
    definition_for(workspace_key); user_id = get_current_user_id(request)
    rows = await db.execute(select(models.WorkspaceSavedView).where(models.WorkspaceSavedView.workspace_key == workspace_key, models.WorkspaceSavedView.owner_user_id == user_id, models.WorkspaceSavedView.scope == "personal"))
    return {"views": [view_payload(row) for row in rows.scalars().all()]}

@router.post("/{workspace_key}/views", status_code=status.HTTP_201_CREATED)
async def create_view(workspace_key: str, body: ViewWrite, request: Request, db: AsyncSession = Depends(get_db)):
    normalized = validate_write(workspace_key, body); user_id = get_current_user_id(request)
    view = models.WorkspaceSavedView(workspace_key=workspace_key, name=body.name.strip(), scope="personal", owner_user_id=user_id, definition_json=normalized, schema_version=definition_for(workspace_key)["schema_version"], created_by_user_id=user_id)
    db.add(view); await db.commit(); await db.refresh(view); return view_payload(view)

async def owned_view(view_id: int, request: Request, db: AsyncSession):
    view = await db.get(models.WorkspaceSavedView, view_id)
    if not view or view.scope != "personal" or view.owner_user_id != get_current_user_id(request): raise HTTPException(404, "Saved view not found.")
    return view

@router.get("/views/{view_id}")
async def get_view(view_id: int, request: Request, db: AsyncSession = Depends(get_db)): return view_payload(await owned_view(view_id, request, db))

@router.put("/views/{view_id}")
async def update_view(view_id: int, body: ViewWrite, request: Request, db: AsyncSession = Depends(get_db)):
    view = await owned_view(view_id, request, db); normalized = validate_write(view.workspace_key, body)
    if body.revision != view.revision: raise HTTPException(409, {"message": "Saved view changed on the server.", "current": view_payload(view)})
    view.name, view.definition_json, view.schema_version, view.revision = body.name.strip(), normalized, definition_for(view.workspace_key)["schema_version"], view.revision + 1
    await db.commit(); await db.refresh(view); return view_payload(view)

@router.delete("/views/{view_id}")
async def delete_view(view_id: int, revision: int, request: Request, db: AsyncSession = Depends(get_db)):
    view = await owned_view(view_id, request, db)
    if revision != view.revision: raise HTTPException(409, {"message": "Saved view changed on the server.", "current": view_payload(view)})
    await db.delete(view); await db.commit(); return {"status": "deleted"}
