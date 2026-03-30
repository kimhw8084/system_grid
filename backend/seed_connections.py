import asyncio
import random
from app.database import AsyncSessionLocal
from app.models import models
from sqlalchemy import select, delete

async def run():
    async with AsyncSessionLocal() as db:
        # Clear existing connections to avoid clutter during testing
        await db.execute(delete(models.PortConnection))
        
        res = await db.execute(select(models.Device))
        devs = res.scalars().all()
        
        if not devs:
            print("No devices found to connect.")
            return

        switches = [d for d in devs if d.type.lower() == 'switch']
        load_balancers = [d for d in devs if d.type.lower() == 'load balancer']
        storage = [d for d in devs if d.type.lower() == 'storage']
        firewalls = [d for d in devs if d.type.lower() == 'firewall']
        others = [d for d in devs if d.type.lower() not in ['switch', 'load balancer', 'storage', 'firewall']]

        connections = []

        # 1. Connect many devices to switches
        for sw in switches:
            # Pick 5-10 random devices to connect to this switch
            targets = random.sample(devs, min(len(devs), random.randint(5, 10)))
            for t in targets:
                if sw.id == t.id: continue
                connections.append(models.PortConnection(
                    source_device_id=sw.id,
                    source_port=f"Eth{random.randint(1,48)}",
                    target_device_id=t.id,
                    target_port="NIC1",
                    purpose="Management/Data",
                    speed_gbps=10.0,
                    unit="Gbps",
                    direction="Bi-directional",
                    cable_type="DAC"
                ))

        # 2. Connect Load Balancers to Web/App servers (Others)
        for lb in load_balancers:
            targets = random.sample(others, min(len(others), random.randint(3, 6)))
            for t in targets:
                connections.append(models.PortConnection(
                    source_device_id=lb.id,
                    source_port=f"P{random.randint(1,4)}",
                    target_device_id=t.id,
                    target_port="ServicePort",
                    purpose="Balanced Traffic",
                    speed_gbps=1.0,
                    unit="Gbps",
                    direction="Inbound",
                    cable_type="Cat6"
                ))

        # 3. Connect Storage to physical servers
        for st in storage:
            phys = [d for d in devs if d.type.lower() == 'physical']
            targets = random.sample(phys, min(len(phys), random.randint(2, 4)))
            for t in targets:
                connections.append(models.PortConnection(
                    source_device_id=st.id,
                    source_port="FC-A",
                    target_device_id=t.id,
                    target_port="HBA1",
                    purpose="SAN Storage",
                    speed_gbps=16.0,
                    unit="Gbps",
                    direction="Bi-directional",
                    cable_type="Fiber"
                ))

        # 4. Firewalls to edge
        for fw in firewalls:
            # Connect to a random switch and a random load balancer
            if switches:
                sw = random.choice(switches)
                connections.append(models.PortConnection(
                    source_device_id=fw.id,
                    source_port="Trust",
                    target_device_id=sw.id,
                    target_port="Uplink",
                    purpose="Secure Zone",
                    speed_gbps=40.0,
                    unit="Gbps",
                    direction="Bi-directional",
                    cable_type="Fiber"
                ))
            if load_balancers:
                lb = random.choice(load_balancers)
                connections.append(models.PortConnection(
                    source_device_id=fw.id,
                    source_port="DMZ",
                    target_device_id=lb.id,
                    target_port="Inbound",
                    purpose="DMZ Traffic",
                    speed_gbps=10.0,
                    unit="Gbps",
                    direction="Bi-directional",
                    cable_type="Fiber"
                ))

        db.add_all(connections)
        await db.commit()
        print(f"Successfully seeded {len(connections)} network connections.")

if __name__ == "__main__":
    asyncio.run(run())
