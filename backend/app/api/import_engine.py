from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
import pandas as pd
import io
from ..database import get_db
from ..models import models
from ..schemas import schemas

router = APIRouter(prefix="/import", tags=["Intelligence Engine"])

@router.post("/csv")
async def import_from_csv(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """
    Presidential Intelligence Engine: 
    High-speed, fuzzy-matching CSV parser for 0ms Manual Entry.
    """
    content = await file.read()
    try:
        # Detect format and load
        df = pd.read_csv(io.BytesIO(content))
        
        imported_count = 0
        for _, row in df.iterrows():
            # Basic fuzzy mapping: name/hostname, serial/sn, model, manufacturer
            try:
                device_data = {
                    "name": str(row.get("name", row.get("hostname", "Unknown"))),
                    "status": "active",
                    "model": str(row.get("model", "Unknown")),
                    "manufacturer": str(row.get("manufacturer", "System")),
                    "serial_number": str(row.get("serial_number", row.get("sn", "SN-" + str(imported_count)))),
                    "asset_tag": str(row.get("asset_tag", "AT-" + str(imported_count))),
                    "power_max_w": float(row.get("power_max", 0)),
                    "power_idle_w": float(row.get("power_idle", 0)),
                }
                db_device = models.Device(**device_data)
                db.add(db_device)
                imported_count += 1
            except Exception:
                continue
                
        db.commit()
        return {"status": "success", "imported_count": imported_count}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse CSV: {str(e)}")
