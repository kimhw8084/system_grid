from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime

class TenantBase(BaseModel):
    name: str

class TenantCreate(TenantBase):
    pass

class TenantResponse(TenantBase):
    id: int
    db_url: str
    is_active: bool
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class UserTenantResponse(BaseModel):
    id: int
    name: str
    role: str
    is_selected: bool
    
    model_config = ConfigDict(from_attributes=True)

class MasterSettingBase(BaseModel):
    key: str
    value: str
    description: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class UserTenantSelection(BaseModel):
    tenant_id: int
