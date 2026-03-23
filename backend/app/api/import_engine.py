from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.concurrency import run_in_threadpool
from sqlalchemy.ext.asyncio import AsyncSession
import pandas as pd
import io
from ..database import get_db
from ..models import models

router = APIRouter(prefix="/import", tags=["Intelligence Engine"])

@router.get("/template")
def download_template():
    df = pd.DataFrame(columns=[
        "hostname", "system_name", "status", "model", "manufacturer", "os", "type", 
        "serial_number", "asset_tag", "power_max", "power_idle",
        "hw_type", "hw_model", "hw_spec", "hw_serial",
        "sw_name", "sw_version", "sw_category"
    ])
    df.loc[0] = ["SRV-001", "ERP-CORE", "active", "R740", "Dell", "Ubuntu 22.04", "physical", "SN123", "AT456", 750, 300, "CPU", "Gold 6130", "2.1GHz", "CPUSN", "Docker", "24.0.7", "Runtime"]
    
    stream = io.BytesIO()
    df.to_csv(stream, index=False)
    stream.seek(0)
    
    return StreamingResponse(
        stream, 
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=SYSGRID_Ingestion_Template.csv"}
    )

async def process_csv(content: bytes, db: AsyncSession):
    # Run pandas in a threadpool to avoid blocking the event loop
    df = await run_in_threadpool(pd.read_csv, io.BytesIO(content))
    count = 0
    for _, row in df.iterrows():
        try:
            device_data = {
                "name": str(row.get("hostname", "Unknown")),
                "system": str(row.get("system_name", "Unknown")),
                "status": str(row.get("status", "active")),
                "model": str(row.get("model", "Unknown")),
                "manufacturer": str(row.get("manufacturer", "Unknown")),
                "os": str(row.get("os", "Unknown")),
                "type": str(row.get("type", "physical")),
                "serial_number": str(row.get("serial_number", f"SN-{id(row)}")),
                "asset_tag": str(row.get("asset_tag", f"AT-{id(row)}")),
                "power_max_w": float(row.get("power_max", 0)),
                "power_idle_w": float(row.get("power_idle", 0)),
            }
            db_device = models.Device(**device_data)
            db.add(db_device)
            await db.flush()
            
            if not pd.isna(row.get("hw_type")):
                hw = models.HardwareComponent(
                    device_id=db_device.id,
                    type=row["hw_type"],
                    model=row.get("hw_model"),
                    serial_number=row.get("hw_serial")
                )
                db.add(hw)
            count += 1
        except Exception:
            continue
    
    await db.commit()
    return count

@router.post("/csv")
async def import_from_csv(file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    content = await file.read()
    try:
        count = await process_csv(content, db)
        return {"status": "success", "count": count}
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
