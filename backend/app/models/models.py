from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey, JSON, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base

class BaseMixin:
    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())
    created_by_user_id = Column(String, nullable=True)

class Site(Base, BaseMixin):
    __tablename__ = "sites"
    name = Column(String, unique=True, index=True)
    address = Column(String)
    rooms = relationship("Room", back_populates="site", cascade="all, delete-orphan")

class Room(Base, BaseMixin):
    __tablename__ = "rooms"
    site_id = Column(Integer, ForeignKey("sites.id"))
    name = Column(String)
    site = relationship("Site", back_populates="rooms")
    racks = relationship("Rack", back_populates="room")

class Rack(Base, BaseMixin):
    __tablename__ = "racks"
    room_id = Column(Integer, ForeignKey("rooms.id"), nullable=True)
    name = Column(String)
    total_u_height = Column(Integer, default=42)
    max_power_kw = Column(Float, default=8.0)
    typical_power_kw = Column(Float, default=4.0)
    room = relationship("Room", back_populates="racks")
    device_locations = relationship("DeviceLocation", back_populates="rack", cascade="all, delete-orphan")

class Device(Base, BaseMixin):
    __tablename__ = "devices"
    name = Column(String, index=True) # Hostname
    system = Column(String, index=True) # Logical System name
    status = Column(String, default="active") # planned, active, maintenance, decommissioned, offline
    model = Column(String)
    manufacturer = Column(String)
    os = Column(String)
    type = Column(String) # physical, virtual, storage, switch
    serial_number = Column(String, unique=True, index=True)
    asset_tag = Column(String, unique=True)
    
    # Dates
    purchase_date = Column(DateTime)
    warranty_end = Column(DateTime)
    install_date = Column(DateTime)
    
    # Ownership
    owner = Column(String)
    vendor = Column(String)
    purchase_order = Column(String)
    
    # Power (Standardized keywords)
    power_max_w = Column(Float, default=0)
    power_typical_w = Column(Float, default=0)
    
    # Flexible Custom Fields
    metadata_json = Column(JSON, default=dict)
    
    locations = relationship("DeviceLocation", back_populates="device", cascade="all, delete-orphan")
    components = relationship("HardwareComponent", back_populates="device", cascade="all, delete-orphan")
    software = relationship("DeviceSoftware", back_populates="device", cascade="all, delete-orphan")
    secrets = relationship("SecretVault", back_populates="device", cascade="all, delete-orphan")
    relationships = relationship("DeviceRelationship", primaryjoin="Device.id==DeviceRelationship.source_device_id", cascade="all, delete-orphan")

class DeviceRelationship(Base, BaseMixin):
    __tablename__ = "device_relationships"
    source_device_id = Column(Integer, ForeignKey("devices.id"))
    target_device_id = Column(Integer, ForeignKey("devices.id"))
    relationship_type = Column(String) # VM Host, HA Pair, Replication, etc.
    source_role = Column(String)
    target_role = Column(String)
    notes = Column(Text)

class DeviceLocation(Base, BaseMixin):
    __tablename__ = "device_locations"
    device_id = Column(Integer, ForeignKey("devices.id"))
    rack_id = Column(Integer, ForeignKey("racks.id"))
    start_unit = Column(Integer)
    size_u = Column(Integer)
    device = relationship("Device", back_populates="locations")
    rack = relationship("Rack", back_populates="device_locations")

class HardwareComponent(Base, BaseMixin):
    __tablename__ = "hardware_components"
    device_id = Column(Integer, ForeignKey("devices.id"))
    type = Column(String) # CPU, Memory, Card, SSD, HDD, NIC
    name = Column(String)
    manufacturer = Column(String)
    specs = Column(String)
    count = Column(Integer, default=1)
    serial_number = Column(String)
    device = relationship("Device", back_populates="components")

class DeviceSoftware(Base, BaseMixin):
    __tablename__ = "device_software"
    device_id = Column(Integer, ForeignKey("devices.id"))
    category = Column(String) # OS, Driver, Application, Database, Security, Utility
    name = Column(String)
    version = Column(String)
    install_date = Column(DateTime)
    purpose = Column(String)
    notes = Column(Text)
    device = relationship("Device", back_populates="software")

class NetworkInterface(Base, BaseMixin):
    __tablename__ = "network_interfaces"
    device_id = Column(Integer, ForeignKey("devices.id"))
    name = Column(String)
    mac_address = Column(String, unique=True, index=True)
    ip_address = Column(String, index=True)
    vlan_id = Column(Integer, nullable=True)
    link_speed_gbps = Column(Integer)

class PortConnection(Base, BaseMixin):
    __tablename__ = "port_connections"
    device_a_id = Column(Integer, ForeignKey("devices.id"))
    port_a = Column(String)
    device_b_id = Column(Integer, ForeignKey("devices.id"))
    port_b = Column(String)
    purpose = Column(String)
    speed = Column(Float)
    unit = Column(String) # Gbps, Mbps
    direction = Column(String) # Bidirectional, Unidirectional

class SecretVault(Base, BaseMixin):
    __tablename__ = "secret_vault"
    device_id = Column(Integer, ForeignKey("devices.id"))
    secret_type = Column(String) # SSH, IPMI, Root, Local Admin, SNMP, API Key
    username = Column(String)
    encrypted_payload = Column(Text)
    notes = Column(Text)
    device = relationship("Device", back_populates="secrets")

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True)
    timestamp = Column(DateTime, server_default=func.now())
    user_id = Column(String)
    action = Column(String)
    table_name = Column(String)
    record_id = Column(Integer)
    old_values = Column(JSON)
    new_values = Column(JSON)
    intent_note = Column(Text)
