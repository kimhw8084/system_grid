from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import pandas as pd
import io
from ..database import get_db
from ..models import models

router = APIRouter(prefix="/import", tags=["Intelligence Engine"])

@router.get("/template")
def download_template():
    """
    Innovative Unified Template covering:
    Servers (1:1), Hardware (1:N), Software (1:N)
    """
    df = pd.DataFrame(columns=[
        "hostname", "system_name", "status", "model", "manufacturer", "os", "type", 
        "serial_number", "asset_tag", "power_max", "power_idle",
        "hw_type", "hw_model", "hw_spec", "hw_serial",
        "sw_name", "sw_version", "sw_category"
    ])
    # Add a sample row
    df.loc[0] = ["SRV-001", "ERP-CORE", "active", "R740", "Dell", "Ubuntu 22.04", "physical", "SN123", "AT456", 750, 300, "CPU", "Gold 6130", "2.1GHz", "CPUSN", "Docker", "24.0.7", "Runtime"]
    
    stream = io.BytesIO()
    df.to_csv(stream, index=False)
    stream.seek(0)
    
    return StreamingResponse(
        stream, 
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=SYSGRID_Ingestion_Template.csv"}
    )

@router.post("/csv")
async def import_from_csv(file: UploadFile = File(...), db: Session = Depends(get_db)):
    content = await file.read()
    try:
        df = pd.read_csv(io.BytesIO(content))
        for _, row in df.iterrows():
            # 1. Create/Get System (if column exists)
            # For MVP, we'll focus on Device creation
            device_data = {
                "name": str(row.get("hostname", "Unknown")),
                "status": str(row.get("status", "active")),
                "model": str(row.get("model", "Unknown")),
                "manufacturer": str(row.get("manufacturer", "Unknown")),
                "serial_number": str(row.get("serial_number", "SN-" + str(id(row)))),
                "asset_tag": str(row.get("asset_tag", "AT-" + str(id(row)))),
                "power_max_w": float(row.get("power_max", 0)),
                "power_idle_w": float(row.get("power_idle", 0)),
            }
            db_device = models.Device(**device_data)
            db.add(db_device)
            db.flush() # Get device ID
            
            # 2. Add Hardware (if provided in row)
            if not pd.isna(row.get("hw_type")):
                hw = models.HardwareComponent(
                    device_id=db_device.id,
                    type=row["hw_type"],
                    model=row.get("hw_model"),
                    serial_number=row.get("hw_serial")
                )
                db.add(hw)
        
        db.commit()
        return {"status": "success", "count": len(df)}
    except Exception as e:
        db.rollback()
        raise HTTPException(400, detail=str(e))
