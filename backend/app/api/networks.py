from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, update, or_, and_, func
from typing import List
from ..database import get_db
from ..models import models
from ..schemas import schemas
from .utils import filter_valid_columns

router = APIRouter(prefix="/networks", tags=["Network Fabric"])

@router.get("/interfaces")
async def get_interfaces(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.NetworkInterface))
    interfaces = result.scalars().all()
    return [{"id": i.id, "name": i.name, "mac_address": i.mac_address, "ip_address": i.ip_address, "link_speed_gbps": i.link_speed_gbps} for i in interfaces]

@router.post("/interfaces")
async def create_interface(data: dict, db: AsyncSession = Depends(get_db)):
    clean_data = filter_valid_columns(models.NetworkInterface, data)
    if 'id' in clean_data and not clean_data['id']:
        del clean_data['id']
    db_obj = models.NetworkInterface(**clean_data)
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)
    return {"status": "success", "id": db_obj.id}

@router.put("/interfaces/{interface_id}")
async def update_interface(interface_id: int, data: dict, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(models.NetworkInterface).filter(models.NetworkInterface.id == interface_id))
    item = res.scalar_one_or_none()
    if not item: raise HTTPException(404)
    
    clean = filter_valid_columns(models.NetworkInterface, data)
    for k, v in clean.items():
        if k != "id": setattr(item, k, v)
    
    await db.commit()
    await db.refresh(item)
    return item

@router.get("/connections")
async def get_connections(device_id: int = None, db: AsyncSession = Depends(get_db)):
    from sqlalchemy.orm import aliased
    DeviceA = aliased(models.Device)
    DeviceB = aliased(models.Device)
    LocA = aliased(models.DeviceLocation)
    LocB = aliased(models.DeviceLocation)
    RackA = aliased(models.Rack)
    RackB = aliased(models.Rack)
    
    source_location_subquery = (
        select(
            models.DeviceLocation.device_id.label("device_id"),
            func.min(models.DeviceLocation.id).label("location_id"),
        )
        .group_by(models.DeviceLocation.device_id)
        .subquery()
    )
    target_location_subquery = (
        select(
            models.DeviceLocation.device_id.label("device_id"),
            func.min(models.DeviceLocation.id).label("location_id"),
        )
        .group_by(models.DeviceLocation.device_id)
        .subquery()
    )

    query = select(
        models.PortConnection,
        DeviceA.name.label("server_a"),
        DeviceB.name.label("server_b"),
        RackA.name.label("rack_a"),
        LocA.start_unit.label("slot_a"),
        RackB.name.label("rack_b"),
        LocB.start_unit.label("slot_b")
    ).outerjoin(DeviceA, models.PortConnection.source_device_id == DeviceA.id) \
     .outerjoin(DeviceB, models.PortConnection.target_device_id == DeviceB.id) \
     .outerjoin(source_location_subquery, source_location_subquery.c.device_id == DeviceA.id) \
     .outerjoin(LocA, LocA.id == source_location_subquery.c.location_id) \
     .outerjoin(RackA, LocA.rack_id == RackA.id) \
     .outerjoin(target_location_subquery, target_location_subquery.c.device_id == DeviceB.id) \
     .outerjoin(LocB, LocB.id == target_location_subquery.c.location_id) \
     .outerjoin(RackB, LocB.rack_id == RackB.id)
    
    if device_id:
        query = query.filter(or_(models.PortConnection.source_device_id == device_id, models.PortConnection.target_device_id == device_id))
    
    result = await db.execute(query)
    rows = result.all()
    
    final_result = []
    for conn, server_a, server_b, rack_a, slot_a, rack_b, slot_b in rows:
        final_result.append({
            "id": conn.id,
            "source_device_id": conn.source_device_id,
            "src_device_id": conn.source_device_id,
            "server_a": server_a or "Unknown",
            "source_port": conn.source_port,
            "port_a": conn.source_port,
            "src_port": conn.source_port,
            "source_ip": conn.source_ip,
            "source_mac": conn.source_mac,
            "source_vlan": conn.source_vlan,
            "src_rack": rack_a or "N/A",
            "src_slot": slot_a or "N/A",
            "target_device_id": conn.target_device_id,
            "dst_device_id": conn.target_device_id,
            "server_b": server_b or "Unknown",
            "target_port": conn.target_port,
            "port_b": conn.target_port,
            "dst_port": conn.target_port,
            "target_ip": conn.target_ip,
            "target_mac": conn.target_mac,
            "target_vlan": conn.target_vlan,
            "peer_rack": rack_b or "N/A",
            "peer_slot": slot_b or "N/A",
            "vlan": conn.source_vlan or conn.target_vlan,
            "speed": f"{conn.speed_gbps} {conn.unit}" if conn.speed_gbps else "Unknown",
            "speed_gbps": conn.speed_gbps,
            "unit": conn.unit,
            "link_type": conn.link_type,
            "connection_type": conn.link_type,
            "purpose": conn.purpose,
            "direction": conn.direction,
            "cable_type": conn.cable_type,
            "status": conn.status,
            "farm": conn.farm,
            "request_link": conn.request_link
        })
    return final_result

@router.post("/connections")
async def create_connection(data: dict, db: AsyncSession = Depends(get_db)):
    source_device_id = data.get('device_a_id')
    source_port = data.get('source_port') or data.get('port_a')
    target_device_id = data.get('device_b_id')
    target_port = data.get('target_port') or data.get('port_b')

    if not all([source_device_id, source_port, target_device_id, target_port]):
        raise HTTPException(400, "Incomplete mapping data")
    if str(source_device_id) == str(target_device_id):
        raise HTTPException(400, "Source and peer assets must be different")
    if source_port == target_port and str(source_device_id) == str(target_device_id):
        raise HTTPException(400, "Loopback mappings on the same asset and port are not allowed")

    # Duplicate check: port on a device can only have one physical connection
    dup_query = select(models.PortConnection).filter(
        or_(
            and_(models.PortConnection.source_device_id == source_device_id, models.PortConnection.source_port == source_port),
            and_(models.PortConnection.target_device_id == source_device_id, models.PortConnection.target_port == source_port),
            and_(models.PortConnection.source_device_id == target_device_id, models.PortConnection.source_port == target_port),
            and_(models.PortConnection.target_device_id == target_device_id, models.PortConnection.target_port == target_port)
        )
    )
    dup_res = await db.execute(dup_query)
    if dup_res.scalars().first():
        raise HTTPException(400, "One of the selected ports is already physically cross-connected")

    conn = models.PortConnection(
        source_device_id=source_device_id,
        source_port=source_port,
        source_ip=data.get('source_ip'),
        source_mac=data.get('source_mac'),
        source_vlan=data.get('source_vlan'),
        target_device_id=target_device_id,
        target_port=target_port,
        target_ip=data.get('target_ip'),
        target_mac=data.get('target_mac'),
        target_vlan=data.get('target_vlan'),
        link_type=data.get('link_type'), 
        purpose=data.get('purpose'),
        speed_gbps=data.get('speed_gbps'),
        unit=data.get('unit', 'Gbps'),
        direction=data.get('direction'),
        cable_type=data.get('cable_type'),
        status=data.get('status', 'Active'),
        farm=data.get('farm'),
        request_link=data.get('request_link')
    )
    db.add(conn)
    log = models.AuditLog(user_id="admin", action="CREATE", target_table="port_connections", description=f"Established link between dev {source_device_id} and {target_device_id}")
    db.add(log)
    await db.commit()
    await db.refresh(conn)
    return conn

@router.put("/connections/{conn_id}")
async def update_connection(conn_id: int, data: dict, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.PortConnection).filter(models.PortConnection.id == conn_id))
    conn = result.scalar_one_or_none()
    if not conn: raise HTTPException(404)

    source_device_id = data.get('device_a_id', conn.source_device_id)
    source_port = data.get('source_port') or data.get('port_a') or conn.source_port
    target_device_id = data.get('device_b_id', conn.target_device_id)
    target_port = data.get('target_port') or data.get('port_b') or conn.target_port

    if not all([source_device_id, source_port, target_device_id, target_port]):
        raise HTTPException(400, "Incomplete mapping data")
    if str(source_device_id) == str(target_device_id):
        raise HTTPException(400, "Source and peer assets must be different")
    if source_port == target_port and str(source_device_id) == str(target_device_id):
        raise HTTPException(400, "Loopback mappings on the same asset and port are not allowed")

    dup_query = select(models.PortConnection).filter(
        models.PortConnection.id != conn_id,
        or_(
            and_(models.PortConnection.source_device_id == source_device_id, models.PortConnection.source_port == source_port),
            and_(models.PortConnection.target_device_id == source_device_id, models.PortConnection.target_port == source_port),
            and_(models.PortConnection.source_device_id == target_device_id, models.PortConnection.source_port == target_port),
            and_(models.PortConnection.target_device_id == target_device_id, models.PortConnection.target_port == target_port)
        )
    )
    dup_res = await db.execute(dup_query)
    if dup_res.scalars().first():
        raise HTTPException(400, "One of the selected ports is already physically cross-connected")

    conn.source_device_id = source_device_id
    conn.source_port = source_port
    conn.target_device_id = target_device_id
    conn.target_port = target_port
    if 'source_ip' in data: conn.source_ip = data['source_ip']
    if 'source_mac' in data: conn.source_mac = data['source_mac']
    if 'source_vlan' in data: conn.source_vlan = data['source_vlan']
    if 'target_ip' in data: conn.target_ip = data['target_ip']
    if 'target_mac' in data: conn.target_mac = data['target_mac']
    if 'target_vlan' in data: conn.target_vlan = data['target_vlan']
    if 'link_type' in data: conn.link_type = data['link_type']
    if 'purpose' in data: conn.purpose = data['purpose']
    if 'speed_gbps' in data: conn.speed_gbps = data['speed_gbps']
    if 'unit' in data: conn.unit = data['unit']
    if 'direction' in data: conn.direction = data['direction']
    if 'cable_type' in data: conn.cable_type = data['cable_type']
    if 'status' in data: conn.status = data['status']
    if 'farm' in data: conn.farm = data['farm']
    if 'request_link' in data: conn.request_link = data['request_link']

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
    if not conn: raise HTTPException(status_code=404, detail="Connection not found")
    
    await db.delete(conn)
    log = models.AuditLog(user_id="admin", action="DELETE", target_table="port_connections", target_id=str(conn_id), description="Severed network link")
    db.add(log)
    await db.commit()
    return {"status": "success"}

@router.post("/connections/bulk-status")
async def bulk_update_status(data: dict, db: AsyncSession = Depends(get_db)):
    ids = data.get("ids", [])
    new_status = data.get("status")
    if not ids or not new_status:
        raise HTTPException(400, "IDs and Status required")
    
    await db.execute(
        update(models.PortConnection)
        .where(models.PortConnection.id.in_(ids))
        .values(status=new_status)
    )
    
    log = models.AuditLog(
        user_id="admin", 
        action="BULK_UPDATE", 
        target_table="port_connections", 
        description=f"Bulk updated {len(ids)} links to {new_status}"
    )
    db.add(log)
    await db.commit()
    return {"status": "success", "count": len(ids)}

@router.post("/connections/bulk-delete")
async def bulk_delete_connections(data: dict, db: AsyncSession = Depends(get_db)):
    ids = data.get("ids", [])
    if not ids:
        raise HTTPException(400, "IDs required")

    result = await db.execute(select(models.PortConnection).filter(models.PortConnection.id.in_(ids)))
    connections = result.scalars().all()
    if not connections:
        return {"status": "success", "count": 0}

    deleted_ids = []
    for conn in connections:
        deleted_ids.append(conn.id)
        await db.delete(conn)

    log = models.AuditLog(
        user_id="admin",
        action="BULK_DELETE",
        target_table="port_connections",
        description=f"Bulk severed {len(deleted_ids)} network links"
    )
    db.add(log)
    await db.commit()
    return {"status": "success", "count": len(deleted_ids), "deleted_ids": deleted_ids}
