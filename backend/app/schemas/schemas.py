from pydantic import BaseModel, ConfigDict
from typing import List, Optional, Any, Dict
from datetime import datetime

class BaseSchema(BaseModel):
    id: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    created_by_user_id: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)

class SiteBase(BaseModel):
    name: str
    address: Optional[str] = ""
    facility_manager: Optional[str] = None
    contact_phone: Optional[str] = None
    cooling_capacity_kw: Optional[float] = 0.0
    power_capacity_kw: Optional[float] = 0.0

class SiteCreate(SiteBase): pass
class SiteResponse(SiteBase, BaseSchema): pass

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

class DeviceBase(BaseModel):
    name: str
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

class MaintenanceWindowBase(BaseModel):
    title: str
    start_time: str
    end_time: str
    ticket_number: Optional[str] = None
    coordinator: Optional[str] = None
    status: str = "Scheduled"

class MaintenanceWindowCreate(MaintenanceWindowBase): pass
class MaintenanceWindowResponse(MaintenanceWindowBase, BaseSchema): pass

class MonitoringItemBase(BaseModel):
    device_id: Optional[int] = None
    category: str # Hardware, Log, Network, App, Synthetic
    status: str # Existing, Planned, Cancelled
    title: str # What's being monitored
    spec: Optional[str] = None # Details/Thresholds
    platform: Optional[str] = None # Zabbix, Prometheus, Datadog, etc.
    external_link: Optional[str] = None # Direct clickable link
    purpose: Optional[str] = None
    notification_method: Optional[str] = None # Email, Slack, PagerDuty
    logic: Optional[str] = None # For log-based: regex or query
    owner: Optional[str] = None

class MonitoringItemCreate(MonitoringItemBase): pass
class MonitoringItemResponse(MonitoringItemBase, BaseSchema):
    device_name: Optional[str] = None
