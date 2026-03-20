from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey, JSON, Enum as SQLEnum, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base
import enum

class DeviceStatus(enum.Enum):
    ACTIVE = "active"
    MAINTENANCE = "maintenance"
    EOL = "eol"
    PROVISIONING = "provisioning"

class ComponentType(enum.Enum):
    CPU = "cpu"
    RAM = "ram"
    DISK = "disk"
    NIC = "nic"
    GPU = "gpu"

class BaseMixin:
    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())
    created_by_user_id = Column(String, nullable=True)

# 1. Sites
class Site(Base, BaseMixin):
    __tablename__ = "sites"
    name = Column(String, unique=True, index=True)
    address = Column(String)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    rooms = relationship("Room", back_populates="site")

# 2. Rooms
class Room(Base, BaseMixin):
    __tablename__ = "rooms"
    site_id = Column(Integer, ForeignKey("sites.id"))
    name = Column(String)
    floor_plan_data = Column(JSON, nullable=True)
    site = relationship("Site", back_populates="rooms")
    racks = relationship("Rack", back_populates="room")

# 3. Racks
class Rack(Base, BaseMixin):
    __tablename__ = "racks"
    room_id = Column(Integer, ForeignKey("rooms.id"))
    name = Column(String)
    total_u_height = Column(Integer, default=42)
    max_power_kw = Column(Float)
    weight_limit_kg = Column(Float)
    u_pitch_mm = Column(Float, default=44.45)
    room = relationship("Room", back_populates="racks")
    device_locations = relationship("DeviceLocation", back_populates="rack")

# 4. Devices
class Device(Base, BaseMixin):
    __tablename__ = "devices"
    name = Column(String, index=True)
    status = Column(SQLEnum(DeviceStatus), default=DeviceStatus.ACTIVE)
    model = Column(String)
    manufacturer = Column(String)
    serial_number = Column(String, unique=True, index=True)
    asset_tag = Column(String, unique=True)
    power_max_w = Column(Float)
    power_idle_w = Column(Float)
    maintenance_mode = Column(Boolean, default=False)
    metadata_json = Column(JSON, nullable=True)
    
    locations = relationship("DeviceLocation", back_populates="device")
    components = relationship("HardwareComponent", back_populates="device")
    interfaces = relationship("NetworkInterface", back_populates="device")
    secrets = relationship("SecretVault", back_populates="device")

# 5. DeviceLocations
class DeviceLocation(Base, BaseMixin):
    __tablename__ = "device_locations"
    device_id = Column(Integer, ForeignKey("devices.id"))
    rack_id = Column(Integer, ForeignKey("racks.id"))
    start_unit = Column(Integer)
    size_u = Column(Integer)
    device = relationship("Device", back_populates="locations")
    rack = relationship("Rack", back_populates="device_locations")

# 6. HardwareComponents
class HardwareComponent(Base, BaseMixin):
    __tablename__ = "hardware_components"
    device_id = Column(Integer, ForeignKey("devices.id"))
    type = Column(SQLEnum(ComponentType))
    model = Column(String)
    specs = Column(JSON)
    serial_number = Column(String, unique=True)
    device = relationship("Device", back_populates="components")

# 7. NetworkInterfaces
class NetworkInterface(Base, BaseMixin):
    __tablename__ = "network_interfaces"
    device_id = Column(Integer, ForeignKey("devices.id"))
    name = Column(String)
    mac_address = Column(String, unique=True, index=True)
    ip_address = Column(String, index=True)
    vlan_id = Column(Integer, nullable=True)
    link_speed_gbps = Column(Integer)
    device = relationship("Device", back_populates="interfaces")

# 8. LogicalCables
class LogicalCable(Base, BaseMixin):
    __tablename__ = "logical_cables"
    source_interface_id = Column(Integer, ForeignKey("network_interfaces.id"))
    target_interface_id = Column(Integer, ForeignKey("network_interfaces.id"))
    cable_type = Column(String)
    length_m = Column(Float)

# 9. VLANs
class VLAN(Base, BaseMixin):
    __tablename__ = "vlans"
    vlan_id = Column(Integer, unique=True)
    name = Column(String)
    subnet = Column(String)
    gateway = Column(String)

# 10. RBAC_Roles
class RBACRole(Base, BaseMixin):
    __tablename__ = "rbac_roles"
    name = Column(String, unique=True)
    permissions = Column(JSON) # List of permission strings

# 11. SecretVault
class SecretVault(Base, BaseMixin):
    __tablename__ = "secret_vault"
    device_id = Column(Integer, ForeignKey("devices.id"))
    secret_type = Column(String) # SSH, IPMI, etc.
    encrypted_payload = Column(Text)
    device = relationship("Device", back_populates="secrets")

# 12. AuditLogs (Immutable)
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

# 13. MaintenanceSchedules
class MaintenanceSchedule(Base, BaseMixin):
    __tablename__ = "maintenance_schedules"
    device_id = Column(Integer, ForeignKey("devices.id"))
    start_time = Column(DateTime)
    end_time = Column(DateTime)
    purpose = Column(String)

# 14. TelemetrySnapshots
class TelemetrySnapshot(Base):
    __tablename__ = "telemetry_snapshots"
    id = Column(Integer, primary_key=True)
    device_id = Column(Integer, ForeignKey("devices.id"))
    timestamp = Column(DateTime, server_default=func.now())
    power_w = Column(Float)
    temp_c = Column(Float)

# 15. SystemHealth
class SystemHealth(Base):
    __tablename__ = "system_health"
    id = Column(Integer, primary_key=True)
    timestamp = Column(DateTime, server_default=func.now())
    service_name = Column(String)
    status = Column(String)
    metrics = Column(JSON)

# 16. PowerCircuits
class PowerCircuit(Base, BaseMixin):
    __tablename__ = "power_circuits"
    rack_id = Column(Integer, ForeignKey("racks.id"))
    circuit_id = Column(String)
    max_amps = Column(Float)
    voltage = Column(Integer, default=220)
