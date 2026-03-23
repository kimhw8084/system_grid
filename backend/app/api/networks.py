from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from ..database import get_db
from ..models import models

router = APIRouter(prefix="/networks", tags=["Network Fabric"])

@router.get("/interfaces")
async def get_interfaces(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.NetworkInterface))
    interfaces = result.scalars().all()
    return [{"id": i.id, "name": i.name, "mac_address": i.mac_address, "ip_address": i.ip_address, "link_speed_gbps": i.link_speed_gbps} for i in interfaces]

@router.post("/interfaces")
async def create_interface(data: dict, db: AsyncSession = Depends(get_db)):
    db_obj = models.NetworkInterface(**data)
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)
    return {"status": "success", "id": db_obj.id}

@router.get("/connections")
async def get_connections(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.PortConnection))
    conns = result.scalars().all()
    
    final_result = []
    for c in conns:
        dev_a_res = await db.execute(select(models.Device).filter(models.Device.id == c.device_a_id))
        dev_a = dev_a_res.scalar_one_or_none()
        dev_b_res = await db.execute(select(models.Device).filter(models.Device.id == c.device_b_id))
        dev_b = dev_b_res.scalar_one_or_none()
        
        final_result.append({
            "id": c.id,
            "server_a": dev_a.name if dev_a else "Unknown",
            "port_a": c.port_a,
            "server_b": dev_b.name if dev_b else "Unknown",
            "port_b": c.port_b,
            "speed": f"{c.speed} {c.unit}" if c.speed else "10 Gbps",
            "purpose": c.purpose
        })
    return final_result

@router.post("/connections")
async def create_connection(data: dict, db: AsyncSession = Depends(get_db)):
    conn = models.PortConnection(**data)
    db.add(conn)
    try:
        await db.commit()
        await db.refresh(conn)
        
        log = models.AuditLog(
            user_id="admin", 
            action="LINK", 
            table_name="port_connections", 
            record_id=conn.id, 
            intent_note=f"Established network link between device {conn.device_a_id} and {conn.device_b_id}"
        )
        db.add(log)
        await db.commit()
        
        return {
            "id": conn.id,
            "device_a_id": conn.device_a_id,
            "port_a": conn.port_a,
            "device_b_id": conn.device_b_id,
            "port_b": conn.port_b,
            "purpose": conn.purpose,
            "speed": conn.speed,
            "unit": conn.unit
        }
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.delete("/connections/{conn_id}")
async def delete_connection(conn_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.PortConnection).filter(models.PortConnection.id == conn_id))
    conn = result.scalar_one_or_none()
    if conn:
        await db.delete(conn)
        await db.commit()
    return {"status": "success"}
