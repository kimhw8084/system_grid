from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey, JSON, Text
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
    name = Column(String, index=True)
    address = Column(String)
    facility_manager = Column(String)
    contact_phone = Column(String)
    cooling_capacity_kw = Column(Float, default=0.0)
    power_capacity_kw = Column(Float, default=0.0)
    rooms = relationship("Room", back_populates="site", cascade="all, delete-orphan")

class Room(Base, BaseMixin):
    __tablename__ = "rooms"
    site_id = Column(Integer, ForeignKey("sites.id"))
    name = Column(String)
    floor_level = Column(String)
    hvac_zone = Column(String)
    fire_suppression_type = Column(String)
    site = relationship("Site", back_populates="rooms")
    racks = relationship("Rack", back_populates="room", cascade="all, delete-orphan")

class Rack(Base, BaseMixin):
    __tablename__ = "racks"
    room_id = Column(Integer, ForeignKey("rooms.id"), nullable=True)
    name = Column(String, index=True)
    total_u_height = Column(Integer, default=42)
    max_power_kw = Column(Float, default=8.0)
    typical_power_kw = Column(Float, default=4.0)
    max_weight_kg = Column(Float, default=1000.0)
    cooling_type = Column(String)
    pdu_a_id = Column(String)
    pdu_b_id = Column(String)
    room = relationship("Room", back_populates="racks")
    device_locations = relationship("DeviceLocation", back_populates="rack", cascade="all, delete-orphan")

class Device(Base, BaseMixin):
    __tablename__ = "devices"
    name = Column(String, index=True) # Hostname (Removed unique)
    system = Column(String, index=True) # Logical System name
    environment = Column(String, default="Production")
    status = Column(String, default="Active")
    type = Column(String) # Physical, Virtual, Storage, Switch
    
    manufacturer = Column(String)
    model = Column(String)
    serial_number = Column(String, index=True) # Removed unique
    asset_tag = Column(String, index=True)
    part_number = Column(String)
    
    os_name = Column(String)
    os_version = Column(String)
    management_ip = Column(String)
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
    
    power_supply_count = Column(Integer, default=2)
    power_max_w = Column(Float, default=0.0)
    power_typical_w = Column(Float, default=0.0)
    btu_hr = Column(Float, default=0.0)
    
    tool_group = Column(String)
    fab_area = Column(String)
    recipe_critical = Column(Boolean, default=False)
    
    metadata_json = Column(JSON, default=dict)
    
    locations = relationship("DeviceLocation", back_populates="device", cascade="all, delete-orphan")
    components = relationship("HardwareComponent", back_populates="device", cascade="all, delete-orphan")
    software = relationship("DeviceSoftware", back_populates="device", cascade="all, delete-orphan")
    secrets = relationship("SecretVault", back_populates="device", cascade="all, delete-orphan")
    relationships = relationship("DeviceRelationship", primaryjoin="Device.id==DeviceRelationship.source_device_id", cascade="all, delete-orphan")
    interfaces = relationship("NetworkInterface", back_populates="device", cascade="all, delete-orphan")
    maintenance_windows = relationship("MaintenanceWindow", back_populates="device", cascade="all, delete-orphan")
    logical_services = relationship("LogicalService", back_populates="device", cascade="all, delete-orphan")

class LogicalService(Base, BaseMixin):
    __tablename__ = "logical_services"
    device_id = Column(Integer, ForeignKey("devices.id", ondelete="CASCADE"), nullable=True) # Nullable if service is floating/clustered
    name = Column(String, index=True) # Service Name
    service_type = Column(String, index=True) # Database, Web, Middleware, Container, ToolStack, Other
    status = Column(String, default="Running") # Running, Stopped, Critical, Maintenance
    version = Column(String)
    environment = Column(String, default="Production")
    
    # Exaustive Predefined Schemas stored in JSON for maximum flexibility + strict UI enforcement
    # For Database: { engine, instance_name, port, sid, collation, always_on, data_path, backup_policy }
    # For Web: { server_type, url, bindings, app_pool, ssl_expiry, root_path }
    config_json = Column(JSON, default=dict)
    
    # Smart Expandability: Unlimited custom key-values
    custom_attributes = Column(JSON, default=dict)
    
    device = relationship("Device", back_populates="logical_services")

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
    orientation = Column(String, default="Front")
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
    device = relationship("Device", back_populates="interfaces")

class PortConnection(Base, BaseMixin):
    __tablename__ = "port_connections"
    source_device_id = Column(Integer, ForeignKey("devices.id", ondelete="CASCADE"))
    source_port = Column(String)
    target_device_id = Column(Integer, ForeignKey("devices.id", ondelete="CASCADE"))
    target_port = Column(String)
    purpose = Column(String)
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
    category = Column(String, index=True) # LogicalSystem, DeviceType, etc.
    label = Column(String)
    value = Column(String)
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
