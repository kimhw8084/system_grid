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
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class SiteCreate(SiteBase):
    pass

class SiteResponse(SiteBase, BaseSchema):
    pass

# 2. Rooms
class RoomBase(BaseModel):
    site_id: int
    name: str
    floor_plan_data: Optional[Dict[str, Any]] = None

class RoomCreate(RoomBase):
    pass

class RoomResponse(RoomBase, BaseSchema):
    pass

# 3. Racks
class RackBase(BaseModel):
    room_id: int
    name: str
    total_u_height: int = 42
    max_power_kw: float
    weight_limit_kg: float
    u_pitch_mm: float = 44.45

class RackCreate(RackBase):
    pass

class RackResponse(RackBase, BaseSchema):
    pass

# 4. Devices
class DeviceBase(BaseModel):
    name: str
    status: str = "active"
    model: str
    manufacturer: str
    serial_number: str
    asset_tag: str
    power_max_w: float
    power_idle_w: float
    maintenance_mode: bool = False
    metadata_json: Optional[Dict[str, Any]] = None

class DeviceCreate(DeviceBase):
    pass

class DeviceResponse(DeviceBase, BaseSchema):
    pass
