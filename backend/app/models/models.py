from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey, JSON, Text, Table
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base

class BaseMixin:
    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())
    created_by_user_id = Column(String, default="system_admin")

class Site(Base, BaseMixin):
    __tablename__ = "sites"
    name = Column(String, index=True, unique=True)
    address = Column(String)
    facility_manager = Column(String)
    contact_phone = Column(String)
    cooling_capacity_kw = Column(Float, default=0.0)
    power_capacity_kw = Column(Float, default=0.0)
    order_index = Column(Integer, default=0)
    rooms = relationship("Room", back_populates="site", cascade="all, delete-orphan")

class Room(Base, BaseMixin):
    __tablename__ = "rooms"
    site_id = Column(Integer, ForeignKey("sites.id", ondelete="CASCADE"))
    name = Column(String)
    floor_level = Column(String)
    hvac_zone = Column(String)
    fire_suppression_type = Column(String)
    site = relationship("Site", back_populates="rooms")
    racks = relationship("Rack", back_populates="room")

class Rack(Base, BaseMixin):
    __tablename__ = "racks"
    room_id = Column(Integer, ForeignKey("rooms.id", ondelete="SET NULL"), nullable=True)
    name = Column(String, index=True)
    total_u_height = Column(Integer, default=42)
    max_power_kw = Column(Float, default=8.0)
    typical_power_kw = Column(Float, default=4.0)
    max_weight_kg = Column(Float, default=1000.0)
    cooling_type = Column(String)
    pdu_a_id = Column(String)
    pdu_b_id = Column(String)
    is_deleted = Column(Boolean, default=False)
    order_index = Column(Integer, default=0)
    last_site_name = Column(String, nullable=True) # Historical record for unassigned racks
    room = relationship("Room", back_populates="racks")
    device_locations = relationship("DeviceLocation", back_populates="rack", cascade="all, delete-orphan")

class Device(Base, BaseMixin):
    __tablename__ = "devices"
    name = Column(String, index=True) # Hostname (Removed unique)
    system = Column(String, index=True) # Logical System name
    environment = Column(String, default="Production")
    status = Column(String, default="Active")
    type = Column(String) # Physical, Virtual, Storage, Switch
    size_u = Column(Integer, default=1) # Default U-height for the device
    
    manufacturer = Column(String)
    model = Column(String)
    serial_number = Column(String, index=True) # Removed unique
    asset_tag = Column(String, index=True)
    part_number = Column(String)
    
    os_name = Column(String)
    os_version = Column(String)
    management_ip = Column(String)
    primary_ip = Column(String)
    management_url = Column(String)
    
    owner = Column(String)
    business_unit = Column(String)
    vendor = Column(String)
    purchase_order = Column(String)
    cost_center = Column(String)
    purchase_date = Column(DateTime, nullable=True)
    install_date = Column(DateTime, nullable=True)
    warranty_end = Column(DateTime, nullable=True)
    eol_date = Column(DateTime, nullable=True)
    role = Column(String) # Role description of the asset
    
    power_supply_count = Column(Integer, default=2)
    power_max_w = Column(Float, default=0.0)
    power_typical_w = Column(Float, default=0.0)
    btu_hr = Column(Float, default=0.0)
    depth = Column(String, default="Full") # Full, Half
    
    tool_group = Column(String)
    fab_area = Column(String)
    recipe_critical = Column(Boolean, default=False)
    
    metadata_json = Column(JSON, default=dict)
    is_reservation = Column(Boolean, default=False)
    reservation_info = Column(JSON, default=dict) # {est_arrival: "YYYY-MM", requester: "Name"}
    is_deleted = Column(Boolean, default=False)
    
    locations = relationship("DeviceLocation", back_populates="device", cascade="all, delete-orphan")
    components = relationship("HardwareComponent", back_populates="device", cascade="all, delete-orphan")
    software = relationship("DeviceSoftware", back_populates="device", cascade="all, delete-orphan")
    secrets = relationship("SecretVault", back_populates="device", cascade="all, delete-orphan")
    relationships = relationship("DeviceRelationship", primaryjoin="Device.id==DeviceRelationship.source_device_id", cascade="all, delete-orphan")
    maintenance_windows = relationship("MaintenanceWindow", back_populates="device", cascade="all, delete-orphan")
    logical_services = relationship("LogicalService", back_populates="device")
    monitoring_items = relationship("MonitoringItem", back_populates="device", cascade="all, delete-orphan")
    network_interfaces = relationship("NetworkInterface", back_populates="device", cascade="all, delete-orphan")

class LogicalService(Base, BaseMixin):
    __tablename__ = "logical_services"
    device_id = Column(Integer, ForeignKey("devices.id", ondelete="SET NULL"), nullable=True) # Nullable if service is floating/clustered
    name = Column(String, index=True) # Service Name
    service_type = Column(String, index=True) # Database, Web, Middleware, Container, ToolStack, Other
    status = Column(String, default="Active") # Active, Stopped, Critical, Maintenance
    version = Column(String)
    environment = Column(String, default="Production")
    purpose = Column(Text) # Purpose description
    documentation_link = Column(String) # Link to source, installation, app, etc.
    installation_date = Column(DateTime) # Date of installation or planned installation
    
    # Exaustive Predefined Schemas stored in JSON for maximum flexibility + strict UI enforcement
    # For Database: { engine, instance_name, port, sid, collation, always_on, data_path, backup_policy }
    # For Web: { server_type, url, bindings, app_pool, ssl_expiry, root_path }
    config_json = Column(JSON, default=dict)
    
    # License & Procurement
    purchase_type = Column(String) # One-time, Subscription
    purchase_date = Column(DateTime)
    expiry_date = Column(DateTime)
    cost = Column(Float, default=0.0)
    currency = Column(String, default="USD") # USD, KRW
    manufacturer = Column(String) # Developing company (e.g. Microsoft)
    supplier = Column(String) # Licensing company (e.g. AWS, Reseller)
    
    # Smart Expandability: Unlimited custom key-values
    custom_attributes = Column(JSON, default=dict)
    is_deleted = Column(Boolean, default=False)
    
    device = relationship("Device", back_populates="logical_services")
    secrets = relationship("ServiceSecret", back_populates="service", cascade="all, delete-orphan")

class ServiceSecret(Base, BaseMixin):
    __tablename__ = "service_secrets"
    service_id = Column(Integer, ForeignKey("logical_services.id", ondelete="CASCADE"))
    username = Column(String)
    password = Column(String)
    note = Column(Text)
    service = relationship("LogicalService", back_populates="secrets")

class DeviceRelationship(Base, BaseMixin):
    __tablename__ = "device_relationships"
    source_device_id = Column(Integer, ForeignKey("devices.id", ondelete="CASCADE"))
    target_device_id = Column(Integer, ForeignKey("devices.id", ondelete="CASCADE"))
    relationship_type = Column(String)
    source_role = Column(String)
    target_role = Column(String)
    notes = Column(Text)

class DeviceLocation(Base, BaseMixin):
    __tablename__ = "device_locations"
    device_id = Column(Integer, ForeignKey("devices.id", ondelete="CASCADE"))
    rack_id = Column(Integer, ForeignKey("racks.id", ondelete="CASCADE"))
    start_unit = Column(Integer)
    size_u = Column(Integer)
    orientation = Column(String, default="Front") # Front, Back
    depth = Column(String, default="Full") # Full, Half
    device = relationship("Device", back_populates="locations")
    rack = relationship("Rack", back_populates="device_locations")

class HardwareComponent(Base, BaseMixin):
    __tablename__ = "hardware_components"
    device_id = Column(Integer, ForeignKey("devices.id", ondelete="CASCADE"))
    category = Column(String) # CPU, Memory, Card, SSD, HDD, NIC
    name = Column(String)
    manufacturer = Column(String)
    specs = Column(String)
    count = Column(Integer, default=1)
    serial_number = Column(String)
    device = relationship("Device", back_populates="components")

class DeviceSoftware(Base, BaseMixin):
    __tablename__ = "device_software"
    device_id = Column(Integer, ForeignKey("devices.id", ondelete="CASCADE"))
    category = Column(String)
    name = Column(String)
    version = Column(String)
    install_date = Column(DateTime)
    purpose = Column(String)
    notes = Column(Text)
    device = relationship("Device", back_populates="software")

class NetworkInterface(Base, BaseMixin):
    __tablename__ = "network_interfaces"
    device_id = Column(Integer, ForeignKey("devices.id", ondelete="CASCADE"))
    name = Column(String)
    mac_address = Column(String, unique=True, index=True)
    ip_address = Column(String, index=True)
    vlan_id = Column(Integer, nullable=True)
    link_speed_gbps = Column(Integer)
    device = relationship("Device", back_populates="network_interfaces")

class PortConnection(Base, BaseMixin):
    __tablename__ = "port_connections"
    source_device_id = Column(Integer, ForeignKey("devices.id", ondelete="CASCADE"))
    source_port = Column(String)
    source_ip = Column(String, nullable=True)
    source_mac = Column(String, nullable=True)
    source_vlan = Column(Integer, nullable=True)
    target_device_id = Column(Integer, ForeignKey("devices.id", ondelete="CASCADE"))
    target_port = Column(String)
    target_ip = Column(String, nullable=True)
    target_mac = Column(String, nullable=True)
    target_vlan = Column(Integer, nullable=True)
    link_type = Column(String)  # Renamed from purpose
    purpose = Column(Text)     # New description field
    speed_gbps = Column(Float)
    unit = Column(String)
    direction = Column(String)
    cable_type = Column(String)

class Subnet(Base, BaseMixin):
    __tablename__ = "subnets"
    network_cidr = Column(String, index=True, unique=True)
    name = Column(String)
    vlan_id = Column(Integer, nullable=True)
    gateway = Column(String, nullable=True)
    dns_servers = Column(String, nullable=True) # Comma separated
    description = Column(Text)

class SettingOption(Base, BaseMixin):
    __tablename__ = "settings_options"
    category = Column(String, index=True) # LogicalSystem, DeviceType, ServiceType, etc.
    label = Column(String)
    value = Column(String)
    description = Column(String, nullable=True)
    metadata_keys = Column(JSON, default=list) # For ServiceType: ["port", "dbname", etc]
    is_default = Column(Boolean, default=False)

class SecretVault(Base, BaseMixin):
    __tablename__ = "secret_vault"
    device_id = Column(Integer, ForeignKey("devices.id", ondelete="CASCADE"))
    secret_type = Column(String)
    username = Column(String)
    encrypted_payload = Column(Text)
    notes = Column(Text)
    device = relationship("Device", back_populates="secrets")

class MaintenanceWindow(Base, BaseMixin):
    __tablename__ = "maintenance_windows"
    device_id = Column(Integer, ForeignKey("devices.id", ondelete="CASCADE"))
    title = Column(String)
    start_time = Column(DateTime)
    end_time = Column(DateTime)
    ticket_number = Column(String)
    coordinator = Column(String)
    status = Column(String)
    device = relationship("Device", back_populates="maintenance_windows")

class MonitoringItem(Base, BaseMixin):
    __tablename__ = "monitoring_items"
    device_id = Column(Integer, ForeignKey("devices.id", ondelete="CASCADE"), nullable=True)
    category = Column(String, index=True) # Hardware, Log, Network, App, Synthetic
    status = Column(String, index=True) # Existing, Planned, Cancelled, Deleted
    title = Column(String) # What's being monitored
    spec = Column(Text) # Details/Thresholds
    platform = Column(String) # Zabbix, Prometheus, Datadog, etc.
    monitoring_url = Column(String) # Direct clickable link
    purpose = Column(Text)
    impact = Column(Text)
    notification_method = Column(String) # Email, Slack, PagerDuty
    notification_recipients = Column(JSON, default=list)
    logic = Column(Text) # For log-based: regex or query
    logic_json = Column(JSON, default=list) # Structured logic entries
    monitored_services = Column(JSON, default=list) # List of LogicalService IDs
    
    # Reliability & Frequency Controls
    check_interval = Column(Integer, default=60) # Seconds
    alert_duration = Column(Integer, default=0) # Seconds before alerting
    notification_throttle = Column(Integer, default=3600) # Seconds between re-alerts
    severity = Column(String, default="Warning") # Critical, Warning, Info
    is_active = Column(Boolean, default=True)
    is_deleted = Column(Boolean, default=False)
    recovery_docs = Column(JSON, default=list) # List of KnowledgeEntry IDs
    version = Column(Integer, default=1)

    device = relationship("Device", back_populates="monitoring_items")
    owners = relationship("MonitoringOwner", back_populates="monitoring_item", cascade="all, delete-orphan")

class MonitoringHistory(Base, BaseMixin):
    __tablename__ = "monitoring_history"
    monitoring_item_id = Column(Integer, ForeignKey("monitoring_items.id", ondelete="CASCADE"))
    version = Column(Integer)
    snapshot = Column(JSON) # Snapshot of fields + owners
    change_summary = Column(Text, nullable=True)

    monitoring_item = relationship("MonitoringItem")

class MonitoringOwner(Base, BaseMixin):
    __tablename__ = "monitoring_owners"
    monitoring_item_id = Column(Integer, ForeignKey("monitoring_items.id", ondelete="CASCADE"))
    name = Column(String)
    external_id = Column(String) # Owner ID
    role = Column(String) # From MonitoringOwnerRole enum
    
    monitoring_item = relationship("MonitoringItem", back_populates="owners")

class FirewallRule(Base, BaseMixin):
    __tablename__ = "firewall_rules"
    name = Column(String, index=True)
    risk = Column(Text) # Business impact if rule is missing
    
    # Source Configuration
    source_type = Column(String) # Device, Subnet, Custom IP, Any
    source_device_id = Column(Integer, ForeignKey("devices.id", ondelete="SET NULL"), nullable=True)
    source_subnet_id = Column(Integer, ForeignKey("subnets.id", ondelete="SET NULL"), nullable=True)
    source_custom_ip = Column(String) # For external or one-off IPs
    
    # Destination Configuration
    dest_type = Column(String) # Device, Subnet, Custom IP, Any
    dest_device_id = Column(Integer, ForeignKey("devices.id", ondelete="SET NULL"), nullable=True)
    dest_subnet_id = Column(Integer, ForeignKey("subnets.id", ondelete="SET NULL"), nullable=True)
    dest_custom_ip = Column(String)
    
    # Protocol & Ports
    protocol = Column(String, default="TCP") # TCP, UDP, ICMP, Any
    port_range = Column(String) # e.g. "443", "1433,1434", "1024-2048"
    direction = Column(String, default="Inbound") # Inbound, Outbound
    action = Column(String, default="Allow") # Allow, Deny
    
    status = Column(String, default="Active") # Active, Requested, Decommissioned
    is_deleted = Column(Boolean, default=False)

    source_device = relationship("Device", foreign_keys=[source_device_id])
    dest_device = relationship("Device", foreign_keys=[dest_device_id])
    source_subnet = relationship("Subnet", foreign_keys=[source_subnet_id])
    dest_subnet = relationship("Subnet", foreign_keys=[dest_subnet_id])

class IncidentLog(Base, BaseMixin):
    __tablename__ = "incident_logs"
    systems = Column(JSON, default=list) # Multi-select systems
    impacted_device_ids = Column(JSON, default=list) # Multi-select assets

    title = Column(String, index=True)
    severity = Column(String, default="Major") # Critical, Major, Minor
    status = Column(String, default="Investigating") # Investigating, Identified, Monitoring, Resolved, Prevented
    start_time = Column(DateTime)
    end_time = Column(DateTime, nullable=True)
    reporter = Column(String)

    # Forensic / Progressive disclosure fields
    initial_symptoms = Column(Text) # "Day zero" info
    impacts_json = Column(JSON, default=list) # Multi-select categories (Wafer loss, Blockage, etc.)
    impact_analysis = Column(Text)
    # Deep Forensics (For engineers)
    trigger_event = Column(Text) # Change, load spike, etc.
    log_evidence = Column(Text) # Error log snippets
    mitigation_steps = Column(Text) # Temporary stability
    root_cause = Column(Text) # Final finding
    resolution_steps = Column(Text) # Permanent fix

    # Post-Mortem / Reliability
    lessons_learned = Column(Text)
    prevention_strategy = Column(Text)

    timeline_json = Column(JSON, default=list) # [{time, event, type}]
    todos_json = Column(JSON, default=list) # [{task, status, owner}]
class DataFlow(Base, BaseMixin):
    __tablename__ = "data_flows"
    name = Column(String, index=True)
    description = Column(Text)
    category = Column(String, default="System") # System, Service, Application
    status = Column(String, default="Up to date") # Up to date, Deprecated, Planned, etc.
    nodes_json = Column(JSON, default=list)
    edges_json = Column(JSON, default=list)
    viewport_json = Column(JSON, default=dict)
    is_template = Column(Boolean, default=False)
    is_deleted = Column(Boolean, default=False)

class ExternalEntity(Base, BaseMixin):
    __tablename__ = "external_entities"
    name = Column(String, index=True)
    type = Column(String) # Driven by ExternalType registry (e.g. Equipment, Physical Server, Virtual Server, Switch, Storage, DB, API, Script)
    owner_organization = Column(String)
    owner_team = Column(String)
    status = Column(String, default="Planned")
    environment = Column(String, default="Production")
    description = Column(Text)
    poc_json = Column(JSON, default=list) # Multi-add POCs: [{first_name, last_name, id, email, phone}]
    metadata_json = Column(JSON, default=dict) # Driven by ExternalType registry keys
    is_deleted = Column(Boolean, default=False)
    
    secrets = relationship("ExternalEntitySecret", back_populates="external_entity", cascade="all, delete-orphan")

class ExternalEntitySecret(Base, BaseMixin):
    __tablename__ = "external_entity_secrets"
    external_entity_id = Column(Integer, ForeignKey("external_entities.id", ondelete="CASCADE"))
    username = Column(String)
    password = Column(String)
    note = Column(Text)
    external_entity = relationship("ExternalEntity", back_populates="secrets")

class ExternalLink(Base, BaseMixin):
    __tablename__ = "external_links"
    external_entity_id = Column(Integer, ForeignKey("external_entities.id"))
    device_id = Column(Integer, ForeignKey("devices.id"))
    service_id = Column(Integer, ForeignKey("logical_services.id"), nullable=True)
    direction = Column(String) # Upstream, Downstream
    purpose = Column(String)
    protocol = Column(String) # TCP, UDP, HTTPS, etc.
    port = Column(String)
    credentials = Column(JSON) # Store as { "username": "...", "password": "...", "note": "..." }
    
    external_entity = relationship("ExternalEntity")
    device = relationship("Device")
    service = relationship("LogicalService")

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True)
    timestamp = Column(DateTime, server_default=func.now())
    user_id = Column(String)
    action = Column(String)
    target_table = Column(String)
    target_id = Column(String)
    changes = Column(JSON)
    description = Column(Text)

# --- NEW VENDOR & CONTRACT MODULES ---

class Vendor(Base, BaseMixin):
    __tablename__ = "vendors"
    name = Column(String, index=True)
    primary_email = Column(String)
    primary_phone = Column(String)
    country = Column(String)
    
    is_deleted = Column(Boolean, default=False)
    metadata_json = Column(JSON, default=dict)
    
    personnel = relationship("VendorPersonnel", back_populates="vendor_ref", cascade="all, delete-orphan")
    contracts = relationship("VendorContract", back_populates="vendor_ref", cascade="all, delete-orphan")

class VendorPersonnel(Base, BaseMixin):
    __tablename__ = "vendor_personnel"
    vendor_id = Column(Integer, ForeignKey("vendors.id", ondelete="CASCADE"))
    name = Column(String, index=True)
    position = Column(String)
    team = Column(String)
    company_email = Column(String)
    internal_email = Column(String)
    phone = Column(String)
    
    # Nested lists of dicts
    accounts = Column(JSON, default=list) # [{name, type, created_date, status}]
    pcs = Column(JSON, default=list) # [{name, type, created_date, status}]
    
    metadata_json = Column(JSON, default=dict)
    is_deleted = Column(Boolean, default=False)
    
    vendor_ref = relationship("Vendor", back_populates="personnel")

class VendorContract(Base, BaseMixin):
    __tablename__ = "vendor_contracts"
    vendor_id = Column(Integer, ForeignKey("vendors.id", ondelete="CASCADE"))
    title = Column(String, index=True)
    contract_id = Column(String, index=True)
    effective_date = Column(DateTime)
    expiry_date = Column(DateTime)
    
    # Details
    covered_assets = Column(JSON, default=list) # [{device_id, support_type}]
    scope_of_work = Column(JSON, default=list) # [{deliverable, when, response_time, objective}]
    schedule = Column(JSON, default=dict) # {work_schedule, holiday_policy}
    document_link = Column(String)
    
    metadata_json = Column(JSON, default=dict)
    is_deleted = Column(Boolean, default=False)
    
    vendor_ref = relationship("Vendor", back_populates="contracts")

# --- NEW KNOWLEDGE BASE MODULE ---

class KnowledgeEntry(Base, BaseMixin):
    __tablename__ = "knowledge_entries"
    category = Column(String, index=True) # Q&A, Manual, Instruction, FAQ, Best Practice, BKM
    title = Column(String, index=True)
    content = Column(Text) # Markdown or Rich Text
    
    # Structured BKM (Best Known Method) Data
    # For BKM: { purpose, prerequisites: [], flowchart_data, steps: [], tips: [], troubleshooting: [], next_steps: [] }
    content_json = Column(JSON, default=dict) 
    
    # Q&A specific fields
    question_context = Column(Text) # Original problem description
    is_answered = Column(Boolean, default=False)
    verified_by = Column(String)
    
    # Relations & Metadata
    tags = Column(JSON, default=list) # ["Network", "Database", "Vendor:Dell"]
    impacted_systems = Column(JSON, default=list) # List of system names
    linked_device_ids = Column(JSON, default=list) # Multi-select assets
    
    is_deleted = Column(Boolean, default=False)
    metadata_json = Column(JSON, default=dict)

# --- NEW FAR (FAILURE ANALYSIS & RESOLUTION) MODULE ---

# Many-to-Many Join Tables for FAR
far_mode_assets = Table(
    "far_mode_assets", Base.metadata,
    Column("mode_id", Integer, ForeignKey("far_failure_modes.id", ondelete="CASCADE")),
    Column("device_id", Integer, ForeignKey("devices.id", ondelete="CASCADE"))
)

far_mode_causes = Table(
    "far_mode_causes", Base.metadata,
    Column("mode_id", Integer, ForeignKey("far_failure_modes.id", ondelete="CASCADE")),
    Column("cause_id", Integer, ForeignKey("far_failure_causes.id", ondelete="CASCADE"))
)

far_cause_resolutions = Table(
    "far_cause_resolutions", Base.metadata,
    Column("cause_id", Integer, ForeignKey("far_failure_causes.id", ondelete="CASCADE")),
    Column("resolution_id", Integer, ForeignKey("far_resolutions.id", ondelete="CASCADE"))
)

far_mode_mitigations = Table(
    "far_mode_mitigations", Base.metadata,
    Column("mode_id", Integer, ForeignKey("far_failure_modes.id", ondelete="CASCADE")),
    Column("mitigation_id", Integer, ForeignKey("far_mitigations.id", ondelete="CASCADE"))
)

# Join table for RcaRecord <-> FarFailureMode N:N relationship
rca_failure_mode_links = Table(
    "rca_failure_mode_links", Base.metadata,
    Column("rca_id", Integer, ForeignKey("rca_records.id", ondelete="CASCADE")),
    Column("failure_mode_id", Integer, ForeignKey("far_failure_modes.id", ondelete="CASCADE"))
)

class FarFailureMode(Base, BaseMixin):
    __tablename__ = "far_failure_modes"
    system_name = Column(String, index=True)
    failure_type = Column(String, default="Design")
    title = Column(String, index=True)
    effect = Column(Text)
    
    # FMEA Indices
    severity = Column(Integer, default=1)
    occurrence = Column(Integer, default=1)
    detection = Column(Integer, default=1)
    rpn = Column(Integer, default=1)
    
    # Status: Analyzing, Cause Identified, Resolution Identified, Mitigated, Eliminated
    status = Column(String, default="Analyzing")
    has_incident_history = Column(Boolean, default=False)
    
    is_deleted = Column(Boolean, default=False)
    metadata_json = Column(JSON, default=dict)

    # Relationships
    affected_assets = relationship("Device", secondary=far_mode_assets)
    causes = relationship("FarFailureCause", secondary=far_mode_causes, back_populates="failure_modes")
    mitigations = relationship("FarMitigation", secondary=far_mode_mitigations)
    prevention_actions = relationship("FarPrevention", back_populates="failure_mode", cascade="all, delete-orphan")
    linked_rcas = relationship("RcaRecord", secondary=rca_failure_mode_links, back_populates="linked_failure_modes")

class FarFailureCause(Base, BaseMixin):
    __tablename__ = "far_failure_causes"
    cause_text = Column(Text)
    occurrence_level = Column(Integer, default=1)
    responsible_team = Column(String)
    
    failure_modes = relationship("FarFailureMode", secondary=far_mode_causes, back_populates="causes")
    resolutions = relationship("FarResolution", secondary=far_cause_resolutions)

class FarResolution(Base, BaseMixin):
    __tablename__ = "far_resolutions"
    # Links to a KnowledgeEntry (BKM)
    knowledge_id = Column(Integer, ForeignKey("knowledge_entries.id", ondelete="SET NULL"), nullable=True)
    preventive_follow_up = Column(Text)
    responsible_team = Column(String)
    
    knowledge_bkm = relationship("KnowledgeEntry")

class FarMitigation(Base, BaseMixin):
    __tablename__ = "far_mitigations"
    # Types: Monitoring, Workaround, Process Change
    mitigation_type = Column(String) 
    mitigation_steps = Column(Text)
    responsible_team = Column(String)
    
    # Link to a specific Monitoring Item if type is 'Monitoring'
    monitoring_item_id = Column(Integer, ForeignKey("monitoring_items.id", ondelete="SET NULL"), nullable=True)
    monitoring_item = relationship("MonitoringItem")

class FarPrevention(Base, BaseMixin):
    __tablename__ = "far_prevention"
    failure_mode_id = Column(Integer, ForeignKey("far_failure_modes.id", ondelete="CASCADE"))
    prevention_action = Column(Text)
    status = Column(String, default="Open") # Open, In Progress, Verified, Completed
    target_date = Column(DateTime, nullable=True)
    responsible_team = Column(String)
    
    failure_mode = relationship("FarFailureMode", back_populates="prevention_actions")

# --- NEW INVESTIGATION MODULE (Renamed/Expanded Troubleshooting) ---

class Investigation(Base, BaseMixin):
    __tablename__ = "investigations"
    title = Column(String, index=True)
    problem_statement = Column(Text)
    category = Column(String, default="General") # General, Troubleshooting, Security, Maintenance
    research_domain = Column(String) # Added research_domain
    failure_domain = Column(String) # Added failure_domain
    
    status = Column(String, default="Analyzing") # Analyzing, Escalated, Monitoring, Resolved, Closed
    priority = Column(String, default="Medium") # Urgent, High, Medium, Low
    
    # Context
    systems = Column(JSON, default=list)
    impacted_device_ids = Column(JSON, default=list)
    assigned_team = Column(String)
    
    # Forensics & Troubleshooting Details
    impact = Column(Text)
    trigger_event = Column(Text)
    root_cause = Column(Text)
    resolution_steps = Column(Text)
    mitigation_items = Column(JSON, default=list) # List of actions taken to mitigate
    prevention_method = Column(Text)
    monitoring_items = Column(JSON, default=list) # Items to monitor after resolution
    lessons_learned = Column(Text)
    
    # Optional timing
    initiation_at = Column(DateTime, nullable=True)
    
    is_deleted = Column(Boolean, default=False)
    metadata_json = Column(JSON, default=dict)
    
    progress_logs = relationship("InvestigationProgress", back_populates="investigation", cascade="all, delete-orphan")

class InvestigationProgress(Base, BaseMixin):
    __tablename__ = "investigation_progress"
    investigation_id = Column(Integer, ForeignKey("investigations.id", ondelete="CASCADE"))
    entry_text = Column(Text)
    entry_type = Column(String, default="Update") # Update, Diagnosis, Action, Observation, Milestone
    poc = Column(String) # Point of Contact/Person who did it
    
    added_by = Column(String)
    timestamp = Column(DateTime, server_default=func.now())
    
    metadata_json = Column(JSON, default=dict) # To store links to files/images
    
    investigation = relationship("Investigation", back_populates="progress_logs")

class Project(Base, BaseMixin):
    __tablename__ = "projects"
    name = Column(String, index=True)
    description = Column(Text)
    status = Column(String, default="Planning") # Planning, In Progress, On Hold, Completed, Cancelled
    priority = Column(String, default="Medium") # Low, Medium, High, Critical
    start_date = Column(DateTime)
    end_date = Column(DateTime)
    owner = Column(String)
    team_members = Column(JSON, default=list) # List of names/IDs
    budget = Column(Float, default=0.0)
    currency = Column(String, default="USD")
    
    # Gantt/Timeline data
    tasks_json = Column(JSON, default=list) # [{id, name, start, end, progress, dependencies: []}]
    
    # Resources/Assets linked to project
    linked_device_ids = Column(JSON, default=list)
    linked_service_ids = Column(JSON, default=list)
    
    # Innovative Visuals Metadata
    milestones_json = Column(JSON, default=list) # [{name, date, status}]
    risk_assessment = Column(Text)
    kpis_json = Column(JSON, default=dict) # {target_uptime: 99.9, etc}
    
    metadata_json = Column(JSON, default=dict)
    is_deleted = Column(Boolean, default=False)

# --- INCIDENT RCA (ROOT CAUSE ANALYSIS) MODULE ---

class RcaRecord(Base, BaseMixin):
    __tablename__ = "rca_records"
    title = Column(String, index=True)
    problem_statement = Column(Text) # Added problem statement
    trigger_source = Column(String) # e.g. "Auto Alert", "Manual Report", "Customer Escalation"
    severity = Column(String) # Auto-calculated: P1, P2, P3, P4
    priority = Column(Integer, default=1) # 1-10 priority gauge
    severity_logic = Column(JSON, default=dict) # { flow_halted: bool, scrap_risk: bool, etc }
    initial_symptoms = Column(Text)
    
    # Timing & Ownership
    occurrence_at = Column(DateTime)
    detection_at = Column(DateTime) # Added detection_at
    acknowledged_at = Column(DateTime)
    owner = Column(String)
    owners = Column(JSON, default=list) # Added multi-owner support
    jira_link = Column(String)
    
    # Enum Classifications
    incident_type = Column(String) # Added incident_type
    detection_type = Column(String) # Added detection_type
    impact_type = Column(String) # Added impact_type
    
    # Cascading selection context
    target_system = Column(String) # Legacy field (string)
    target_systems = Column(JSON, default=list) # New multi-select field
    impacted_asset_ids = Column(JSON, default=list) # List of device IDs within that system
    impacted_service_ids = Column(JSON, default=list) # List of service IDs within those assets
    
    # FAB Impact
    fab_impact_json = Column(JSON, default=lambda: {"categories": [], "explanation": "", "severity": 1})
    
    # Investigation Flow
    identification_steps_json = Column(JSON, default=list) # [{step, text, images: []}]
    rca_steps_json = Column(JSON, default=list) # [{step, text, images: []}]
    potential_causes_json = Column(JSON, default=list) # [{cause, indicator, bkm_id, status}]
    
    narrative_summary = Column(Text) # Step-by-step narrative
    evidence_json = Column(JSON, default=list) # [{ type: 'image|log|text', content: '...', timestamp: '...' }]
    mitigation_logs_json = Column(JSON, default=list) # [{type, description, status, timestamp, images: []}]
    
    # Resolution Logic
    cause_of_failure = Column(Text)
    signature_indicator = Column(Text) # The specific log/metric that confirms the failure
    
    # External Hooks
    knowledge_id = Column(Integer, ForeignKey("knowledge_entries.id", ondelete="SET NULL"), nullable=True)
    monitoring_item_id = Column(Integer, ForeignKey("monitoring_items.id", ondelete="SET NULL"), nullable=True)
    
    status = Column(String, default="Open") # Open, Investigation, Resolved, Closed
    is_deleted = Column(Boolean, default=False)
    metadata_json = Column(JSON, default=dict)

    # Relationships
    timeline = relationship("RcaTimelineEvent", back_populates="rca", cascade="all, delete-orphan")
    mitigations = relationship("RcaMitigation", back_populates="rca", cascade="all, delete-orphan")
    knowledge_bkm = relationship("KnowledgeEntry")
    monitoring_config = relationship("MonitoringItem")
    linked_failure_modes = relationship("FarFailureMode", secondary=rca_failure_mode_links, back_populates="linked_rcas")

class RcaTimelineEvent(Base, BaseMixin):
    __tablename__ = "rca_timeline_events"
    rca_id = Column(Integer, ForeignKey("rca_records.id", ondelete="CASCADE"))
    event_time = Column(DateTime)
    event_type = Column(String) # e.g. "Detection", "Mitigation", "Observation", "Resolution"
    description = Column(Text)
    owner = Column(String) # Added owner
    owner_team = Column(String) # Added owner_team
    involved_pocs = Column(JSON, default=list) # List of names/IDs
    images = Column(JSON, default=list) # Added images support
    
    rca = relationship("RcaRecord", back_populates="timeline")

class RcaMitigation(Base, BaseMixin):
    __tablename__ = "rca_mitigations"
    rca_id = Column(Integer, ForeignKey("rca_records.id", ondelete="CASCADE"))
    type = Column(String) # Preventive, Workaround, Mitigation
    action_description = Column(Text)
    status = Column(String, default="Planned") # Planned, In Progress, Verified, Completed
    
    rca = relationship("RcaRecord", back_populates="mitigations")

