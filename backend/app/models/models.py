from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey, JSON, Text, Enum
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
    name = Column(String, unique=True, index=True)
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
    max_weight_kg = Column(Float, default=1000.0)
    cooling_type = Column(String) # Air, Liquid, Rear-Door
    pdu_a_id = Column(String)
    pdu_b_id = Column(String)
    
    room = relationship("Room", back_populates="racks")
    device_locations = relationship("DeviceLocation", back_populates="rack", cascade="all, delete-orphan")

class Device(Base, BaseMixin):
    __tablename__ = "devices"
    name = Column(String, index=True, unique=True) # Hostname
    system = Column(String, index=True) # Logical System / Cluster
    environment = Column(String, default="Production") # Prod, Dev, QA, DR
    status = Column(String, default="Active") # Planned, Active, Maintenance, Decommissioned, Offline, Quarantined
    type = Column(String) # Server, Storage, Switch, Router, Firewall, Appliance, PDU
    
    # Hardware/Model
    manufacturer = Column(String)
    model = Column(String)
    serial_number = Column(String, unique=True, index=True)
    asset_tag = Column(String, unique=True, index=True)
    part_number = Column(String)
    
    # OS & Management
    os_name = Column(String)
    os_version = Column(String)
    management_ip = Column(String) # iLO, iDRAC, CIMC
    management_url = Column(String)
    
    # Financial & Sustaining
    owner = Column(String)
    business_unit = Column(String)
    vendor = Column(String)
    purchase_order = Column(String)
    cost_center = Column(String)
    purchase_date = Column(DateTime, nullable=True)
    install_date = Column(DateTime, nullable=True)
    warranty_end = Column(DateTime, nullable=True)
    eol_date = Column(DateTime, nullable=True)
    
    # Power & Thermal
    power_supply_count = Column(Integer, default=2)
    power_max_w = Column(Float, default=0.0)
    power_typical_w = Column(Float, default=0.0)
    btu_hr = Column(Float, default=0.0)
    
    # Metrology Specifics
    tool_group = Column(String)
    fab_area = Column(String)
    recipe_critical = Column(Boolean, default=False)
    
    metadata_json = Column(JSON, default=dict)
    
    locations = relationship("DeviceLocation", back_populates="device", cascade="all, delete-orphan")
    components = relationship("HardwareComponent", back_populates="device", cascade="all, delete-orphan")
    software = relationship("DeviceSoftware", back_populates="device", cascade="all, delete-orphan")
    secrets = relationship("SecretVault", back_populates="device", cascade="all, delete-orphan")
    interfaces = relationship("NetworkInterface", back_populates="device", cascade="all, delete-orphan")
    maintenance_windows = relationship("MaintenanceWindow", back_populates="device", cascade="all, delete-orphan")

class DeviceRelationship(Base, BaseMixin):
    __tablename__ = "device_relationships"
    source_device_id = Column(Integer, ForeignKey("devices.id", ondelete="CASCADE"))
    target_device_id = Column(Integer, ForeignKey("devices.id", ondelete="CASCADE"))
    relationship_type = Column(String) # VM Host, HA Pair, Replication, Load Balancer
    source_role = Column(String)
    target_role = Column(String)
    notes = Column(Text)

class DeviceLocation(Base, BaseMixin):
    __tablename__ = "device_locations"
    device_id = Column(Integer, ForeignKey("devices.id", ondelete="CASCADE"))
    rack_id = Column(Integer, ForeignKey("racks.id", ondelete="CASCADE"))
    start_unit = Column(Integer)
    size_u = Column(Integer)
    orientation = Column(String, default="Front") # Front, Rear, Internal
    
    device = relationship("Device", back_populates="locations")
    rack = relationship("Rack", back_populates="device_locations")

class HardwareComponent(Base, BaseMixin):
    __tablename__ = "hardware_components"
    device_id = Column(Integer, ForeignKey("devices.id", ondelete="CASCADE"))
    category = Column(String) # CPU, RAM, GPU, NVMe, HDD, NIC, HBA, PSU
    manufacturer = Column(String)
    model = Column(String)
    capacity = Column(String) # e.g., 64GB, 2TB, 3.2GHz
    quantity = Column(Integer, default=1)
    serial_number = Column(String)
    firmware_version = Column(String)
    
    device = relationship("Device", back_populates="components")

class DeviceSoftware(Base, BaseMixin):
    __tablename__ = "device_software"
    device_id = Column(Integer, ForeignKey("devices.id", ondelete="CASCADE"))
    category = Column(String) # Database, Web Server, Agent, Metrology Tool, Driver
    name = Column(String)
    version = Column(String)
    license_key = Column(String)
    install_path = Column(String)
    service_status = Column(String) # Running, Stopped, Disabled
    purpose = Column(String)
    notes = Column(Text)
    
    device = relationship("Device", back_populates="software")

class NetworkInterface(Base, BaseMixin):
    __tablename__ = "network_interfaces"
    device_id = Column(Integer, ForeignKey("devices.id", ondelete="CASCADE"))
    port_name = Column(String) # eth0, eno1, vmnic0
    mac_address = Column(String, unique=True, index=True, nullable=True)
    ip_address = Column(String, index=True, nullable=True)
    subnet_mask = Column(String)
    gateway = Column(String)
    vlan_id = Column(Integer)
    speed_mbps = Column(Integer)
    mtu = Column(Integer, default=1500)
    state = Column(String, default="Up")
    
    device = relationship("Device", back_populates="interfaces")

class PortConnection(Base, BaseMixin):
    __tablename__ = "port_connections"
    source_device_id = Column(Integer, ForeignKey("devices.id", ondelete="CASCADE"))
    source_port = Column(String)
    target_device_id = Column(Integer, ForeignKey("devices.id", ondelete="CASCADE"))
    target_port = Column(String)
    cable_type = Column(String) # OM4, DAC, Twinax, Cat6
    cable_color = Column(String)
    cable_id = Column(String)
    speed_gbps = Column(Float)
    purpose = Column(String) # Data, Mgmt, Storage, vMotion, Heartbeat
    status = Column(String, default="Connected")
    direction = Column(String, default="Bidirectional")

class SecretVault(Base, BaseMixin):
    __tablename__ = "secret_vault"
    device_id = Column(Integer, ForeignKey("devices.id", ondelete="CASCADE"))
    credential_type = Column(String) # SSH, IPMI, Root, Database, API Key, LDAP Bind
    username = Column(String)
    encrypted_payload = Column(Text)
    key_file_path = Column(String)
    notes = Column(Text)
    
    device = relationship("Device", back_populates="secrets")

class IPAM_Subnet(Base, BaseMixin):
    __tablename__ = "ipam_subnets"
    network_cidr = Column(String, unique=True, index=True) # e.g., 10.10.0.0/24
    vlan_id = Column(Integer)
    name = Column(String)
    gateway = Column(String)
    dns_servers = Column(String)
    domain = Column(String)
    purpose = Column(String)

class MaintenanceWindow(Base, BaseMixin):
    __tablename__ = "maintenance_windows"
    device_id = Column(Integer, ForeignKey("devices.id", ondelete="CASCADE"))
    title = Column(String)
    start_time = Column(DateTime)
    end_time = Column(DateTime)
    ticket_number = Column(String)
    coordinator = Column(String)
    status = Column(String) # Scheduled, In Progress, Completed, Cancelled
    
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
