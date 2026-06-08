import React, { useState } from 'react'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Zap, Shield, Cpu, Terminal, Database, Star, Info, AlertTriangle, 
  Trash2, Check, Copy, Bug, Package, Layout, Activity, MousePointer2,
  Box, Maximize2, Minimize2, ChevronRight, Layers, Network, Search, Globe, BookOpen,
  Code, HardDrive, UserCheck, Settings2, BarChart3, FileText, Share2, Archive, History as HistoryIcon
} from 'lucide-react'
import { 
  PageHeader, 
  PageToolbar, 
  ToolbarButton, 
  ToolbarIconButton, 
  ToolbarGroup,
  ToolbarSearch,
  ToolbarSegmented
} from './shared/LayoutPrimitives'
import { WorkspaceModal } from './shared/WorkspaceModal'
import { 
  WorkspaceSectionBadge, 
  WorkspacePanelTitle, 
  WorkspacePanelSubtitle,
  WorkspaceEmptyState,
  WorkspaceSectionCard,
  WorkspaceTabStrip,
  WorkspaceSelectField
} from './shared/OperationalWorkspacePrimitives'
import { 
  OPERATIONAL_WORKSPACE_VISUALS, 
  MONITORING_WORKSPACE_STANDARD,
  OPERATIONAL_WORKSPACE_CAPABILITY_MATRIX
} from './shared/OperationalWorkspace'

const Section = ({ title, description, count, children }: { title: string, description: string, count?: number | string, children: React.ReactNode }) => (
  <div className="space-y-6 pt-10 border-t border-white/5 first:border-t-0 first:pt-0">
    <div className="flex items-end justify-between">
      <div>
        <h3 className="text-xl font-black uppercase tracking-tighter text-white">{title}</h3>
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mt-2">{description}</p>
      </div>
      {count !== undefined && (
        <div className="px-3 py-1 bg-blue-600/10 border border-blue-500/20 rounded-lg">
          <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">{count} {typeof count === 'number' ? 'Entries' : ''}</span>
        </div>
      )}
    </div>
    <div className="p-8 rounded-2xl border border-white/5 bg-white/[0.02] shadow-2xl backdrop-blur-md">
      {children}
    </div>
  </div>
)

const TokenCard = ({ name, value, children }: { name: string, value: string, children?: React.ReactNode }) => (
  <div className="p-4 rounded-xl border border-white/5 bg-black/40 space-y-3 relative group overflow-hidden">
    <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
       <button onClick={() => { navigator.clipboard.writeText(value); toast.success(`Copied: ${value}`) }} className="p-1 hover:bg-white/10 rounded-md text-slate-500 hover:text-white transition-all"><Copy size={10} /></button>
    </div>
    <div className="flex flex-col">
      <span className="text-[8px] font-black uppercase text-blue-400 tracking-widest">{name}</span>
      <code className="text-[7px] font-mono text-slate-600 bg-black/60 px-1.5 py-0.5 rounded mt-1 w-fit">{value}</code>
    </div>
    <div className="min-h-[60px] flex items-center justify-center rounded-lg overflow-hidden">
      {children}
    </div>
  </div>
)

export const SettingsStandards = () => {
  const [modalSize, setModalSize] = useState<any>(null)
  const [activeTab, setActiveTab] = useState('one')
  const [selectValue, setSelectValue] = useState<any>(null)
  const [searchValue, setSearchValue] = useState('')

  const modalSizes = [
    { id: 'compact', label: 'Compact', description: 'Quick confirmations & small forms.', spec: 'max-w-md (448px)' },
    { id: 'standard', label: 'Standard', description: 'Default size for most entity CRUD.', spec: 'max-w-2xl (672px)' },
    { id: 'wide', label: 'Wide', description: 'Analytics dashboards & split views.', spec: 'max-w-4xl (896px)' },
    { id: 'workspace', label: 'Workspace', description: 'Large scale designers & grids.', spec: 'max-w-7xl (1280px)' },
    { id: 'fullscreen', label: 'Fullscreen', description: 'Literal edge-to-edge immersion.', spec: 'w-screen h-screen' }
  ]

  const visualTokens = Object.entries(OPERATIONAL_WORKSPACE_VISUALS)
  const capabilityEntries = Object.entries(OPERATIONAL_WORKSPACE_CAPABILITY_MATRIX)

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: -10 }} 
      className="space-y-12 pb-20"
    >
      <div className="border-b border-white/5 pb-6">
        <h2 className="text-3xl font-black uppercase tracking-tighter text-white">App Architecture <span className="text-blue-500">Standards</span></h2>
        <p className="text-[10px] text-slate-500 uppercase tracking-[0.3em] font-black mt-2">Unified UI Schema & Golden Template Registry</p>
      </div>

      <Section title="Visual Design Tokens" description="Canonical visual tokens used throughout the SysGrid Engine" count={visualTokens.length}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {visualTokens.map(([key, val]) => (
            <TokenCard key={key} name={key} value={val}>
               {key.toLowerCase().includes('text') ? (
                 <span className={val}>Sample text for {key}</span>
               ) : key.toLowerCase().includes('surface') || key.toLowerCase().includes('bg') ? (
                 <div className={val + " w-full h-12 flex items-center justify-center text-[10px] font-black uppercase"}>{key.replace('Surface', '')}</div>
               ) : (
                 <div className="text-[10px] font-black uppercase text-slate-400">{key} Preview</div>
               )}
            </TokenCard>
          ))}
        </div>
      </Section>

      <Section title="Capability Matrix" description="Standardized feature support across operational modules" count={capabilityEntries.length}>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
           {capabilityEntries.map(([key, adapter]) => (
             <div key={key} className="p-6 rounded-2xl border border-white/5 bg-black/40 space-y-4">
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-600/10 rounded-lg text-blue-400">
                         {key === 'monitoring' ? <Activity size={18} /> : 
                          key === 'architecture' ? <Share2 size={18} /> :
                          key === 'knowledge' ? <BookOpen size={18} /> :
                          key === 'vendors' ? <Package size={18} /> :
                          key === 'rca' ? <Bug size={18} /> : <Database size={18} />}
                      </div>
                      <h4 className="text-[11px] font-black uppercase text-white tracking-widest">{key}</h4>
                   </div>
                   <WorkspaceSectionBadge tone="blue">{adapter.entityLabel}</WorkspaceSectionBadge>
                </div>
                <div className="grid grid-cols-2 gap-2">
                   {adapter.supports.slice(0, 6).map((cap) => (
                     <div key={cap} className="flex items-center gap-1.5 text-[8px] font-black uppercase text-slate-500">
                        <Check size={8} className="text-emerald-500" />
                        {cap.replace(/([A-Z])/g, ' $1')}
                     </div>
                   ))}
                </div>
                <div className="flex gap-2 pt-2 border-t border-white/5">
                   {adapter.hasVersioning && <div title="Versioning Support" className="p-1.5 bg-amber-500/10 rounded text-amber-400"><HistoryIcon size={12} /></div>}
                   {adapter.hasAdvancedEditor && <div title="Advanced Code Editor" className="p-1.5 bg-emerald-500/10 rounded text-emerald-400"><Code size={12} /></div>}
                   {adapter.hasLinkedKnowledge && <div title="Linked Knowledge Base" className="p-1.5 bg-blue-500/10 rounded text-blue-400"><BookOpen size={12} /></div>}
                </div>
             </div>
           ))}
        </div>
      </Section>

      <Section title="Typography & Headers" description="Standardized header hierarchy and alignment" count="L1-L6 Levels">
        <div className="space-y-12">
          <div className="p-6 border border-white/5 rounded-xl bg-black/20">
            <div className="flex items-center justify-between mb-4">
               <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">PageHeader Component [01]</p>
               <span className="text-[7px] font-mono text-slate-700">src/components/shared/LayoutPrimitives.tsx</span>
            </div>
            <PageHeader 
              eyebrow="System Intelligence"
              title="Autonomous Monitoring Engine"
              subtitle="Real-time telemetry analysis across all sector infrastructure nodes"
              actions={
                <ToolbarGroup>
                  <ToolbarButton variant="primary">Deploy Patch</ToolbarButton>
                  <ToolbarButton>View Logs</ToolbarButton>
                </ToolbarGroup>
              }
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                 <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Title Scales</p>
                 <span className="px-1.5 py-0.5 bg-blue-500/10 text-blue-400 text-[6px] font-black rounded uppercase">3 Variations</span>
              </div>
              <WorkspacePanelTitle>Workspace Panel Title</WorkspacePanelTitle>
              <h1 className="text-2xl font-black uppercase tracking-tighter text-white">Large Section Header</h1>
              <h2 className="text-xl font-black uppercase tracking-tighter text-blue-500">Sub-Module Title</h2>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                 <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Text Metadata</p>
                 <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-400 text-[6px] font-black rounded uppercase">Semantic</span>
              </div>
              <WorkspacePanelSubtitle>Standard panel subtitle with muted visibility and bold weight.</WorkspacePanelSubtitle>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Global Labeling Convention</p>
              <p className="text-[9px] font-bold text-slate-600 uppercase leading-relaxed tracking-tight">
                Detailed explanatory text used in settings and modals to provide operational context.
              </p>
            </div>
          </div>
        </div>
      </Section>

      <Section title="Interactive Components" description="Buttons, toolbars, and control surfaces" count={12}>
        <div className="space-y-8">
          <div className="space-y-4">
            <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Toolbar Buttons (ToolbarButton) [v.3.2]</p>
            <div className="flex flex-wrap gap-4">
              <ToolbarButton variant="primary">Primary Action</ToolbarButton>
              <ToolbarButton variant="secondary">Secondary Action</ToolbarButton>
              <ToolbarButton variant="quiet">Quiet Action</ToolbarButton>
              <ToolbarButton variant="danger">Danger Action</ToolbarButton>
              <ToolbarButton active>Active State</ToolbarButton>
              <ToolbarButton disabled>Disabled State</ToolbarButton>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Icon Buttons (ToolbarIconButton)</p>
            <div className="flex flex-wrap gap-4">
              <ToolbarIconButton title="Search"><Search size={16} /></ToolbarIconButton>
              <ToolbarIconButton active title="Network"><Network size={16} /></ToolbarIconButton>
              <ToolbarIconButton tone="danger" title="Purge"><Trash2 size={16} /></ToolbarIconButton>
              <ToolbarIconButton disabled title="Locked"><Shield size={16} /></ToolbarIconButton>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Segmented Controls & Toolbars</p>
            <PageToolbar 
              left={
                <ToolbarSegmented 
                  options={[
                    { label: 'Overview', value: 'one' },
                    { label: 'Analytics', value: 'two' },
                    { label: 'History', value: 'three' }
                  ]}
                  value={activeTab}
                  onChange={setActiveTab}
                />
              }
              right={
                <ToolbarSearch 
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  placeholder="Search assets..."
                />
              }
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Custom Selection Fields</p>
              <WorkspaceSelectField 
                label="Infrastructure Domain"
                value={selectValue}
                onChange={setSelectValue}
                placeholder="Select sector..."
                options={[
                  { value: 'compute', label: 'Compute Engine', description: 'Core CPU/Memory resources' },
                  { value: 'network', label: 'Network Fabric', description: 'Connectivity and routing' },
                  { value: 'storage', label: 'Storage Array', description: 'Persistent block storage' }
                ]}
              />
            </div>
            <div className="space-y-4">
              <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Status Badges</p>
              <div className="flex flex-wrap gap-2 pt-2">
                <WorkspaceSectionBadge tone="blue">Blue Badge</WorkspaceSectionBadge>
                <WorkspaceSectionBadge tone="emerald">Emerald Badge</WorkspaceSectionBadge>
                <WorkspaceSectionBadge tone="amber">Amber Badge</WorkspaceSectionBadge>
                <WorkspaceSectionBadge tone="rose">Rose Badge</WorkspaceSectionBadge>
                <WorkspaceSectionBadge>Default Badge</WorkspaceSectionBadge>
              </div>
            </div>
          </div>
        </div>
      </Section>

      <Section title="Modal Schemas" description="Visualization of standardized pop-up window sizes" count={modalSizes.length}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {modalSizes.map((size) => (
            <button
              key={size.id}
              onClick={() => setModalSize(size.id)}
              className="p-6 rounded-2xl border border-white/5 bg-black/20 text-left hover:border-blue-500/40 hover:bg-blue-500/5 transition-all group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-3">
                 <span className="text-[6px] font-mono text-slate-700 uppercase group-hover:text-blue-500/40 transition-colors">{size.spec}</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-4 group-hover:scale-110 transition-transform">
                {size.id === 'fullscreen' ? <Maximize2 size={20} /> : size.id === 'compact' ? <Minimize2 size={20} /> : <Layout size={20} />}
              </div>
              <h4 className="text-[11px] font-black uppercase text-white tracking-widest">{size.label}</h4>
              <p className="mt-2 text-[9px] font-bold text-slate-500 uppercase leading-relaxed tracking-tight">{size.description}</p>
            </button>
          ))}
        </div>
      </Section>

      <Section title="Empty States" description="Visual cues for missing or pending data" count={1}>
        <WorkspaceEmptyState 
          icon={<Package size={32} />}
          title="No Active Deployments Found"
          description="The monitoring engine has not detected any active infrastructure nodes in this sector. Verify connectivity and authentication parameters."
          action={<ToolbarButton variant="primary">Initialize Sector</ToolbarButton>}
        />
      </Section>

      <Section title="Operational Workspace Contract" description="The behavioral and structural mandate for all high-fidelity views" count="Global Protocol">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Shield size={16} className="text-blue-400" />
                <h4 className="text-[11px] font-black uppercase text-white tracking-widest">Structural Baseline</h4>
              </div>
              <span className="text-[7px] font-black text-slate-700 uppercase">{MONITORING_WORKSPACE_STANDARD.requiredBaseline.length} DIRECTIVES</span>
            </div>
            <ul className="space-y-3">
              {MONITORING_WORKSPACE_STANDARD.requiredBaseline.map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="mt-1 flex h-3 w-3 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-blue-400">
                    <Check size={8} strokeWidth={4} />
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 leading-tight">{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Zap size={16} className="text-amber-400" />
                <h4 className="text-[11px] font-black uppercase text-white tracking-widest">Behavioral Contract</h4>
              </div>
              <span className="text-[7px] font-black text-slate-700 uppercase">EVENTS</span>
            </div>
            <ul className="space-y-3">
              {MONITORING_WORKSPACE_STANDARD.gridBehaviorContract.slice(0, 6).map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="mt-1 flex h-3 w-3 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-400">
                    <Activity size={8} strokeWidth={4} />
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 leading-tight">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      <AnimatePresence>
        {modalSize && (
          <WorkspaceModal 
            isOpen={!!modalSize}
            onClose={() => setModalSize(null)}
            size={modalSize}
            title={`${modalSize.toUpperCase()} MODE`}
            subtitle={
              <div className="flex items-center gap-3">
                 <span>Standard modal dimensions test: {modalSizes.find(s => s.id === modalSize)?.spec}</span>
                 <div className="h-1 w-1 rounded-full bg-slate-700" />
                 <span className="text-blue-400">UI SCHEMA v1.4.2</span>
              </div>
            }
            icon={<Info size={24} />}
            footerRight={
              <ToolbarGroup>
                 <ToolbarButton variant="quiet" onClick={() => setModalSize(null)}>Discard</ToolbarButton>
                 <ToolbarButton variant="primary" onClick={() => setModalSize(null)}>Close Inspection</ToolbarButton>
              </ToolbarGroup>
            }
          >
            <div className="space-y-8 py-4">
              <div className="p-8 rounded-2xl border border-dashed border-white/10 bg-black/20 flex flex-col items-center justify-center text-center">
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-500 mb-4">Content Matrix [ACTIVE]</p>
                <h3 className="text-2xl font-black uppercase tracking-tighter text-white">Dynamic Content Area</h3>
                <p className="mt-2 text-[11px] font-bold text-slate-500 uppercase max-w-md">
                  This area scales according to the modal size parameter. Use WorkspaceSectionCard to organize complex forms or data displays.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <WorkspaceSectionCard>
                   <div className="flex items-center justify-between mb-4">
                      <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Module Alpha</p>
                      <WorkspaceSectionBadge tone="blue">System-01</WorkspaceSectionBadge>
                   </div>
                  <div className="h-20 bg-white/5 rounded-lg border border-white/5" />
                </WorkspaceSectionCard>
                <WorkspaceSectionCard>
                   <div className="flex items-center justify-between mb-4">
                      <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Module Beta</p>
                      <WorkspaceSectionBadge tone="emerald">Active</WorkspaceSectionBadge>
                   </div>
                  <div className="h-20 bg-white/5 rounded-lg border border-white/5" />
                </WorkspaceSectionCard>
              </div>
            </div>
          </WorkspaceModal>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
