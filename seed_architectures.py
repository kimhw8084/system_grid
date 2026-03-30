
import json
import sqlite3
from datetime import datetime

def seed():
    conn = sqlite3.connect('backend/system_grid.db')
    cursor = conn.cursor()

    # Clear existing data flows to avoid clutter during this exercise
    cursor.execute("DELETE FROM data_flows")

    # Architecture 1: GLOBAL_PAYMENT_GATEWAY_V4
    # Assets: 5 (Load Balancer), 3 (Physical Server), 2 (Storage)
    # Drilldown for 3 (Physical Server): Services 3, 4, 5, 6
    
    arch1_nodes = [
        {
            "id": "node-lb-5",
            "type": "assetNode",
            "position": {"x": 100, "y": 250},
            "data": {"label": "LB-PROD-EDGE", "type": "Load Balancer", "system": "PAYMENT_GATEWAY", "assetId": 5}
        },
        {
            "id": "node-srv-3",
            "type": "assetNode",
            "position": {"x": 450, "y": 250},
            "data": {
                "label": "SRV-APP-CLUSTER-01", "type": "Physical", "system": "PAYMENT_GATEWAY", "assetId": 3,
                "internalNodes": [
                    {"id": "port-in-e1", "type": "inputPort", "position": {"x": 50, "y": 150}, "data": {"label": "LB-PROD-EDGE"}},
                    {"id": "service-3", "type": "serviceNode", "position": {"x": 300, "y": 100}, "data": {"label": "Ubuntu 22.04", "service_type": "OS", "status": "Active", "serviceId": 3}},
                    {"id": "service-5", "type": "serviceNode", "position": {"x": 300, "y": 200}, "data": {"label": "Nginx Edge", "service_type": "Web Server", "status": "Active", "serviceId": 5}},
                    {"id": "service-6", "type": "serviceNode", "position": {"x": 550, "y": 150}, "data": {"label": "Payment Logic", "service_type": "Internal App", "status": "Active", "serviceId": 6}},
                    {"id": "port-out-e2", "type": "outputPort", "position": {"x": 800, "y": 150}, "data": {"label": "NAS-SECURE-STORAGE"}}
                ],
                "internalEdges": [
                    {"id": "se1", "source": "port-in-e1", "target": "service-5", "type": "labeled", "data": {"label": "HTTPS/443", "type": "smoothstep"}},
                    {"id": "se2", "source": "service-5", "target": "service-6", "type": "labeled", "data": {"label": "FastCGI", "type": "bezier"}},
                    {"id": "se3", "source": "service-6", "target": "port-out-e2", "type": "labeled", "data": {"label": "NFS v4.1", "type": "straight"}}
                ]
            }
        },
        {
            "id": "node-storage-2",
            "type": "assetNode",
            "position": {"x": 800, "y": 250},
            "data": {"label": "NAS-SECURE-STORAGE", "type": "Storage", "system": "PAYMENT_GATEWAY", "assetId": 2}
        }
    ]
    
    arch1_edges = [
        {"id": "e1", "source": "node-lb-5", "target": "node-srv-3", "type": "labeled", "data": {"label": "INBOUND_TRAFFIC", "type": "bezier"}},
        {"id": "e2", "source": "node-srv-3", "target": "node-storage-2", "type": "labeled", "data": {"label": "DATA_PERSISTENCE", "type": "smoothstep"}}
    ]

    # Architecture 2: HYBRID_CLOUD_FABRIC
    # Assets: 20 (Firewall), 7 (Virtual Server), 10 (Storage)
    
    arch2_nodes = [
        {
            "id": "node-fw-20",
            "type": "assetNode",
            "position": {"x": 100, "y": 300},
            "data": {"label": "FW-CORE-VPC", "type": "Firewall", "system": "HYBRID_FABRIC", "assetId": 20}
        },
        {
            "id": "node-v-7",
            "type": "assetNode",
            "position": {"x": 500, "y": 300},
            "data": {
                "label": "VM-WORKER-01", "type": "Virtual", "system": "HYBRID_FABRIC", "assetId": 7,
                "internalNodes": [
                    {"id": "port-in-e3", "type": "inputPort", "position": {"x": 50, "y": 150}, "data": {"label": "FW-CORE-VPC"}},
                    {"id": "service-13", "type": "serviceNode", "position": {"x": 300, "y": 150}, "data": {"label": "API Endpoint", "service_type": "Web Server", "status": "Active", "serviceId": 13}},
                    {"id": "service-12", "type": "serviceNode", "position": {"x": 600, "y": 150}, "data": {"label": "PostgreSQL", "service_type": "Database", "status": "Active", "serviceId": 12}},
                    {"id": "port-out-e4", "type": "outputPort", "position": {"x": 900, "y": 150}, "data": {"label": "S3-REPLICATION-SYNC"}}
                ],
                "internalEdges": [
                    {"id": "se4", "source": "port-in-e3", "target": "service-13", "type": "labeled", "data": {"label": "REST_CALL", "type": "bezier"}},
                    {"id": "se5", "source": "service-13", "target": "service-12", "type": "labeled", "data": {"label": "SQL_QUERY", "type": "step"}},
                    {"id": "se6", "source": "service-12", "target": "port-out-e4", "type": "labeled", "data": {"label": "BACKUP_STREAM", "type": "straight"}}
                ]
            }
        },
        {
            "id": "node-storage-10",
            "type": "assetNode",
            "position": {"x": 900, "y": 300},
            "data": {"label": "S3-REPLICATION-SYNC", "type": "Storage", "system": "HYBRID_FABRIC", "assetId": 10}
        }
    ]
    
    arch2_edges = [
        {"id": "e3", "source": "node-fw-20", "target": "node-v-7", "type": "labeled", "data": {"label": "DMZ_ACCESS", "type": "step"}},
        {"id": "e4", "source": "node-v-7", "target": "node-storage-10", "type": "labeled", "data": {"label": "OFFSITE_SYNC", "type": "bezier"}}
    ]

    # Architecture 3: SAP_ERP_FOUNDATION
    # Assets: 1 (Switch), 19 (Physical Server), 4 (Storage)
    
    arch3_nodes = [
        {
            "id": "node-sw-1",
            "type": "assetNode",
            "position": {"x": 100, "y": 200},
            "data": {"label": "SW-CORE-DIST", "type": "Switch", "system": "SAP_ERP", "assetId": 1}
        },
        {
            "id": "node-srv-19",
            "type": "assetNode",
            "position": {"x": 500, "y": 200},
            "data": {
                "label": "SRV-SAP-HANNA", "type": "Physical", "system": "SAP_ERP", "assetId": 19,
                "internalNodes": [
                    {"id": "port-in-e5", "type": "inputPort", "position": {"x": 50, "y": 150}, "data": {"label": "SW-CORE-DIST"}},
                    {"id": "service-gen-1", "type": "serviceNode", "position": {"x": 300, "y": 150}, "data": {"label": "HANA_DB_ENGINE", "service_type": "Database", "status": "Active", "isGeneric": False}},
                    {"id": "service-gen-2", "type": "serviceNode", "position": {"x": 600, "y": 150}, "data": {"label": "ABAP_APP_SERVER", "service_type": "Internal App", "status": "Active", "isGeneric": False}},
                    {"id": "port-out-e6", "type": "outputPort", "position": {"x": 900, "y": 150}, "data": {"label": "SAN-FIBRE-ARRAY"}}
                ],
                "internalEdges": [
                    {"id": "se7", "source": "port-in-e5", "target": "service-gen-2", "type": "labeled", "data": {"label": "GUI_ACCESS", "type": "smoothstep"}},
                    {"id": "se8", "source": "service-gen-2", "target": "service-gen-1", "type": "labeled", "data": {"label": "MEM_IPC", "type": "straight"}},
                    {"id": "se9", "source": "service-gen-1", "target": "port-out-e6", "type": "labeled", "data": {"label": "FC_WRITE", "type": "bezier"}}
                ]
            }
        },
        {
            "id": "node-storage-4",
            "type": "assetNode",
            "position": {"x": 900, "y": 200},
            "data": {"label": "SAN-FIBRE-ARRAY", "type": "Storage", "system": "SAP_ERP", "assetId": 4}
        }
    ]
    
    arch3_edges = [
        {"id": "e5", "source": "node-sw-1", "target": "node-srv-19", "type": "labeled", "data": {"label": "NET_ACCESS", "type": "bezier"}},
        {"id": "e6", "source": "node-srv-19", "target": "node-storage-4", "type": "labeled", "data": {"label": "FC_CHANNEL", "type": "straight"}}
    ]

    now = datetime.now().isoformat()
    
    flows = [
        ("GLOBAL_PAYMENT_GATEWAY_V4", "End-to-end payment orchestration path", "System", arch1_nodes, arch1_edges),
        ("HYBRID_CLOUD_FABRIC", "VPC to On-Prem sync architecture", "System", arch2_nodes, arch2_edges),
        ("SAP_ERP_FOUNDATION", "Core business processing matrix", "System", arch3_nodes, arch3_edges)
    ]

    for name, desc, cat, nodes, edges in flows:
        cursor.execute("""
            INSERT INTO data_flows (name, description, category, nodes_json, edges_json, viewport_json, is_template, is_deleted, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?, ?)
        """, (name, desc, cat, json.dumps(nodes), json.dumps(edges), json.dumps({"x": 0, "y": 0, "zoom": 1}), now, now))

    conn.commit()
    conn.close()
    print("Successfully seeded 3 detailed architectures.")

if __name__ == "__main__":
    seed()
