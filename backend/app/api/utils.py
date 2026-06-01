import os
from fastapi import Request
from datetime import datetime

def get_current_user_id(request: Request = None):
    """
    Unified utility to identify the current user.
    Prioritizes the X-User-Id header (set by frontend) 
    and falls back to the system's USER_ID environment variable.
    """
    user_id = None
    
    # 1. Check Request Headers (Inject by Cloud Proxy or Frontend)
    if request:
        user_id = request.headers.get("X-User-Id")
    
    # 2. Fallback to Environment Variable (Default identity)
    if not user_id:
        user_id = os.getenv("USER_ID", "admin_root")
        
    return user_id

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
