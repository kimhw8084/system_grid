import React, { useEffect, useMemo, useState } from 'react'
import { Activity, Box, Calendar, Cpu as CpuIcon, Edit2, Layers, Search, Share2, Shield } from 'lucide-react'
import { motion } from 'framer-motion'
import ForceGraph2D from 'react-force-graph-2d'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '../../api/apiClient'
import { formatAppDay } from '../../utils/dateUtils'
import { WorkspaceEmptyState } from '../shared/OperationalWorkspacePrimitives'
import { AssetServicesTable, MetadataViewer, MiniMonitoringTable } from '../AssetGrid_Legacy'

type AssetLegacyReportSurfaceProps = {
  assets: any[]
  options: any[]
  devices: any[]
  selectedAssetId?: number | null
  onSelectAsset?: (asset: any) => void
  onEdit: (asset: any) => void
  onViewServiceDetails: (service: any) => void
  onEditService: (service: any) => void
}

const STATUS_ITEMS = [
  { value: 'Active', label: 'Active' },
  { value: 'Maintenance', label: 'Maintenance' },
  { value: 'Failed', label: 'Failed' },
  { value: 'Provisioning', label: 'Provisioning' },
  { value: 'Reserved', label: 'Reserved' },
  { value: 'Offline', label: 'Offline' },
]

const ENVIRONMENT_ITEMS = [
  { value: 'Production', label: 'Production' },
  { value: 'Staging', label: 'Staging' },
  { value: 'Development', label: 'Development' },
  { value: 'Lab', label: 'Lab' },
]

const ASSET_TYPES = [
  { value: 'Physical', label: 'Physical' },
  { value: 'Virtual', label: 'Virtual' },
  { value: 'Storage', label: 'Storage' },
  { value: 'Switch', label: 'Switch' },
  { value: 'Firewall', label: 'Firewall' },
  { value: 'Load Balancer', label: 'Load Balancer' },
]

function ConnectionMap({ deviceId, type, devices }: { deviceId: number; type: 'dependency' | 'network'; devices: any[] }) {
  const { data: rels } = useQuery({
    queryKey: ['asset-report-rel', deviceId],
    queryFn: async () => (await apiFetch(`/api/v1/devices/${deviceId}/relationships`)).json(),
    enabled: type === 'dependency' && !!deviceId,
  })

  const { data: conns } = useQuery({
    queryKey: ['asset-report-conns', deviceId],
    queryFn: async () => (await apiFetch(`/api/v1/networks/connections?device_id=${deviceId}`)).json(),
    enabled: type === 'network' && !!deviceId,
  })

  const centerDevice = devices.find((device) => Number(device.id) === Number(deviceId))

  const graphData = useMemo(() => {
    const nodes = [{ id: deviceId, name: centerDevice?.name, isCenter: true, type: centerDevice?.type }]
    const links: any[] = []

    if (type === 'dependency' && Array.isArray(rels)) {
      rels.forEach((rel: any) => {
        const isSource = Number(rel.source_device_id) === Number(deviceId)
        const peerId = isSource ? Number(rel.target_device_id) : Number(rel.source_device_id)
        const peer = devices.find((device) => Number(device.id) === peerId)
        if (!peer) return
        nodes.push({ id: peerId, name: peer.name, isCenter: false, type: peer.type })
        links.push({
          source: isSource ? deviceId : peerId,
          target: isSource ? peerId : deviceId,
          label: rel.relationship_type,
        })
      })
    } else if (type === 'network' && Array.isArray(conns)) {
      conns.forEach((conn: any) => {
        const isSource = Number(conn.src_device_id) === Number(deviceId)
        const peerId = isSource ? Number(conn.dst_device_id) : Number(conn.src_device_id)
        const peer = devices.find((device) => Number(device.id) === peerId)
        if (!peer) return
        nodes.push({ id: peerId, name: peer.name, isCenter: false, type: peer.type })
        links.push({
          source: isSource ? deviceId : peerId,
          target: isSource ? peerId : deviceId,
          label: conn.connection_type || 'Network',
        })
      })
    }

    return { nodes, links }
  }, [centerDevice?.name, centerDevice?.type, conns, deviceId, devices, rels, type])

  return (
    <div className="h-[300px] w-full overflow-hidden rounded-lg border border-white/5 bg-black/20">
      {graphData.nodes.length <= 1 ? (
        <div className="flex h-full items-center justify-center text-[10px] font-bold uppercase tracking-widest text-slate-600">
          No active {type} vectors identified
        </div>
      ) : (
        <ForceGraph2D
          graphData={graphData}
          height={300}
          width={500}
          cooldownTicks={100}
          nodeColor={(node: any) => node.isCenter ? '#3b82f6' : '#64748b'}
          nodeLabel={(node: any) => `${node.name} [${node.type}]`}
          linkColor={() => 'rgba(255, 255, 255, 0.15)'}
          linkDirectionalArrowLength={4}
          linkDirectionalArrowRelPos={1}
          nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
            const label = node.name
            const fontSize = node.isCenter ? 12 / globalScale : 10 / globalScale
            ctx.font = `${fontSize}px Inter`
            ctx.fillStyle = node.isCenter ? '#3b82f6' : '#1e293b'
            ctx.beginPath()
            ctx.arc(node.x, node.y, node.isCenter ? 6 : 4, 0, 2 * Math.PI, false)
            ctx.fill()
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillStyle = node.isCenter ? '#fff' : '#94a3b8'
            ctx.fillText(label, node.x, node.y + (node.isCenter ? 12 : 10))
          }}
          linkCanvasObjectMode={() => 'after'}
          linkCanvasObject={(link: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
            const start = link.source
            const end = link.target
            if (typeof start !== 'object' || typeof end !== 'object') return
            const text = String(link.label || '')
            const fontSize = Math.min(8, 10 / globalScale)
            ctx.font = `${fontSize}px Inter`
            const textWidth = ctx.measureText(text).width
            const dims = [textWidth, fontSize].map((value) => value + fontSize * 0.2) as [number, number]
            const relLink = { x: end.x - start.x, y: end.y - start.y }
            const textPos = { x: start.x + relLink.x * 0.5, y: start.y + relLink.y * 0.5 }
            ctx.save()
            ctx.translate(textPos.x, textPos.y)
            ctx.rotate(Math.atan2(relLink.y, relLink.x))
            ctx.fillStyle = 'rgba(15, 23, 42, 0.8)'
            ctx.fillRect(-dims[0] / 2, -dims[1] / 2, dims[0], dims[1])
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillStyle = type === 'dependency' ? '#818cf8' : '#34d399'
            ctx.fillText(text, 0, 0)
            ctx.restore()
          }}
        />
      )}
    </div>
  )
}

export function AssetLegacyReportSurface({
  assets,
  options,
  devices,
  selectedAssetId,
  onSelectAsset,
  onEdit,
  onViewServiceDetails,
  onEditService,
}: AssetLegacyReportSurfaceProps) {
  const [selectedId, setSelectedId] = useState<number | null>(selectedAssetId ?? assets[0]?.id ?? null)
  const [filter, setFilter] = useState({ name: '', system: '', type: '', status: '', env: '' })

  const filteredAssets = useMemo(() => {
    return assets.filter((asset: any) => {
      const matchName = String(asset.name || '').toLowerCase().includes(filter.name.toLowerCase())
      const matchSystem = !filter.system || asset.system === filter.system
      const matchType = !filter.type || asset.type === filter.type
      const matchStatus = !filter.status || asset.status === filter.status
      const matchEnv = !filter.env || asset.environment === filter.env
      return matchName && matchSystem && matchType && matchStatus && matchEnv
    })
  }, [assets, filter])

  const selectedAsset = useMemo(
    () => filteredAssets.find((asset: any) => asset.id === selectedId) || filteredAssets[0] || null,
    [filteredAssets, selectedId]
  )

  useEffect(() => {
    if (selectedAsset && selectedAsset.id !== selectedId) {
      setSelectedId(selectedAsset.id)
    }
  }, [selectedAsset, selectedId])

  useEffect(() => {
    if (selectedAssetId && selectedAssetId !== selectedId) {
      setSelectedId(selectedAssetId)
    }
  }, [selectedAssetId, selectedId])

  useEffect(() => {
    if (selectedAsset && onSelectAsset) {
      onSelectAsset(selectedAsset)
    }
  }, [onSelectAsset, selectedAsset])

  const getOptions = (category: string) => Array.isArray(options) ? options.filter((item: any) => item.category === category) : []

  return (
    <div className="flex min-h-0 flex-1 gap-4 overflow-hidden">
      <div className="flex w-80 flex-col overflow-hidden rounded-lg border border-white/5 bg-black/20">
        <div className="space-y-3 border-b border-white/5 bg-white/5 p-4">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={filter.name}
              onChange={(event) => setFilter((current) => ({ ...current, name: event.target.value }))}
              placeholder="Search Assets..."
              className="w-full rounded-lg border border-white/5 bg-black/40 py-2 pl-9 pr-4 text-[10px] font-bold uppercase outline-none transition-all focus:border-blue-500/50"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select value={filter.system} onChange={(event) => setFilter((current) => ({ ...current, system: event.target.value }))} className="rounded-lg border border-white/5 bg-black/40 px-2 py-1.5 text-[9px] font-bold uppercase text-slate-400 outline-none">
              <option value="">All Systems</option>
              {getOptions('LogicalSystem').map((item: any) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
            <select value={filter.type} onChange={(event) => setFilter((current) => ({ ...current, type: event.target.value }))} className="rounded-lg border border-white/5 bg-black/40 px-2 py-1.5 text-[9px] font-bold uppercase text-slate-400 outline-none">
              <option value="">All Types</option>
              {ASSET_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select value={filter.status} onChange={(event) => setFilter((current) => ({ ...current, status: event.target.value }))} className="rounded-lg border border-white/5 bg-black/40 px-2 py-1.5 text-[9px] font-bold uppercase text-slate-400 outline-none">
              <option value="">All Statuses</option>
              {STATUS_ITEMS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
            <select value={filter.env} onChange={(event) => setFilter((current) => ({ ...current, env: event.target.value }))} className="rounded-lg border border-white/5 bg-black/40 px-2 py-1.5 text-[9px] font-bold uppercase text-slate-400 outline-none">
              <option value="">All Envs</option>
              {ENVIRONMENT_ITEMS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </div>
        </div>

        <div className="custom-scrollbar flex-1 space-y-1 overflow-y-auto p-2">
          {filteredAssets.map((asset: any) => (
            <button
              key={asset.id}
              type="button"
              onClick={() => setSelectedId(asset.id)}
              className={`group relative w-full overflow-hidden rounded-lg p-3 text-left transition-all ${selectedAsset?.id === asset.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-white/5'}`}
            >
              <div className="mb-1 flex items-center justify-between">
                <span className="truncate pr-2 text-[11px] font-bold uppercase tracking-tighter">{asset.name}</span>
                <span className={`rounded-lg border px-1.5 py-0.5 text-[11px] font-bold ${
                  asset.status === 'Active' ? 'border-emerald-500/20 bg-emerald-500/20 text-emerald-400' :
                  asset.status === 'Maintenance' ? 'border-amber-500/20 bg-amber-500/20 text-amber-400' :
                  asset.status === 'Failed' ? 'border-rose-500/20 bg-rose-500/20 text-rose-400' :
                  'border-white/10 bg-white/5 text-slate-400'
                } ${selectedAsset?.id === asset.id ? 'border-white/40 text-white' : ''}`}>
                  {asset.status}
                </span>
              </div>
              <div className="flex items-center space-x-2 text-[11px] font-bold opacity-60">
                <span>{asset.system}</span>
                <span className="h-1 w-1 rounded-full bg-current opacity-30" />
                <span>{asset.type}</span>
              </div>
              {selectedAsset?.id === asset.id ? <motion.div layoutId="asset-report-active-indicator" className="absolute bottom-0 left-0 top-0 w-1 bg-white" /> : null}
            </button>
          ))}
          {!filteredAssets.length ? <WorkspaceEmptyState title="No matching assets" description="Adjust your filters or add new assets to the matrix." /> : null}
        </div>
      </div>

      <div className="custom-scrollbar flex-1 overflow-y-auto rounded-lg border border-white/5 bg-[#0a0c14]/40">
        {selectedAsset ? (
          <div className="space-y-12 p-12">
            <div className="flex items-start justify-between">
              <div className="space-y-6">
                <div className="flex items-center space-x-6">
                  <div className="rounded-lg bg-blue-600 p-3 text-white shadow-xl shadow-blue-500/20 ring-4 ring-blue-500/10">
                    <Box size={48} />
                  </div>
                  <div>
                    <h1 className="text-5xl font-black uppercase tracking-tighter text-white">{selectedAsset.name}</h1>
                    <div className="mt-2 flex items-center space-x-4">
                      <span className="text-[14px] font-bold uppercase tracking-[0.3em] text-blue-400">{selectedAsset.system}</span>
                      <span className="h-1.5 w-1.5 rounded-full bg-white/10" />
                      <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500">{selectedAsset.type} // {selectedAsset.environment} // {selectedAsset.owner || 'NO OWNER'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-8 rounded-lg border border-white/5 bg-black/40 p-6">
                  <div className="flex flex-col">
                    <span className="mb-1 text-[9px] font-bold uppercase tracking-widest text-slate-500">Operational State</span>
                    <span className={`w-fit rounded-lg border px-4 py-1 text-[11px] font-bold uppercase ${
                      selectedAsset.status === 'Active' ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400' :
                      selectedAsset.status === 'Maintenance' ? 'border-amber-500/20 bg-amber-500/5 text-amber-400' :
                      'border-rose-500/20 bg-rose-500/5 text-rose-400'
                    }`}>{selectedAsset.status}</span>
                  </div>
                  <div className="h-10 w-px bg-white/5" />
                  <div className="flex flex-col">
                    <span className="mb-1 text-[9px] font-bold uppercase tracking-widest text-slate-500">Primary Network IP</span>
                    <span className="text-xl font-bold text-blue-400">{selectedAsset.primary_ip || '---.---.---.---'}</span>
                  </div>
                  <div className="h-10 w-px bg-white/5" />
                  <div className="flex flex-col">
                    <span className="mb-1 text-[9px] font-bold uppercase tracking-widest text-slate-500">Management OOB IP</span>
                    <span className="text-xl font-bold text-indigo-400">{selectedAsset.management_ip || '---.---.---.---'}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-end space-y-3">
                <button type="button" onClick={() => onEdit(selectedAsset)} className="flex items-center space-x-3 rounded-lg bg-blue-600 px-6 py-3 text-[11px] font-bold uppercase tracking-widest text-white shadow-lg shadow-blue-500/20 transition-all hover:bg-blue-500">
                  <Edit2 size={16} />
                  <span>Modify Config</span>
                </button>
                <div className="text-right">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-slate-600">Last Synced</p>
                  <p className="text-[10px] font-mono text-slate-400">{new Date().toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-6 gap-4 rounded-lg border border-white/5 bg-white/5 p-6">
              <Metric label="Power Avg/Max" value={`${selectedAsset.power_typical_w || 0}W / ${selectedAsset.power_max_w || 0}W`} />
              <Metric label="Site Location" value={selectedAsset.site_name || 'UNPLACED'} tone="text-blue-400" />
              <Metric label="Rack ID" value={selectedAsset.rack_name || 'N/A'} />
              <Metric label="U Position" value={`${selectedAsset.u_start || '--'}U`} tone="text-indigo-400" />
              <Metric label="Form Factor" value={`${selectedAsset.size_u || 1}U / ${selectedAsset.depth || 'Full'}`} />
              <Metric label="Asset Tag" value={selectedAsset.asset_tag || 'NO TAG'} tone="text-amber-500" />
            </div>

            <div className="grid grid-cols-2 gap-8 items-stretch">
              <div className="flex h-full flex-col space-y-6">
                <SectionTitle icon={<CpuIcon size={16} className="text-amber-400" />} title="Hardware & System Architecture" />
                <div className="grid flex-1 grid-cols-2 gap-x-12 gap-y-8 rounded-lg border border-white/5 bg-black/20 p-8">
                  <div>
                    <p className="mb-1 text-[8px] font-bold uppercase tracking-[0.2em] text-slate-500">Platform Identity</p>
                    <p className="text-sm font-bold uppercase text-white">{selectedAsset.manufacturer} {selectedAsset.model}</p>
                    <p className="mt-1 text-[10px] font-mono text-slate-500">SN: {selectedAsset.serial_number || 'UNKNOWN'}</p>
                  </div>
                  <div>
                    <p className="mb-1 text-[8px] font-bold uppercase tracking-[0.2em] text-slate-500">Operating Environment</p>
                    <p className="text-sm font-bold uppercase text-blue-400">{selectedAsset.os_name} {selectedAsset.os_version}</p>
                    <p className="mt-1 text-[10px] font-bold uppercase text-slate-500">Registry Depth: {selectedAsset.depth || 'Full'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="mb-2 text-[8px] font-bold uppercase tracking-[0.2em] text-slate-500">Resource Utilization Summary</p>
                    <div className="rounded-lg border border-white/5 bg-black/40 p-4">
                      <p className="text-xs font-bold uppercase leading-relaxed text-slate-300">{selectedAsset.hardware_summary || 'No hardware details registered for this unit.'}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex h-full flex-col space-y-6">
                <SectionTitle icon={<Calendar size={16} className="text-rose-400" />} title="Lifecycle & Logistics Registry" />
                <div className="grid flex-1 grid-cols-2 gap-8 rounded-lg border border-white/5 bg-black/20 p-8">
                  <div className="space-y-8">
                    <MetricBlock label="Deployment Phase" value={formatAppDay(selectedAsset.install_date)} meta={`Total Uptime Age: ${selectedAsset.hardware_age || 'N/A'}`} />
                    <MetricBlock label="Warranty Coverage" value={selectedAsset.warranty_end ? formatAppDay(selectedAsset.warranty_end) : 'EXPIRED / NO TERM'} />
                  </div>
                  <div className="space-y-8 text-right">
                    <MetricBlock label="Acquisition Date" value={formatAppDay(selectedAsset.purchase_date)} />
                    <MetricBlock label="Retirement EOL" value={selectedAsset.eol_date ? formatAppDay(selectedAsset.eol_date) : 'ACTIVE REIGN'} tone="text-rose-400" />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <SectionTitle icon={<Share2 size={16} className="text-indigo-400" />} title="Vector Topologies & Interconnects" />
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-3">
                  <p className="text-center text-[9px] font-bold uppercase tracking-widest text-slate-500">Dependency Vector Map</p>
                  <ConnectionMap deviceId={selectedAsset.id} type="dependency" devices={devices} />
                </div>
                <div className="space-y-3">
                  <p className="text-center text-[9px] font-bold uppercase tracking-widest text-slate-500">Network Interconnect Map</p>
                  <ConnectionMap deviceId={selectedAsset.id} type="network" devices={devices} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-6">
                <SectionTitle icon={<Layers size={16} className="text-blue-400" />} title="Hosted Logical Services" />
                <div className="overflow-hidden rounded-lg border border-white/5 bg-black/10">
                  <AssetServicesTable deviceId={selectedAsset.id} onViewDetails={onViewServiceDetails} onEdit={onEditService} />
                </div>
              </div>
              <div className="space-y-6">
                <SectionTitle icon={<Activity size={16} className="text-emerald-400" />} title="Monitoring & Telemetry Nodes" />
                <div className="overflow-hidden rounded-lg border border-white/5 bg-black/10">
                  <MiniMonitoringTable deviceId={selectedAsset.id} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-6">
                <SectionTitle icon={<Shield size={16} className="text-amber-500" />} title="Security & Stewardship" />
                <div className="space-y-4 rounded-lg border border-white/5 bg-black/20 p-8">
                  <MetricBlock label="Owner" value={selectedAsset.owner || 'Unowned'} />
                  <MetricBlock label="Exposure" value={selectedAsset.management_ip || selectedAsset.primary_ip || 'No address recorded'} />
                </div>
              </div>
              <div className="space-y-6">
                <SectionTitle icon={<Box size={16} className="text-violet-400" />} title="Registry Metadata" />
                <div className="rounded-lg border border-white/5 bg-black/20 p-8">
                  <MetadataViewer data={selectedAsset.metadata_json || {}} />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-12">
            <WorkspaceEmptyState title="No asset selected" description="Choose an asset from the report rail to load the dossier." />
          </div>
        )}
      </div>
    </div>
  )
}

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center space-x-3 border-b border-white/5 pb-2">
      {icon}
      <h3 className="text-[11px] font-bold uppercase tracking-[0.3em] text-slate-400">{title}</h3>
    </div>
  )
}

function Metric({ label, value, tone = 'text-white' }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex flex-col">
      <span className="mb-1 text-[8px] font-bold uppercase tracking-widest text-slate-500">{label}</span>
      <span className={`text-xs font-bold uppercase ${tone}`}>{value}</span>
    </div>
  )
}

function MetricBlock({ label, value, meta, tone = 'text-white' }: { label: string; value: string; meta?: string; tone?: string }) {
  return (
    <div>
      <p className="mb-1 text-[8px] font-bold uppercase text-slate-500">{label}</p>
      <p className={`text-sm font-bold uppercase ${tone}`}>{value}</p>
      {meta ? <p className="mt-1 text-[10px] font-bold uppercase text-blue-400">{meta}</p> : null}
    </div>
  )
}
