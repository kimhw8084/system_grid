from pydantic import BaseModel, ConfigDict
from typing import List, Optional, Any, Dict
from datetime import datetime

class BaseSchema(BaseModel):
    id: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    created_by_user_id: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)

# 1. Sites
class SiteBase(BaseModel):
    name: str
    address: str

class SiteCreate(SiteBase):
    pass

class SiteResponse(SiteBase, BaseSchema):
    pass

# 2. Rooms
class RoomBase(BaseModel):
    site_id: int
    name: str

class RoomCreate(RoomBase):
    pass

class RoomResponse(RoomBase, BaseSchema):
    pass

# 3. Racks
class RackBase(BaseModel):
    room_id: int
    name: str
    total_u_height: int = 42
    max_power_kw: float = 8.0

class RackCreate(RackBase):
    pass

class RackResponse(RackBase, BaseSchema):
    pass

# 4. Devices
class DeviceBase(BaseModel):
    name: str # Hostname
    system: Optional[str] = None
    status: str = "active"
    model: Optional[str] = None
    manufacturer: Optional[str] = None
    os: Optional[str] = None
    type: str = "physical"
    serial_number: str
    asset_tag: str
    power_max_w: Optional[float] = 0
    power_idle_w: Optional[float] = 0
    maintenance_mode: bool = False
    metadata_json: Optional[Dict[str, Any]] = None

class DeviceCreate(DeviceBase):
    pass

class DeviceResponse(DeviceBase, BaseSchema):
    pass
