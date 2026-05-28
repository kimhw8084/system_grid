import os
from fastapi import Request

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
