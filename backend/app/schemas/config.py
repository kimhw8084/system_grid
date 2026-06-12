from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime

class TenantBase(BaseModel):
    name: str

class TenantCreate(TenantBase):
    db_name: Optional[str] = None
    parent_folder: Optional[str] = None

class TenantAttach(TenantBase):
    db_path: Optional[str] = None
    db_url: Optional[str] = None

class PreflightRequest(BaseModel):
    db_path: Optional[str] = None
    db_url: Optional[str] = None

class PreflightResponse(BaseModel):
    status: str
    is_valid: bool
    schema_version: Optional[str] = None
    table_count: int
    message: str
    target: Optional[str] = None

class TenantResponse(TenantBase):
    id: int
    db_url: str
    is_active: bool
    is_online: Optional[bool] = True
    last_backup: Optional[datetime] = None
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class UserTenantResponse(BaseModel):
    id: int
    name: str
    role: str
    is_selected: bool
    is_online: Optional[bool] = True
    db_url: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)

class MasterSettingBase(BaseModel):
    key: str
    value: str
    description: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class UserTenantSelection(BaseModel):
    tenant_id: int
