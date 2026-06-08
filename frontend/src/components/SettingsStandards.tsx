import React, { useState } from 'react'
import { 
  Zap, Shield, Cpu, Terminal, Database, Star, Info, AlertTriangle, 
  Trash2, Check, Copy, Bug, Package, Layout, Activity, MousePointer2,
  Box, Maximize2, Minimize2, ChevronRight, Layers, Network, Search, Globe, BookOpen
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
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
import { OPERATIONAL_WORKSPACE_VISUALS, MONITORING_WORKSPACE_STANDARD } from './shared/OperationalWorkspace'

const Section = ({ title, description, children }: { title: string, description: string, children: React.ReactNode }) => (
  <div className="space-y-6 pt-10 border-t border-white/5 first:border-t-0 first:pt-0">
    <div>
      <h3 className="text-xl font-black uppercase tracking-tighter text-white">{title}</h3>
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mt-2">{description}</p>
    </div>
    <div className="p-8 rounded-2xl border border-white/5 bg-white/[0.02] shadow-2xl backdrop-blur-md">
      {children}
    </div>
  </div>
)

const TokenCard = ({ name, value, children }: { name: string, value: string, children?: React.ReactNode }) => (
  <div className="p-4 rounded-xl border border-white/5 bg-black/40 space-y-3">
    <div className="flex items-center justify-between">
      <span className="text-[8px] font-black uppercase text-blue-400 tracking-widest">{name}</span>
      <code className="text-[7px] font-mono text-slate-600 bg-black/60 px-1.5 py-0.5 rounded">{value}</code>
    </div>
    <div className="min-h-[60px] flex items-center justify-center">
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
    { id: 'compact', label: 'Compact Modal', description: 'Used for simple confirmations or small forms (w-full max-w-md).' },
    { id: 'standard', label: 'Standard Modal', description: 'The default size for most data entry and details (w-full max-w-2xl).' },
    { id: 'wide', label: 'Wide Modal', description: 'For complex interfaces, analytics, or side-by-side layouts (w-full max-w-6xl).' },
    { id: 'workspace', label: 'Full Workspace', description: 'Immersive full-screen experience for complex designers or maps.' }
  ]

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

      <Section title="Visual Design Tokens" description="Canonical visual tokens used throughout the SysGrid Engine">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <TokenCard name="panelSurface" value={OPERATIONAL_WORKSPACE_VISUALS.panelSurface}>
            <div className={OPERATIONAL_WORKSPACE_VISUALS.panelSurface + " w-full h-12 flex items-center justify-center text-[10px] font-black uppercase"}>Panel Surface</div>
          </TokenCard>
          <TokenCard name="insetSurface" value={OPERATIONAL_WORKSPACE_VISUALS.insetSurface}>
            <div className={OPERATIONAL_WORKSPACE_VISUALS.insetSurface + " w-full h-12 flex items-center justify-center text-[10px] font-black uppercase"}>Inset Surface</div>
          </TokenCard>
          <TokenCard name="floatingSurface" value={OPERATIONAL_WORKSPACE_VISUALS.floatingSurface}>
            <div className={OPERATIONAL_WORKSPACE_VISUALS.floatingSurface + " w-full h-12 flex items-center justify-center text-[10px] font-black uppercase"}>Floating Surface</div>
          </TokenCard>
          <TokenCard name="controlSurface" value={OPERATIONAL_WORKSPACE_VISUALS.controlSurface}>
            <div className={OPERATIONAL_WORKSPACE_VISUALS.controlSurface + " w-full h-12 flex items-center justify-center text-[10px] font-black uppercase"}>Control Surface</div>
          </TokenCard>
          <TokenCard name="titleText" value={OPERATIONAL_WORKSPACE_VISUALS.titleText}>
            <span className={OPERATIONAL_WORKSPACE_VISUALS.titleText}>The Standard Title Text</span>
          </TokenCard>
          <TokenCard name="subtitleText" value={OPERATIONAL_WORKSPACE_VISUALS.subtitleText}>
            <span className={OPERATIONAL_WORKSPACE_VISUALS.subtitleText}>The standard subtitle metadata text</span>
          </TokenCard>
          <TokenCard name="fieldLabelText" value={OPERATIONAL_WORKSPACE_VISUALS.fieldLabelText}>
            <span className={OPERATIONAL_WORKSPACE_VISUALS.fieldLabelText}>PARAMETER_NAME</span>
          </TokenCard>
          <TokenCard name="bodyControlText" value={OPERATIONAL_WORKSPACE_VISUALS.bodyControlText}>
            <span className={OPERATIONAL_WORKSPACE_VISUALS.bodyControlText}>Active Control Value</span>
          </TokenCard>
        </div>
      </Section>

      <Section title="Typography & Headers" description="Standardized header hierarchy and alignment">
        <div className="space-y-12">
          <div className="p-6 border border-white/5 rounded-xl bg-black/20">
            <p className="text-[8px] font-black text-slate-600 uppercase mb-4 tracking-widest">PageHeader component</p>
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
              <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Titles</p>
              <WorkspacePanelTitle>Workspace Panel Title</WorkspacePanelTitle>
              <h1 className="text-2xl font-black uppercase tracking-tighter text-white">Large Section Header</h1>
              <h2 className="text-xl font-black uppercase tracking-tighter text-blue-500">Sub-Module Title</h2>
            </div>
            <div className="space-y-4">
              <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Subtitles & Hints</p>
              <WorkspacePanelSubtitle>Standard panel subtitle with muted visibility and bold weight.</WorkspacePanelSubtitle>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Global Labeling Convention</p>
              <p className="text-[9px] font-bold text-slate-600 uppercase leading-relaxed tracking-tight">
                Detailed explanatory text used in settings and modals to provide operational context.
              </p>
            </div>
          </div>
        </div>
      </Section>

      <Section title="Interactive Components" description="Buttons, toolbars, and control surfaces">
        <div className="space-y-8">
          <div className="space-y-4">
            <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Toolbar Buttons (ToolbarButton)</p>
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

      <Section title="Modal Schemas" description="Visualization of standardized pop-up window sizes">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {modalSizes.map((size) => (
            <button
              key={size.id}
              onClick={() => setModalSize(size.id)}
              className="p-6 rounded-2xl border border-white/5 bg-black/20 text-left hover:border-blue-500/40 hover:bg-blue-500/5 transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-4 group-hover:scale-110 transition-transform">
                <Maximize2 size={20} />
              </div>
              <h4 className="text-[11px] font-black uppercase text-white tracking-widest">{size.label}</h4>
              <p className="mt-2 text-[9px] font-bold text-slate-500 uppercase leading-relaxed tracking-tight">{size.description}</p>
            </button>
          ))}
        </div>
      </Section>

      <Section title="Empty States" description="Visual cues for missing or pending data">
        <WorkspaceEmptyState 
          icon={<Package size={32} />}
          title="No Active Deployments Found"
          description="The monitoring engine has not detected any active infrastructure nodes in this sector. Verify connectivity and authentication parameters."
          action={<ToolbarButton variant="primary">Initialize Sector</ToolbarButton>}
        />
      </Section>

      <Section title="Operational Workspace Contract" description="The behavioral and structural mandate for all high-fidelity views">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Shield size={16} className="text-blue-400" />
              <h4 className="text-[11px] font-black uppercase text-white tracking-widest">Structural Baseline</h4>
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
            <div className="flex items-center gap-2">
              <Zap size={16} className="text-amber-400" />
              <h4 className="text-[11px] font-black uppercase text-white tracking-widest">Behavioral Contract</h4>
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
            subtitle="Demonstration of standard modal dimensions and layout primitives"
            icon={<Info size={24} />}
            footerRight={
              <ToolbarButton variant="primary" onClick={() => setModalSize(null)}>Close Inspection</ToolbarButton>
            }
          >
            <div className="space-y-8 py-4">
              <div className="p-8 rounded-2xl border border-dashed border-white/10 bg-black/20 flex flex-col items-center justify-center text-center">
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-500 mb-4">Content Matrix</p>
                <h3 className="text-2xl font-black uppercase tracking-tighter text-white">Dynamic Content Area</h3>
                <p className="mt-2 text-[11px] font-bold text-slate-500 uppercase max-w-md">
                  This area scales according to the modal size parameter. Use WorkspaceSectionCard to organize complex forms or data displays.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <WorkspaceSectionCard>
                  <p className="text-[8px] font-black text-slate-600 uppercase mb-2 tracking-widest">Module Alpha</p>
                  <div className="h-20 bg-white/5 rounded-lg animate-pulse" />
                </WorkspaceSectionCard>
                <WorkspaceSectionCard>
                  <p className="text-[8px] font-black text-slate-600 uppercase mb-2 tracking-widest">Module Beta</p>
                  <div className="h-20 bg-white/5 rounded-lg animate-pulse" />
                </WorkspaceSectionCard>
              </div>
            </div>
          </WorkspaceModal>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
