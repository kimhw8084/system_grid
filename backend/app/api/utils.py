from datetime import datetime

def filter_valid_columns(model, data):
    valid_keys = {c.name for c in model.__table__.columns}
    exclude = {"id", "created_at", "updated_at", "created_by_user_id"}
    return {k: v for k, v in data.items() if k in valid_keys and k not in exclude}

def parse_iso_date(val):
    if not val: return None
    if isinstance(val, datetime): return val
    try: 
        return datetime.fromisoformat(val.replace("Z", "+00:00"))
    except: 
        return None
