import os
from fastapi import Request
from datetime import datetime
from ..core.config import settings
from ..models import models


def normalize_json_object(value):
    if not isinstance(value, dict):
        return {}
    normalized = {}
    for key in sorted(value.keys(), key=lambda item: str(item).lower()):
        if not isinstance(key, str):
            continue
        normalized[key] = normalize_json_value(value[key])
    return normalized


def normalize_json_list(value):
    if not isinstance(value, list):
        return []
    return [normalize_json_value(item) for item in value]


def normalize_json_value(value):
    if isinstance(value, dict):
        return normalize_json_object(value)
    if isinstance(value, list):
        return normalize_json_list(value)
    if isinstance(value, (str, int, float, bool)) or value is None:
        return value
    return str(value)

def get_current_user_id(request: Request = None):
    """
    Unified utility to identify the current user.
    Prioritizes the X-User-Id header (set by frontend) 
    and falls back to the system's user_name or USER_ID environment variable.
    """
    user_id = None
    
    # 1. Check Request Headers (Inject by Cloud Proxy or Frontend)
    if request:
        user_id = request.headers.get("X-User-Id")
    
    # 2. Fallback to Environment Variable (Default identity)
    if not user_id:
        configured_env_user = os.getenv(settings.USER_ID_ENV_VAR, "")
        user_id = (
            os.getenv("user_name")
            or configured_env_user
            or os.getenv("USER_ID")
            or settings.DEFAULT_USER_ID
        )
        
    return user_id


def get_audit_actor(request: Request = None, fallback: str | None = None):
    return get_current_user_id(request) or fallback or settings.DEFAULT_USER_ID


def build_audit_log(
    *,
    request: Request = None,
    action: str,
    target_table: str,
    target_id: str | None = None,
    description: str | None = None,
    changes: dict | None = None,
    fallback_actor: str | None = None,
):
    return models.AuditLog(
        user_id=get_audit_actor(request, fallback=fallback_actor),
        action=action,
        target_table=target_table,
        target_id=target_id,
        description=description,
        changes=normalize_json_object(changes or {}),
    )

def filter_valid_columns(model, data: dict, exclude: set | None = None):
    """
    Filters a dictionary to only include keys that are valid columns for a given SQLAlchemy model.
    """
    from sqlalchemy import inspect
    valid_columns = {c.key for c in inspect(model).mapper.column_attrs}
    excluded = exclude or set()
    return {k: v for k, v in data.items() if k in valid_columns and k not in excluded}

def parse_iso_date(date_str: str):
    """
    Safely parses an ISO date string into a datetime object.
    """
    if not date_str:
        return None
    try:
        # Handle cases with 'Z' or offset
        clean_str = date_str.replace('Z', '+00:00')
        return datetime.fromisoformat(clean_str)
    except (ValueError, TypeError):
        return None
