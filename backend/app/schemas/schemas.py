from pydantic import BaseModel, ConfigDict
from typing import List, Optional, Any, Dict
from datetime import datetime

class BaseSchema(BaseModel):
    id: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    created_by_user_id: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)

# Sites
class SiteBase(BaseModel):
    name: str
    address: Optional[str] = ""

class SiteCreate(SiteBase):
    pass

class SiteResponse(SiteBase, BaseSchema):
    pass

# Rooms
class RoomBase(BaseModel):
    site_id: int
    name: str

class RoomCreate(RoomBase):
    pass

class RoomResponse(RoomBase, BaseSchema):
    pass

# Racks
class RackBase(BaseModel):
    room_id: Optional[int] = None
    name: str
    total_u_height: int = 42
    max_power_kw: float = 8.0

class RackCreate(RackBase):
    site_id: Optional[int] = None

class RackResponse(RackBase, BaseSchema):
    site_name: Optional[str] = None

# Devices
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
    
    owner: Optional[str] = None
    vendor: Optional[str] = None
    install_date: Optional[datetime] = None
    support_expiry: Optional[datetime] = None
    purchase_order: Optional[str] = None
    sustainability_notes: Optional[str] = None
    
    metadata_json: Optional[Dict[str, Any]] = None

class DeviceCreate(DeviceBase):
    pass

class DeviceResponse(DeviceBase, BaseSchema):
    relationships: List[Any] = []

# Network Connections
class ConnectionCreate(BaseModel):
    device_a_id: int
    port_a: str
    device_b_id: int
    port_b: str
    purpose: str
    speed: float
    unit: str = "Gbps"
    direction: str = "Bidirectional"

# Audit Logs
class AuditLogResponse(BaseModel):
    id: int
    timestamp: datetime
    user_id: str
    action: str
    table_name: str
    record_id: int
    intent_note: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)
