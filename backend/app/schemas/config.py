from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime

class TenantBase(BaseModel):
    name: str

class TenantCreate(TenantBase):
    pass

class TenantAttach(TenantBase):
    db_path: str # Absolute path on disk

class PreflightRequest(BaseModel):
    db_path: str

class PreflightResponse(BaseModel):
    status: str
    is_valid: bool
    schema_version: Optional[str] = None
    table_count: int
    message: str

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
    
    model_config = ConfigDict(from_attributes=True)

class MasterSettingBase(BaseModel):
    key: str
    value: str
    description: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class UserTenantSelection(BaseModel):
    tenant_id: int
