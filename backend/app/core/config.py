from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List
import os

class Settings(BaseSettings):
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "SYSGRID Production API"
    
    # Environment
    ENVIRONMENT: str = "production"  # development, production, test
    PORT: int = 8000
    
    # CORS Origins (comma-separated string converted to list)
    BACKEND_CORS_ORIGINS: List[str] = ["*"]

    # Deployment/runtime configuration
    DATABASE_URL: str = ""
    CONFIG_DATABASE_URL: str = ""
    TENANT_STORAGE_ROOT: str = ""
    BACKEND_ENV_FILE_PATH: str = ""
    FRONTEND_ENV_FILE_PATH: str = ""
    DEFAULT_TENANT_NAME: str = "Default Engine"
    DEFAULT_USER_ID: str = "admin_root"
    AUTO_ADMIN_USER_IDS: str = "admin_root"
    DEFAULT_OPERATOR_DEPARTMENT: str = "Infrastructure"
    DEFAULT_SUPPORT_EMAIL: str = "admin@infra.local"
    DEFAULT_EMAIL_DOMAIN: str = "sysgrid.local"
    DEFAULT_ORG_NAME: str = "Global Infrastructure Corp"
    DEFAULT_SITE_ID: str = "HQ-01"
    DEFAULT_APP_NAME: str = "SYSGRID ENGINE"
    DEFAULT_UI_TITLE: str = "SYSGRID Tactical"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )

    def model_post_init(self, __context) -> None:
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        frontend_dir = os.path.join(os.path.dirname(base_dir), "frontend")
        if not self.DATABASE_URL:
            object.__setattr__(self, "DATABASE_URL", f"sqlite+aiosqlite:///{os.path.join(base_dir, 'system_grid.db')}")
        if not self.CONFIG_DATABASE_URL:
            object.__setattr__(self, "CONFIG_DATABASE_URL", f"sqlite+aiosqlite:///{os.path.join(base_dir, 'config.db')}")
        if not self.TENANT_STORAGE_ROOT:
            object.__setattr__(self, "TENANT_STORAGE_ROOT", os.path.join(base_dir, "tenants"))
        if not self.BACKEND_ENV_FILE_PATH:
            object.__setattr__(self, "BACKEND_ENV_FILE_PATH", os.path.join(base_dir, ".env"))
        if not self.FRONTEND_ENV_FILE_PATH:
            object.__setattr__(self, "FRONTEND_ENV_FILE_PATH", os.path.join(frontend_dir, ".env"))

    @property
    def auto_admin_user_ids(self) -> set[str]:
        return {
            user_id.strip()
            for user_id in self.AUTO_ADMIN_USER_IDS.split(",")
            if user_id.strip()
        }

    def is_auto_admin_user(self, user_id: str | None) -> bool:
        return bool(user_id and user_id in self.auto_admin_user_ids)

settings = Settings()
