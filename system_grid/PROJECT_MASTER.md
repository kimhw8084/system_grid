# SYSTEM SYSGRID: THE COMMAND CENTER
**The Definitive Infrastructure Operating System (Single Source of Truth)**

## 1. Executive Summary
- **Project Name:** System System Grid (The "Command Center")
- **Vision:** An immersive, high-concurrency Digital Twin of System’s isolated cloud infrastructure.
- **Brand Identity:** System "Galactic" Aesthetic. Deep Blue (#034EA2) Glassmorphism, SF Pro/Inter typography, and physics-based Framer Motion orchestration.
- **Award Objective:** 0ms perceived latency, 100% operational visibility, and "Zero-Manual-Entry" data integrity.
- **Target Environment & Deployment Pipeline:** Developed locally, pushed to GitHub (`https://github.com/kimhw8084/system_grid.git`), pulled to a Work PC, and finally deployed to an air-gapped/isolated Company Cloud. All dependencies, fonts, and assets must be bundled locally. No external CDNs.

## 2. Elite Tech Stack
- **Backend:** FastAPI (Python 3.12) + **Pydantic V2** (Strict Typing).
- **Real-Time:** WebSockets for the **Global State Orchestrator**.
- **Database:** SQLite + **Litestream** (Continuous replication) + WAL Mode.
- **Frontend:** React 19 + Vite + **TanStack Query V5** (Optimal caching).
- **Visualization:** **Three.js (3D Room View)** + AG Grid Community/Enterprise (Pivot/Grouping) + D3.js.
- **Styling:** Tailwind CSS + Headless UI + Framer Motion.
- **Performance:** 100/100 Lighthouse Score; <100ms TTFB in air-gapped environments.

## 3. Database Schema (Expanded 16 Tables)
*All tables include `id`, `created_at`, `updated_at`, and `created_by_user_id`.*

### Infrastructure & Physics
1.  **Sites:** Physical DC locations with geo-coordinates.
2.  **Rooms:** Logical floor plans with thermal/cooling zone mapping.
3.  **Racks:** Physical dimensions, Max KW, Weight limit, and **U-Pitch** settings.

### Asset Intelligence (The "Digital Twin")
4.  **Devices:** Status (Active/Maint/EOL), Power Profiles (Max/Idle), and Ownership.
5.  **DeviceLocations:** X/Y/Z positioning within Racks/Rooms.
6.  **HardwareComponents:** Real-time inventory (Serial-level tracking).
7.  **PowerCircuits:** Mapping from PDU to Device for failure domain analysis.

### Network Fabric
8.  **NetworkInterfaces:** MAC/IP/VLAN bindings with link-speed tracking.
9.  **LogicalCables:** Virtualized L1/L2 connections with "Trace Route" visualization.
10. **VLANs/Subnets:** IPAM (IP Address Management) with automated exhaustion alerts.

### Security & Governance
11. **RBAC_Roles:** Granular permissions (Viewer, Operator, Admin, Auditor).
12. **SecretVault:** AES-256 encrypted credentials for device management.
13. **AuditLogs:** Immutable "Intent-Linked" change tracking.
14. **MaintenanceSchedules:** Calendar-integrated downtime windows.

### Intelligence Layer
15. **TelemetrySnapshots:** Time-series data for Power/Thermal (last 30 days).
16. **SystemHealth:** Real-time status of the Grid's own API, DB, and Workers.

## 4. Presidential Feature Suite

### A. The "Nexus" 3D Navigator
- Immersive WebGL floor plan. Racks glow **Red/Amber/Blue** based on real-time thermal/power load.
- "Fly-through" mode to inspect specific rack elevations in 3D.

### B. Global Command Palette (Cmd+K)
- Instant search across Devices, IPs, Owners, and Tickets.
- Execute actions: `> Enter Maintenance Mode`, `> Export Rack PDF`, `> Locate IP 10.x.x.x`.

### C. The Connectivity Matrix (Force-Directed Graph)
- Interactive D3.js topology. Click a switch to see every downstream impacted server (Blast Radius Analysis).

### D. Zero-Touch Import (The "Ghost" Engine)
- Advanced CSV/Excel parser with fuzzy-matching logic. Detects "Similar Names" to prevent duplicate asset tags.

### E. Forensic Audit & Live Feed
- Side-by-side "Time Machine" view. Compare a rack's configuration today vs. 30 days ago.
- Live "Who's Online" avatar presence (à la Figma).

## 5. Implementation Standards & Risk Mitigation (Air-Gapped Ready)
- **Concurrency:** Mandatory `PRAGMA journal_mode=WAL;` and `QueuePool` for 10+ user stability.
- **Offline Integrity:** 100% of fonts, icons, and libraries are bundled locally. Zero external CDN calls.
- **Type Safety:** 100% TypeScript (Strict) + Pydantic models.
- **Testing:** E2E and Unit testing designed to validate logic independently of external network access.
- **Security First:** Encrypted credentials, CSRF protection, SQL Injection hardening, and immutable LDAP-linked audit logs.
