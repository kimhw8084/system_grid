from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, update
from typing import List
from ..database import get_db
from ..models import models
from ..schemas import schemas

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
        dev_a_res = await db.execute(select(models.Device).filter(models.Device.id == c.source_device_id))
        dev_a = dev_a_res.scalar_one_or_none()
        dev_b_res = await db.execute(select(models.Device).filter(models.Device.id == c.target_device_id))
        dev_b = dev_b_res.scalar_one_or_none()
        
        final_result.append({
            "id": c.id,
            "source_device_id": c.source_device_id,
            "server_a": dev_a.name if dev_a else "Unknown",
            "source_port": c.source_port,
            "port_a": c.source_port,
            "target_device_id": c.target_device_id,
            "server_b": dev_b.name if dev_b else "Unknown",
            "target_port": c.target_port,
            "port_b": c.target_port,
            "speed": f"{c.speed_gbps} {c.unit}" if c.speed_gbps else "Unknown",
            "speed_gbps": c.speed_gbps,
            "unit": c.unit,
            "purpose": c.purpose,
            "direction": c.direction,
            "cable_type": c.cable_type
        })
    return final_result

@router.post("/connections")
async def create_connection(data: dict, db: AsyncSession = Depends(get_db)):
    conn = models.PortConnection(
        source_device_id=data.get('device_a_id'),
        source_port=data.get('source_port') or data.get('port_a'),
        target_device_id=data.get('device_b_id'),
        target_port=data.get('target_port') or data.get('port_b'),
        purpose=data.get('purpose'),
        speed_gbps=data.get('speed_gbps'),
        unit=data.get('unit', 'Gbps'),
        direction=data.get('direction'),
        cable_type=data.get('cable_type')
    )
    db.add(conn)
    try:
        await db.commit()
        await db.refresh(conn)
        
        log = models.AuditLog(
            user_id="admin", 
            action="LINK", 
            target_table="port_connections", 
            target_id=str(conn.id), 
            description=f"Established network link between device {conn.source_device_id} and {conn.target_device_id}"
        )
        db.add(log)
        await db.commit()
        return conn
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.put("/connections/{conn_id}")
async def update_connection(conn_id: int, data: dict, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.PortConnection).filter(models.PortConnection.id == conn_id))
    conn = result.scalar_one_or_none()
    if not conn: raise HTTPException(404)
    
    if 'device_a_id' in data: conn.source_device_id = data['device_a_id']
    if 'port_a' in data: conn.source_port = data['port_a']
    if 'device_b_id' in data: conn.target_device_id = data['device_b_id']
    if 'port_b' in data: conn.target_port = data['port_b']
    if 'purpose' in data: conn.purpose = data['purpose']
    if 'speed_gbps' in data: conn.speed_gbps = data['speed_gbps']
    if 'direction' in data: conn.direction = data['direction']
    if 'cable_type' in data: conn.cable_type = data['cable_type']

    log = models.AuditLog(
        user_id="admin", action="UPDATE", target_table="port_connections", target_id=str(conn_id), description="Modified network link"
    )
    db.add(log)
    await db.commit()
    return conn

@router.delete("/connections/{conn_id}")
async def delete_connection(conn_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.PortConnection).filter(models.PortConnection.id == conn_id))
    conn = result.scalar_one_or_none()
    if conn:
        await db.delete(conn)
        log = models.AuditLog(user_id="admin", action="DELETE", target_table="port_connections", target_id=str(conn_id), description="Severed network link")
        db.add(log)
        await db.commit()
    return {"status": "success"}
