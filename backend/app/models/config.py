from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, UniqueConstraint, Index, text
from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy.sql import func
import os

ConfigBase = declarative_base()

class MasterBaseMixin:
    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

class Tenant(ConfigBase, MasterBaseMixin):
    __tablename__ = "tenants"
    name = Column(String, unique=True, index=True)
    db_url = Column(String, unique=True) # Absolute path to sqlite file
    is_active = Column(Boolean, default=True)

class UserTenantAccess(ConfigBase, MasterBaseMixin):
    __tablename__ = "user_tenant_access"
    __table_args__ = (
        UniqueConstraint("user_id", "tenant_id", name="uq_user_tenant_access_user_tenant"),
        Index(
            "ix_user_tenant_access_single_selected",
            "user_id",
            unique=True,
            sqlite_where=text("is_selected = 1"),
        ),
    )
    user_id = Column(String, index=True) # LDAP ID
    tenant_id = Column(Integer, ForeignKey("tenants.id", ondelete="CASCADE"))
    role = Column(String, default="VIEWER") # ADMIN, EDITOR, VIEWER
    is_selected = Column(Boolean, default=False) # Current active selection for the user
    
    tenant = relationship("Tenant")

class MasterSystemSetting(ConfigBase, MasterBaseMixin):
    __tablename__ = "master_settings"
    key = Column(String, unique=True, index=True)
    value = Column(String)
    description = Column(String)
