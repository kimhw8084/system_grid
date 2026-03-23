from pydantic import BaseModel, ConfigDict, Field
from typing import List, Optional, Any, Dict
from datetime import datetime

class BaseSchema(BaseModel):
    id: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    created_by_user_id: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)

# -----------------
# INFRASTRUCTURE
# -----------------
class SiteBase(BaseModel):
    name: str
    address: Optional[str] = ""
    facility_manager: Optional[str] = None
    contact_phone: Optional[str] = None
    cooling_capacity_kw: Optional[float] = 0.0
    power_capacity_kw: Optional[float] = 0.0

class SiteCreate(SiteBase): pass
class SiteResponse(SiteBase, BaseSchema): pass

class RoomBase(BaseModel):
    site_id: int
    name: str
    floor_level: Optional[str] = None
    hvac_zone: Optional[str] = None
    fire_suppression_type: Optional[str] = None

class RoomCreate(RoomBase): pass
class RoomResponse(RoomBase, BaseSchema): pass

class RackBase(BaseModel):
    room_id: Optional[int] = None
    name: str
    total_u_height: int = 42
    max_power_kw: float = 8.0
    max_weight_kg: float = 1000.0
    cooling_type: Optional[str] = "Air"
    pdu_a_id: Optional[str] = None
    pdu_b_id: Optional[str] = None

class RackCreate(RackBase):
    site_id: Optional[int] = None

class RackResponse(RackBase, BaseSchema):
    site_name: Optional[str] = None
    devices: List[Any] = []

# -----------------
# ASSETS / DEVICES
# -----------------
class DeviceBase(BaseModel):
    name: str # Hostname
    system: Optional[str] = None
    environment: Optional[str] = "Production"
    status: Optional[str] = "Active"
    type: Optional[str] = "Physical"
    
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    serial_number: str
    asset_tag: str
    part_number: Optional[str] = None
    
    os_name: Optional[str] = None
    os_version: Optional[str] = None
    management_ip: Optional[str] = None
    management_url: Optional[str] = None
    
    owner: Optional[str] = None
    business_unit: Optional[str] = None
    vendor: Optional[str] = None
    purchase_order: Optional[str] = None
    cost_center: Optional[str] = None
    
    # Let frontend pass ISO strings or None, backend handles conversion
    purchase_date: Optional[str] = None
    install_date: Optional[str] = None
    warranty_end: Optional[str] = None
    eol_date: Optional[str] = None
    
    power_supply_count: Optional[int] = 2
    power_max_w: Optional[float] = 0.0
    power_typical_w: Optional[float] = 0.0
    btu_hr: Optional[float] = 0.0
    
    tool_group: Optional[str] = None
    fab_area: Optional[str] = None
    recipe_critical: Optional[bool] = False
    
    metadata_json: Optional[Dict[str, Any]] = None

class DeviceCreate(DeviceBase): pass

class DeviceResponse(DeviceBase, BaseSchema):
    relationships: List[Any] = []
    rack_name: Optional[str] = None
    site_name: Optional[str] = None
    u_size: Optional[int] = None
    u_start: Optional[int] = None

# -----------------
# EXPANSIONS
# -----------------
class HardwareComponentBase(BaseModel):
    category: str
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    capacity: Optional[str] = None
    quantity: int = 1
    serial_number: Optional[str] = None
    firmware_version: Optional[str] = None

class HardwareComponentCreate(HardwareComponentBase): pass
class HardwareComponentResponse(HardwareComponentBase, BaseSchema): pass

class DeviceSoftwareBase(BaseModel):
    category: str
    name: str
    version: Optional[str] = None
    license_key: Optional[str] = None
    install_path: Optional[str] = None
    service_status: Optional[str] = "Running"
    purpose: Optional[str] = None

class DeviceSoftwareCreate(DeviceSoftwareBase): pass
class DeviceSoftwareResponse(DeviceSoftwareBase, BaseSchema): pass

class SecretVaultBase(BaseModel):
    credential_type: str
    username: str
    encrypted_payload: str
    key_file_path: Optional[str] = None
    notes: Optional[str] = None

class SecretVaultCreate(SecretVaultBase): pass
class SecretVaultResponse(SecretVaultBase, BaseSchema): pass

class DeviceRelationshipBase(BaseModel):
    target_device_id: int
    relationship_type: str
    source_role: Optional[str] = None
    target_role: Optional[str] = None
    notes: Optional[str] = None

# -----------------
# NETWORK FABRIC
# -----------------
class ConnectionCreate(BaseModel):
    device_a_id: int
    port_a: str
    device_b_id: int
    port_b: str
    purpose: str
    speed_gbps: float
    cable_type: Optional[str] = None
    direction: str = "Bidirectional"
