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

class DeviceTinyResponse(BaseSchema):
    name: str
    system: Optional[str] = None
    type: Optional[str] = None
    status: Optional[str] = None
    primary_ip: Optional[str] = None

class RackResponse(RackBase, BaseSchema):
    site_name: Optional[str] = None
    devices: List[DeviceTinyResponse] = []

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
    primary_ip: Optional[str] = None
    management_url: Optional[str] = None
    
    owner: Optional[str] = None
    business_unit: Optional[str] = None
    vendor: Optional[str] = None
    purchase_order: Optional[str] = None
    cost_center: Optional[str] = None
    role: Optional[str] = None
    
    purchase_date: Optional[str] = None
    install_date: Optional[str] = None
    warranty_end: Optional[str] = None
    eol_date: Optional[str] = None
    
    power_supply_count: Optional[int] = 2
    power_max_w: Optional[float] = 0.0
    power_typical_w: Optional[float] = 0.0
    btu_hr: Optional[float] = 0.0
    depth: Optional[str] = "Full" # Full, Half
    
    tool_group: Optional[str] = None
    fab_area: Optional[str] = None
    recipe_critical: Optional[bool] = False
    
    metadata_json: Optional[Dict[str, Any]] = None
    is_reservation: Optional[bool] = False
    reservation_info: Optional[Dict[str, Any]] = None

class DeviceCreate(DeviceBase): pass

class DeviceResponse(DeviceBase, BaseSchema):
    relationships: List[Any] = []
    rack_name: Optional[str] = None
    site_name: Optional[str] = None
    u_size: Optional[int] = None
    u_start: Optional[int] = None
    mount_orientation: Optional[str] = "Front"
    mount_depth: Optional[str] = "Full"
    
    # Enriched Fields
    hardware_summary: Optional[str] = "No Components"
    hardware_age: Optional[str] = "N/A"
    open_incident_count: Optional[int] = 0

class MaintenanceWindowBase(BaseModel):
    title: str
    start_time: str
    end_time: str
    ticket_number: Optional[str] = None
    coordinator: Optional[str] = None
    status: str = "Scheduled"

class MaintenanceWindowCreate(MaintenanceWindowBase): pass
class MaintenanceWindowResponse(MaintenanceWindowBase, BaseSchema): pass

class MonitoringOwnerBase(BaseModel):
    name: str
    external_id: str
    role: str

class MonitoringOwnerCreate(MonitoringOwnerBase): pass
class MonitoringOwnerResponse(MonitoringOwnerBase, BaseSchema): pass

class MonitoringItemBase(BaseModel):
    device_id: Optional[int] = None
    category: str # Hardware, Log, Network, App, Synthetic
    status: str # Existing, Planned, Cancelled, Deleted
    title: str # What's being monitored
    spec: Optional[str] = None # Details/Thresholds
    platform: Optional[str] = None # Zabbix, Prometheus, Datadog, etc.
    monitoring_url: Optional[str] = None # Direct clickable link
    purpose: Optional[str] = None
    impact: Optional[str] = None
    notification_method: Optional[str] = None # Email, Slack, PagerDuty
    notification_recipients: Optional[List[str]] = []
    logic: Optional[str] = None # For log-based: regex or query
    logic_json: Optional[List[Dict[str, Any]]] = []
    monitored_services: List[int] = []
    
    # New Fields
    check_interval: Optional[int] = 60
    alert_duration: Optional[int] = 0
    notification_throttle: Optional[int] = 3600
    severity: Optional[str] = "Warning"
    is_active: Optional[bool] = True
    is_deleted: Optional[bool] = False
    recovery_docs: Optional[List[int]] = []
    version: Optional[int] = 1

class MonitoringItemCreate(MonitoringItemBase):
    owners: List[MonitoringOwnerCreate] = []

class MonitoringItemResponse(MonitoringItemBase, BaseSchema):
    is_deleted: bool = False
    device_name: Optional[str] = None
    monitored_service_names: List[str] = [] # Optional, for UI convenience
    recovery_doc_titles: List[str] = [] # For UI convenience
    owners: List[MonitoringOwnerResponse] = []

class MonitoringHistoryResponse(BaseSchema):
    monitoring_item_id: int
    version: int
    snapshot: Dict[str, Any]
    change_summary: Optional[str] = None

class ServiceSecretBase(BaseModel):
    username: Optional[str] = None
    password: Optional[str] = None
    note: Optional[str] = None

class ServiceSecretCreate(ServiceSecretBase):
    service_id: int

class ServiceSecretResponse(ServiceSecretBase, BaseSchema):
    service_id: int

class LogicalServiceBase(BaseModel):
    device_id: Optional[int] = None
    name: str
    service_type: str
    status: Optional[str] = "Active"
    version: Optional[str] = None
    environment: Optional[str] = "Production"
    config_json: Optional[Dict[str, Any]] = None
    custom_attributes: Optional[Dict[str, Any]] = None
    purchase_type: Optional[str] = "One-time"
    purchase_date: Optional[str] = None
    expiry_date: Optional[str] = None
    cost: Optional[float] = 0.0
    currency: Optional[str] = "USD"
    manufacturer: Optional[str] = None
    supplier: Optional[str] = None

class LogicalServiceCreate(LogicalServiceBase): pass
class LogicalServiceResponse(LogicalServiceBase, BaseSchema):
    device_name: Optional[str] = None
    is_deleted: bool = False
    secrets: List[ServiceSecretResponse] = []

class IncidentLogBase(BaseModel):
    systems: Optional[List[str]] = []
    impacted_device_ids: Optional[List[int]] = []
    title: str
    severity: Optional[str] = "Major"
    status: Optional[str] = "Investigating"
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    reporter: Optional[str] = None
    initial_symptoms: Optional[str] = None
    impacts: Optional[List[str]] = []
    impact_analysis: Optional[str] = None
    trigger_event: Optional[str] = None
    log_evidence: Optional[str] = None
    mitigation_steps: Optional[str] = None
    root_cause: Optional[str] = None
    resolution_steps: Optional[str] = None
    lessons_learned: Optional[str] = None
    prevention_strategy: Optional[str] = None
    timeline: Optional[List[Any]] = []
    todos: Optional[List[Any]] = []

class IncidentLogCreate(IncidentLogBase): pass
class IncidentLogResponse(IncidentLogBase, BaseSchema):
    device_names: Optional[List[str]] = []

# External Intelligence
class ExternalEntitySecretBase(BaseModel):
    username: Optional[str] = None
    password: Optional[str] = None
    note: Optional[str] = None

class ExternalEntitySecretCreate(ExternalEntitySecretBase):
    external_entity_id: int

class ExternalEntitySecretResponse(ExternalEntitySecretBase, BaseSchema):
    external_entity_id: int

class ExternalEntityBase(BaseModel):
    name: str
    type: str
    owner_organization: Optional[str] = None
    owner_team: Optional[str] = None
    status: Optional[str] = "Planned"
    environment: Optional[str] = "Production"
    description: Optional[str] = None
    poc_json: Optional[List[Dict[str, Any]]] = []
    metadata_json: Optional[Dict[str, Any]] = {}

class ExternalEntityCreate(ExternalEntityBase): pass
class ExternalEntityResponse(ExternalEntityBase, BaseSchema):
    is_deleted: bool = False
    secrets: List[ExternalEntitySecretResponse] = []

class ExternalLinkBase(BaseModel):
    external_entity_id: int
    device_id: int
    service_id: Optional[int] = None
    direction: str = "Upstream"
    purpose: Optional[str] = None
    protocol: Optional[str] = "TCP"
    port: Optional[str] = None
    credentials: Optional[Dict[str, Any]] = None

class ExternalLinkCreate(ExternalLinkBase): pass
class ExternalLinkResponse(ExternalLinkBase, BaseSchema):
    external_entity_name: Optional[str] = None
    device_name: Optional[str] = None
    service_name: Optional[str] = None

# --- FAR (FAILURE ANALYSIS & RESOLUTION) SCHEMAS ---

class FarResolutionResponse(BaseSchema):
    knowledge_id: Optional[int] = None
    preventive_follow_up: Optional[str] = None
    responsible_team: Optional[str] = None
    knowledge_bkm: Optional[Any] = None

class FarMitigationResponse(BaseSchema):
    mitigation_type: str
    mitigation_steps: Optional[str] = None
    responsible_team: Optional[str] = None
    status: Optional[str] = "Not Started"
    cause_id: Optional[int] = None
    monitoring_item_id: Optional[int] = None

class FarPreventionResponse(BaseSchema):
    failure_mode_id: int
    cause_id: Optional[int] = None
    prevention_action: str
    status: str = "Open"
    target_date: Optional[datetime] = None
    responsible_team: Optional[str] = None

class FarFailureCauseResponse(BaseSchema):
    cause_text: str
    occurrence_level: int = 1
    responsible_team: Optional[str] = None
    resolutions: List[FarResolutionResponse] = []
    mitigations: List[FarMitigationResponse] = []
    prevention_actions: List[FarPreventionResponse] = []

class RcaRecordTinyResponse(BaseSchema):
    title: str
    severity: Optional[str] = None
    status: str = "Open"
    incident_type: Optional[str] = None

class FarFailureModeResponse(BaseSchema):
    system_name: str
    failure_type: str = "Design"
    title: str
    effect: Optional[str] = None
    severity: int = 1
    occurrence: int = 1
    detection: int = 1
    rpn: int = 1
    status: str = "Analyzing"
    has_incident_history: bool = False
    metadata_json: Optional[dict] = {}
    
    affected_assets: List[DeviceTinyResponse] = []
    causes: List[FarFailureCauseResponse] = []
    mitigations: List[FarMitigationResponse] = []
    prevention_actions: List[FarPreventionResponse] = []
    linked_rcas: List[RcaRecordTinyResponse] = []

class RcaTimelineEventResponse(BaseSchema):
    rca_id: int
    event_time: datetime
    event_type: Optional[str] = None
    description: str
    owner: Optional[str] = None
    owner_team: Optional[str] = None
    images: Optional[List[str]] = []

class RcaMitigationResponse(BaseSchema):
    rca_id: int
    type: str
    action_description: str
    status: str = "Planned"

class RcaRecordResponse(BaseSchema):
    title: str
    problem_statement: Optional[str] = None
    trigger_source: Optional[str] = None
    severity: Optional[str] = None
    priority: int = 1
    initial_symptoms: Optional[str] = None
    occurrence_at: Optional[datetime] = None
    detection_at: Optional[datetime] = None
    acknowledged_at: Optional[datetime] = None
    owner: Optional[str] = None
    owners: Optional[List[str]] = []
    incident_type: Optional[str] = None
    detection_type: Optional[str] = None
    impact_type: Optional[str] = None
    target_systems: Optional[List[str]] = []
    impacted_asset_ids: Optional[List[int]] = []
    impacted_service_ids: Optional[List[int]] = []
    identification_steps_json: Optional[List[Any]] = []
    rca_steps_json: Optional[List[Any]] = []
    mitigation_logs_json: Optional[List[Any]] = []
    narrative_summary: Optional[str] = None
    evidence_json: Optional[List[Any]] = []
    cause_of_failure: Optional[str] = None
    status: str = "Open"
    
    timeline: List[RcaTimelineEventResponse] = []
    mitigations: List[RcaMitigationResponse] = []
    linked_failure_modes: List[FarFailureModeResponse] = []

class ProjectCommentBase(BaseModel):
    author: str
    content: str
    project_id: int
    task_id: Optional[int] = None

class ProjectCommentCreate(ProjectCommentBase): pass
class ProjectCommentResponse(ProjectCommentBase, BaseSchema):
    timestamp: datetime

class ProjectQABase(BaseModel):
    question: str
    answer: Optional[str] = None
    asked_by: str
    answered_by: Optional[str] = None
    status: str = "Pending"
    project_id: int
    task_id: Optional[int] = None

class ProjectQACreate(ProjectQABase): pass
class ProjectQAResponse(ProjectQABase, BaseSchema): pass

class ProjectTaskBase(BaseModel):
    name: str
    description: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    progress: int = 0
    status: str = "To Do"
    owner: Optional[str] = None
    assigned_objects: Optional[List[Any]] = []
    project_id: int
    parent_task_id: Optional[int] = None

class ProjectTaskCreate(ProjectTaskBase): pass
class ProjectTaskResponse(ProjectTaskBase, BaseSchema):
    comments: List[ProjectCommentResponse] = []
    qa_items: List[ProjectQAResponse] = []
    subtasks: List["ProjectTaskResponse"] = []

class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None
    type: Optional[str] = None
    status: Optional[str] = "Planning"
    priority: Optional[str] = "Medium"
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    owner: Optional[str] = None
    
    jira_links: Optional[List[str]] = []
    target_systems: Optional[List[str]] = []
    target_assets: Optional[List[str]] = []
    target_services: Optional[List[str]] = []
    beneficiaries: Optional[List[str]] = []
    
    problem_statement: Optional[str] = None
    objective: Optional[str] = None
    key_functions: Optional[List[str]] = []
    expected_outcomes: Optional[List[str]] = []
    
    parent_project_id: Optional[int] = None
    
    roi_defense_line: int = 0
    man_hours_saved: float = 0.0
    stoploss_minutes_saved: float = 0.0
    wafers_gained: float = 0.0
    
    appendix_json: Optional[Dict[str, Any]] = {}
    team_members: Optional[List[str]] = []
    budget: float = 0.0
    currency: str = "USD"
    metadata_json: Optional[Dict[str, Any]] = {}

class ProjectCreate(ProjectBase): pass
class ProjectResponse(ProjectBase, BaseSchema):
    is_deleted: bool = False
    tasks: List[ProjectTaskResponse] = []
    comments: List[ProjectCommentResponse] = []
    qa_items: List[ProjectQAResponse] = []

class GlobalSettingBase(BaseModel):
    key: str
    value: str
    category: Optional[str] = "General"
    description: Optional[str] = None
    is_public: Optional[bool] = False

class GlobalSettingCreate(GlobalSettingBase): pass
class GlobalSettingResponse(GlobalSettingBase, BaseSchema): pass

class UserPreferenceBase(BaseModel):
    key: str
    value: str

class UserPreferenceCreate(UserPreferenceBase): pass
class UserPreferenceResponse(UserPreferenceBase, BaseSchema):
    user_id: str

# --- VENDOR SCHEMAS ---

class VendorPersonnelBase(BaseModel):
    name: str
    name_original: Optional[str] = None
    position: Optional[str] = None
    team: Optional[str] = None
    company_email: Optional[str] = None
    internal_email: Optional[str] = None
    phone: Optional[str] = None
    accounts: Optional[List[Dict[str, Any]]] = []
    pcs: Optional[List[Dict[str, Any]]] = []
    metadata_json: Optional[Dict[str, Any]] = {}

class VendorPersonnelCreate(VendorPersonnelBase):
    vendor_id: int

class VendorPersonnelResponse(VendorPersonnelBase, BaseSchema):
    vendor_id: int

class VendorContractBase(BaseModel):
    title: str
    contract_id: Optional[str] = None
    effective_date: Optional[datetime] = None
    expiry_date: Optional[datetime] = None
    covered_systems: Optional[List[str]] = []
    covered_assets: Optional[List[int]] = []
    scope_of_work: Optional[List[Dict[str, Any]]] = []
    schedule: Optional[Dict[str, Any]] = {}
    document_link: Optional[str] = None
    previous_contract_changes: Optional[str] = None
    metadata_json: Optional[Dict[str, Any]] = {}

class VendorContractCreate(VendorContractBase):
    vendor_id: int

class VendorContractResponse(VendorContractBase, BaseSchema):
    vendor_id: int

class VendorBase(BaseModel):
    name: str
    country: Optional[str] = "South Korea"
    primary_email: Optional[str] = None
    primary_phone: Optional[str] = None
    metadata_json: Optional[Dict[str, Any]] = {}

class VendorCreate(VendorBase): pass
class VendorResponse(VendorBase, BaseSchema):
    is_deleted: bool = False
    personnel: List[VendorPersonnelResponse] = []
    contracts: List[VendorContractResponse] = []
