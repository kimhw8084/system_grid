import React, { useState } from 'react'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Zap, Shield, Cpu, Terminal, Database, Star, Info, AlertTriangle, 
  Trash2, Check, Copy, Bug, Package, Layout, Activity, MousePointer2,
  Box, Maximize2, Minimize2, ChevronRight, Layers, Network, Search, Globe, BookOpen,
  Code, HardDrive, UserCheck, Settings2, BarChart3, FileText, Share2, Archive, 
  History as HistoryIcon, Plus, X, RefreshCcw, Edit2, LayoutGrid, List, FileJson, 
  MoreVertical, Settings, Sliders, Eye, EyeOff, ArrowRightLeft, Tag, AlertCircle, 
  Filter, Calendar, Link as LinkIcon, Clipboard, ZoomIn, ZoomOut, Server, 
  ExternalLink, Save, Upload, RefreshCw, ChevronDown, Download, BarChart2, Clock, 
  CheckCircle2, HelpCircle, ShieldAlert, TerminalSquare, ShieldCheck, Monitor, 
  Loader2, Briefcase, PlusCircle, Target, CheckSquare, FileSpreadsheet, FileUp, 
  RotateCcw, Lock, Unlock, Key, Fingerprint, Wifi, Signal, Radio, Cloud, Waves, 
  Timer, Wrench, Hammer, LifeBuoy, Book, Scale, Compass, Map as MapIcon, Flag, Bell
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

const Section = ({ title, description, count, children, id }: { title: string, description: string, count?: number | string, children: React.ReactNode, id?: string }) => (
  <div id={id} className="space-y-6 pt-10 border-t border-white/5 first:border-t-0 first:pt-0 scroll-mt-24">
    <div className="flex items-end justify-between">
      <div>
        <h3 className="text-xl font-black uppercase tracking-tighter text-white italic">{title}</h3>
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mt-2">{description}</p>
      </div>
      {count !== undefined && (
        <div className={`px-3 py-1 bg-blue-600/10 border border-blue-500/20 ${OPERATIONAL_WORKSPACE_VISUALS.standardRadius}`}>
          <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">{count} {typeof count === 'number' ? 'Entries' : ''}</span>
        </div>
      )}
    </div>
    <div className={`p-8 ${OPERATIONAL_WORKSPACE_VISUALS.standardRadius} border border-white/5 bg-white/[0.02] shadow-2xl backdrop-blur-md`}>
      {children}
    </div>
  </div>
)

const TokenCard = ({ name, value, children }: { name: string, value: string, children?: React.ReactNode }) => (
  <div className={`p-4 ${OPERATIONAL_WORKSPACE_VISUALS.standardRadius} border border-white/5 bg-black/40 space-y-3 relative group overflow-hidden`}>
    <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
       <button onClick={() => { navigator.clipboard.writeText(value); toast.success(`Copied: ${value}`) }} className="p-1 hover:bg-white/10 rounded-lg text-slate-500 hover:text-white transition-all"><Copy size={10} /></button>
    </div>
    <div className="flex flex-col">
      <span className="text-[8px] font-black uppercase text-blue-400 tracking-widest">{name}</span>
      <code className="text-[7px] font-mono text-slate-600 bg-black/60 px-1.5 py-0.5 rounded-lg mt-1 w-fit">{value}</code>
    </div>
    <div className={`min-h-[60px] flex items-center justify-center ${OPERATIONAL_WORKSPACE_VISUALS.standardRadius} overflow-hidden`}>
      {children}
    </div>
  </div>
)

const IconCard = ({ icon: Icon, name, isNew }: { icon: any, name: string, isNew?: boolean }) => (
  <div className={`p-3 ${OPERATIONAL_WORKSPACE_VISUALS.insetSurface} group hover:border-blue-500/40 transition-all flex flex-col items-center gap-2 relative`}>
    {isNew && <div className="absolute -top-1 -right-1 bg-emerald-600 text-[6px] font-black uppercase text-white px-1 rounded-lg shadow-lg">Rec</div>}
    <div className="p-2 bg-white/5 rounded-lg text-slate-400 group-hover:text-blue-400 transition-colors">
      <Icon size={16} />
    </div>
    <span className="text-[8px] font-black uppercase text-slate-600 group-hover:text-slate-300 transition-colors tracking-tighter truncate w-full text-center">{name}</span>
    <button 
      onClick={() => { navigator.clipboard.writeText(name); toast.success(`Icon Copied: ${name}`) }}
      className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-blue-600/10 transition-opacity rounded-lg flex items-center justify-center"
    />
  </div>
)

const LexiconEntry = ({ term, definition, usage }: { term: string, definition: string, usage?: string }) => (
  <div className="space-y-2 group">
    <div className="flex items-center gap-2">
      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 group-hover:scale-150 transition-transform" />
      <span className="text-[11px] font-black text-white tracking-widest">{term}</span>
    </div>
    <p className="text-[10px] font-bold text-slate-400 leading-relaxed tracking-tight pl-3.5 border-l border-white/5 group-hover:border-blue-500/30 transition-colors">
      {definition}
    </p>
    {usage && (
      <div className="pl-3.5 text-[8px] font-black text-blue-500/60 uppercase tracking-widest">
        USE: {usage}
      </div>
    )}
  </div>
)

export const SettingsStandards = () => {
  const [modalSize, setModalSize] = useState<any>(null)
  const [activeTab, setActiveTab] = useState('one')
  const [selectValue, setSelectValue] = useState<any>(null)
  const [searchValue, setSearchValue] = useState('')

  const activeIcons = [
    { icon: Activity, name: 'Activity' }, { icon: AlertCircle, name: 'AlertCircle' }, { icon: AlertTriangle, name: 'AlertTriangle' },
    { icon: Archive, name: 'Archive' }, { icon: ArrowRightLeft, name: 'ArrowRightLeft' }, { icon: BarChart2, name: 'BarChart2' },
    { icon: BookOpen, name: 'BookOpen' }, { icon: Box, name: 'Box' }, { icon: Briefcase, name: 'Briefcase' },
    { icon: Bug, name: 'Bug' }, { icon: Calendar, name: 'Calendar' }, { icon: Check, name: 'Check' },
    { icon: CheckCircle2, name: 'CheckCircle2' }, { icon: CheckSquare, name: 'CheckSquare' }, { icon: ChevronDown, name: 'ChevronDown' },
    { icon: ChevronRight, name: 'ChevronRight' }, { icon: Clipboard, name: 'Clipboard' }, { icon: Clock, name: 'Clock' },
    { icon: Code, name: 'Code' }, { icon: Copy, name: 'Copy' }, { icon: Cpu, name: 'Cpu' },
    { icon: Database, name: 'Database' }, { icon: Download, name: 'Download' }, { icon: Edit2, name: 'Edit2' },
    { icon: ExternalLink, name: 'ExternalLink' }, { icon: Eye, name: 'Eye' }, { icon: EyeOff, name: 'EyeOff' },
    { icon: FileJson, name: 'FileJson' }, { icon: FileSpreadsheet, name: 'FileSpreadsheet' }, { icon: FileText, name: 'FileText' },
    { icon: FileUp, name: 'FileUp' }, { icon: Filter, name: 'Filter' }, { icon: Globe, name: 'Globe' },
    { icon: HardDrive, name: 'HardDrive' }, { icon: HelpCircle, name: 'HelpCircle' }, { icon: HistoryIcon, name: 'History' },
    { icon: Info, name: 'Info' }, { icon: Layers, name: 'Layers' }, { icon: Layout, name: 'Layout' },
    { icon: LayoutGrid, name: 'LayoutGrid' }, { icon: LinkIcon, name: 'Link' }, { icon: List, name: 'List' },
    { icon: Loader2, name: 'Loader2' }, { icon: Maximize2, name: 'Maximize2' }, { icon: Minimize2, name: 'Minimize2' },
    { icon: Monitor, name: 'Monitor' }, { icon: MoreVertical, name: 'MoreVertical' }, { icon: Network, name: 'Network' },
    { icon: Package, name: 'Package' }, { icon: Plus, name: 'Plus' }, { icon: PlusCircle, name: 'PlusCircle' },
    { icon: RefreshCcw, name: 'RefreshCcw' }, { icon: RefreshCw, name: 'RefreshCw' }, { icon: RotateCcw, name: 'RotateCcw' },
    { icon: Save, name: 'Save' }, { icon: Search, name: 'Search' }, { icon: Server, name: 'Server' },
    { icon: Settings, name: 'Settings' }, { icon: Share2, name: 'Share2' }, { icon: Shield, name: 'Shield' },
    { icon: ShieldAlert, name: 'ShieldAlert' }, { icon: ShieldCheck, name: 'ShieldCheck' }, { icon: Sliders, name: 'Sliders' },
    { icon: Tag, name: 'Tag' }, { icon: Target, name: 'Target' }, { icon: Terminal, name: 'Terminal' },
    { icon: TerminalSquare, name: 'TerminalSquare' }, { icon: Trash2, name: 'Trash2' }, { icon: Upload, name: 'Upload' },
    { icon: X, name: 'X' }, { icon: Zap, name: 'Zap' }, { icon: ZoomIn, name: 'ZoomIn' }, { icon: ZoomOut, name: 'ZoomOut' }
  ]

  const recommendedIcons = [
    { icon: Lock, name: 'Lock' }, { icon: Unlock, name: 'Unlock' }, { icon: Key, name: 'Key' },
    { icon: Fingerprint, name: 'Fingerprint' }, { icon: Wifi, name: 'Wifi' }, { icon: Signal, name: 'Signal' },
    { icon: Radio, name: 'Radio' }, { icon: Cloud, name: 'Cloud' }, { icon: Waves, name: 'Waves' },
    { icon: Timer, name: 'Timer' }, { icon: Wrench, name: 'Wrench' }, { icon: Hammer, name: 'Hammer' },
    { icon: LifeBuoy, name: 'LifeBuoy' }
  ]

  const modalSizes = [
    { id: 'compact', label: 'Compact', description: 'Quick confirmations & small forms.', spec: 'max-w-lg (512px)' },
    { id: 'standard', label: 'Standard', description: 'Default size for most entity CRUD.', spec: 'max-w-3xl (768px)' },
    { id: 'wide', label: 'Wide', description: 'Analytics dashboards & split views.', spec: 'max-w-5xl (1024px)' },
    { id: 'workspace', label: 'Workspace', description: 'Large scale designers & grids.', spec: 'max-w-[1440px]' },
    { id: 'fullscreen', label: 'Fullscreen', description: 'Literal edge-to-edge immersion.', spec: 'w-screen h-screen' }
  ]

  const radiusStandards = [
    { label: 'rounded-none', value: '0px', class: 'rounded-lg', deprecated: true },
    { icon: Minimize2, label: 'rounded-lg', value: '8px', class: 'rounded-lg', isStandard: true },
    { icon: Box, label: 'rounded-lg', value: '8px', class: 'rounded-lg', isStandard: true },
    { label: 'rounded-lg', value: '8px', class: 'rounded-lg', isStandard: true },
    { label: 'rounded-full', value: '9999px', class: 'rounded-lg', deprecated: true },
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
        <h2 className="text-3xl font-black uppercase tracking-tighter text-white italic">App Architecture <span className="text-blue-500">Standards</span></h2>
        <p className="text-[10px] text-slate-500 uppercase tracking-[0.3em] font-black mt-2">Unified UI Schema & Golden Template Registry</p>
      </div>

      <Section id="operational-lexicon" title="Operational Lexicon" description="Standardized terminology for collective communication">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-8">
           <LexiconEntry 
             term="Golden Template" 
             definition="The living reference file (SettingsStandards.tsx) representing the absolute source of truth for all UI/UX patterns." 
             usage="Reference the Golden Template before implementing new views."
           />
           <LexiconEntry 
             term="Unified Visual Tokens" 
             definition="Canonical design variables (e.g., PanelSurface, InsetSurface) that ensure 1:1 visual parity across modules." 
             usage="Always use OPERATIONAL_WORKSPACE_VISUALS tokens over raw Tailwind classes."
           />
           <LexiconEntry 
             term="Golden Radius" 
             definition="The mandatory corner radius of 8px (rounded-lg). All functional UI elements must adhere to this value." 
             usage="Lock all buttons and inputs to the Golden Radius."
           />
           <LexiconEntry 
             term="Operational Contract" 
             definition="The behavioral and structural mandate required for a view to be considered 'SysGrid Compliant'." 
             usage="Verify the Operational Contract before shipping a new module."
           />
           <LexiconEntry 
             term="Path Transparency" 
             definition="The requirement for settings and parameters to explicitly reveal their filesystem or API source." 
             usage="Settings fields must include FILE and PARAM metadata for Path Transparency."
           />
           <LexiconEntry 
             term="Impact Sensitivity" 
             definition="Color-coded risk classification for parameters (Critical, High, Medium, Low)." 
             usage="Apply Impact Sensitivity badges to all environment variables."
           />
           <LexiconEntry 
             term="Capability Matrix" 
             definition="A standardized set of features (Versioning, AdvancedEditor, LinkedKnowledge) supported across all modules." 
             usage="Check the Capability Matrix to see if a module supports forensic versioning."
           />
           <LexiconEntry 
             term="Segmented Navigation" 
             definition="The use of ToolbarSegmented controls for context switching within a view." 
             usage="Use Segmented Navigation over traditional tabs for layout parity."
           />
           <LexiconEntry 
             term="Golden Toast" 
             definition="Standardized notification system with gauges, exit confirm, and revert capability." 
             usage="Utilize showWorkspaceToast for all system feedback events."
           />
           <LexiconEntry 
             term="In-Situ Confirmation" 
             definition="A 'Same Button Location' confirmation pattern for destructive actions to prevent cognitive drift." 
             usage="Apply SameButtonConfirm to all delete/revoke actions."
           />
           <LexiconEntry 
             term="Natural Case Display" 
             definition="Mandatory use of standard case for raw data (names, departments). Avoids visual aggression of mandatory uppercase." 
             usage="Remove 'uppercase' class from data-driven labels and table cells."
           />
           <LexiconEntry 
             term="Vertical Flow" 
             definition="Standardized vertical spacing (space-y-4) between control headers and primary data surfaces." 
             usage="Reduce excessive gaps by standardizing on space-y-4 for top-level layout containers."
           />
           <LexiconEntry 
             term="Outer Join Analysis" 
             definition="The simultaneous comparison of raw variables from multiple environments (e.g., Backend vs Frontend .env)." 
             usage="Use Outer Join Analysis to debug configuration drift."
           />
        </div>
      </Section>

      <Section id="layout-directives" title="Layout & Composition Directives" description="Structural mandates for high-fidelity views">
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className="space-y-6">
               <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-600/10 text-blue-400 rounded-lg"><MapIcon size={20} /></div>
                  <h4 className="text-[12px] font-black uppercase text-white tracking-widest">Global Composition</h4>
               </div>
               <div className="space-y-4 border-l-2 border-blue-600/20 pl-6">
                  <div className="space-y-1">
                     <p className="text-[10px] font-black text-white uppercase tracking-widest">[01] Shell Header</p>
                     <p className="text-[9px] font-bold text-slate-500 uppercase leading-relaxed">Top-level navigation and identity bar. Fixed position.</p>
                  </div>
                  <div className="space-y-1">
                     <p className="text-[10px] font-black text-white uppercase tracking-widest">[02] Page Header</p>
                     <p className="text-[9px] font-bold text-slate-500 uppercase leading-relaxed">The primary title area. Requires Eyebrow, Title, and optional Subtitle.</p>
                  </div>
                  <div className="space-y-1">
                     <p className="text-[10px] font-black text-white uppercase tracking-widest">[03] Page Toolbar</p>
                     <p className="text-[9px] font-bold text-slate-500 uppercase leading-relaxed">The main interactive control surface. Houses Search and Segmented controls.</p>
                  </div>
                  <div className="space-y-1">
                     <p className="text-[10px] font-black text-white uppercase tracking-widest">[04] Operational Surface</p>
                     <p className="text-[9px] font-bold text-slate-500 uppercase leading-relaxed">The main content area (Grid or Form) using PanelSurface tokens.</p>
                  </div>
               </div>
            </div>
            <div className="space-y-6">
               <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-600/10 text-amber-400 rounded-lg"><Flag size={20} /></div>
                  <h4 className="text-[12px] font-black uppercase text-white tracking-widest">Mandatory Affordances</h4>
               </div>
               <div className="space-y-4 border-l-2 border-amber-600/20 pl-6">
                  <div className="space-y-1">
                     <p className="text-[10px] font-black text-white uppercase tracking-widest">Empty State Parity</p>
                     <p className="text-[9px] font-bold text-slate-500 uppercase leading-relaxed">All views MUST handle null data with WorkspaceEmptyState.</p>
                  </div>
                  <div className="space-y-1">
                     <p className="text-[10px] font-black text-white uppercase tracking-widest">Sticky Controls</p>
                     <p className="text-[9px] font-bold text-slate-500 uppercase leading-relaxed">Toolbars and Headers must remain sticky for high-density navigation.</p>
                  </div>
                  <div className="space-y-1">
                     <p className="text-[10px] font-black text-white uppercase tracking-widest">Feedback Continuity</p>
                     <p className="text-[9px] font-bold text-slate-500 uppercase leading-relaxed">Every primary action must trigger a Toast or visual state change.</p>
                  </div>
               </div>
            </div>
         </div>
      </Section>

      <Section id="notification-standards" title="Notification Standards" description="Golden Toast Protocol and Interactive Feedback" count={2}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
           <div className="space-y-6">
              <div className="flex items-center gap-3">
                 <div className="p-2 bg-emerald-600/10 text-emerald-400 rounded-lg"><Bell size={20} /></div>
                 <h4 className="text-[12px] font-black uppercase text-white tracking-widest">Golden Toast Protocol</h4>
              </div>
              <div className={`p-6 ${OPERATIONAL_WORKSPACE_VISUALS.panelSurface} border border-white/5 space-y-6`}>
                 <div className="flex items-center justify-between">
                    <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Active State Preview</p>
                    <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[6px] font-black rounded-lg">LIVE GAUGE</span>
                 </div>
                 
                 {/* Mock Toast */}
                 <div className="max-w-md w-full bg-[#0f172a]/95 backdrop-blur-xl border border-white/10 shadow-2xl rounded-lg flex flex-col overflow-hidden mx-auto">
                    <div className="flex items-center p-4">
                      <div className="h-8 w-8 rounded-lg bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                        <Check size={16} className="text-emerald-400" />
                      </div>
                      <div className="ml-3 flex-1">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-100">Operation Success</p>
                        <p className="mt-1 text-[12px] font-bold text-slate-400 leading-snug">Identity Matrix Synchronized</p>
                      </div>
                      <div className="ml-4 flex gap-2">
                         <div className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-[10px] font-black uppercase text-slate-300">Revert</div>
                         <div className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500"><X size={14} /></div>
                      </div>
                    </div>
                    <div className="h-0.5 w-full bg-white/5 overflow-hidden">
                       <div className="h-full bg-emerald-500 w-[65%]" />
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                       <p className="text-[9px] font-black text-white uppercase tracking-widest">Impact Gauge</p>
                       <p className="text-[8px] font-bold text-slate-500 uppercase leading-relaxed">Visual countdown of persistence window.</p>
                    </div>
                    <div className="space-y-1">
                       <p className="text-[9px] font-black text-white uppercase tracking-widest">Exit Confirm</p>
                       <p className="text-[8px] font-bold text-slate-500 uppercase leading-relaxed">Mandatory dismiss capability on all tiers.</p>
                    </div>
                 </div>
              </div>
           </div>

           <div className="space-y-6">
              <div className="flex items-center gap-3">
                 <div className="p-2 bg-rose-600/10 text-rose-400 rounded-lg"><ShieldAlert size={20} /></div>
                 <h4 className="text-[12px] font-black uppercase text-white tracking-widest">In-Situ Confirmation</h4>
              </div>
              <div className={`p-6 ${OPERATIONAL_WORKSPACE_VISUALS.panelSurface} border border-white/5 space-y-6`}>
                 <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Destructive Action Pattern</p>
                 
                 <div className="flex flex-col items-center gap-6 py-4">
                    <div className="flex items-center gap-12">
                       <div className="flex flex-col items-center gap-2">
                          <div className="p-2 bg-black/40 border border-white/5 text-rose-500/50 rounded-lg"><Trash2 size={20} /></div>
                          <span className="text-[7px] font-black uppercase text-slate-600 tracking-widest">REST STATE</span>
                       </div>
                       <ArrowRightLeft className="text-slate-800" size={16} />
                       <div className="flex flex-col items-center gap-2">
                          <div className="px-4 py-2 bg-rose-600 border border-rose-500 text-white rounded-lg flex items-center gap-2 shadow-lg shadow-rose-600/20">
                             <Trash2 size={16} />
                             <span className="text-[9px] font-black uppercase tracking-widest animate-pulse">Confirm?</span>
                          </div>
                          <span className="text-[7px] font-black uppercase text-rose-500 tracking-widest">ACTIVE STATE</span>
                       </div>
                    </div>
                    <p className="text-[9px] font-bold text-slate-500 uppercase text-center max-w-sm leading-relaxed">
                       Eliminates modal fatigue. Requires two clicks in the exact same physical location to execute destruction.
                    </p>
                 </div>
              </div>
           </div>
        </div>
      </Section>

      <Section id="visual-tokens" title="Visual Design Tokens" description="Canonical visual tokens used throughout the SysGrid Engine" count={visualTokens.length}>
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

      <Section id="radius-standards" title="Radius Standards" description="Standardized border-radius hierarchy visualized" count={radiusStandards.length}>
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4">
          {radiusStandards.map((radius) => (
            <div key={radius.label} className={`p-4 ${OPERATIONAL_WORKSPACE_VISUALS.panelSurface} group hover:border-blue-500/30 transition-all relative overflow-hidden`}>
              {radius.isStandard && (
                <div className="absolute top-0 right-0 bg-blue-600 px-2 py-0.5 text-[8px] font-black uppercase text-white rounded-bl shadow-lg">Standard</div>
              )}
              {(radius as any).deprecated && (
                <div className="absolute top-0 right-0 bg-rose-600 px-2 py-0.5 text-[8px] font-black uppercase text-white rounded-bl shadow-lg">Deprecated</div>
              )}
              <div className="flex flex-col items-center gap-3">
                <div className={`w-12 h-12 bg-blue-500/10 border-2 border-blue-500/30 ${radius.class} flex items-center justify-center`}>
                   {radius.icon ? <radius.icon size={16} className="text-blue-400/60" /> : <div className={`w-6 h-6 bg-blue-400/20 border border-blue-400/40 ${radius.isStandard ? 'rounded-lg' : radius.class.includes('sm') ? 'rounded-lg' : radius.class}`} />}
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-black text-slate-200">{radius.label}</p>
                  <p className="text-[8px] font-bold text-slate-500">{radius.value}</p>
                </div>
                <button 
                  onClick={() => { navigator.clipboard.writeText(radius.label); toast.success(`Copied: ${radius.label}`) }}
                  className="w-full py-1.5 bg-black/40 hover:bg-white/5 border border-white/5 rounded-lg text-[8px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-white transition-all"
                >
                  Copy
                </button>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section id="icon-registry" title="Iconography Registry" description="Standardized Lucide library usage and recommendations" count={activeIcons.length + recommendedIcons.length}>
        <div className="space-y-8">
           <div>
              <p className="text-[8px] font-black text-slate-600 uppercase tracking-[0.3em] mb-4">Active Library (In Use)</p>
              <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2">
                 {activeIcons.map(icon => <IconCard key={icon.name} {...icon} />)}
              </div>
           </div>
           <div>
              <p className="text-[8px] font-black text-blue-500/60 uppercase tracking-[0.3em] mb-4">Strategic Extension (Recommended)</p>
              <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2">
                 {recommendedIcons.map(icon => <IconCard key={icon.name} {...icon} isNew />)}
              </div>
           </div>
        </div>
      </Section>

      <Section id="capability-matrix" title="Capability Matrix" description="Standardized feature support across operational modules" count={capabilityEntries.length}>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
           {capabilityEntries.map(([key, adapter]) => (
             <div key={key} className={`p-6 ${OPERATIONAL_WORKSPACE_VISUALS.standardRadius} border border-white/5 bg-black/40 space-y-4`}>
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <div className={`p-2 bg-blue-600/10 ${OPERATIONAL_WORKSPACE_VISUALS.standardRadius} text-blue-400`}>
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
                   {adapter.hasVersioning && <div title="Versioning Support" className="p-1.5 bg-amber-500/10 rounded-lg text-amber-400"><HistoryIcon size={12} /></div>}
                   {adapter.hasAdvancedEditor && <div title="Advanced Code Editor" className="p-1.5 bg-emerald-500/10 rounded-lg text-emerald-400"><Code size={12} /></div>}
                   {adapter.hasLinkedKnowledge && <div title="Linked Knowledge Base" className="p-1.5 bg-blue-500/10 rounded-lg text-blue-400"><BookOpen size={12} /></div>}
                </div>
             </div>
           ))}
        </div>
      </Section>

      <Section id="typography" title="Typography & Headers" description="Standardized header hierarchy and alignment" count="L1-L6 Levels">
        <div className="space-y-12">
          <div className={`p-6 border border-white/5 ${OPERATIONAL_WORKSPACE_VISUALS.standardRadius} bg-black/20`}>
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
                 <span className={`px-1.5 py-0.5 bg-blue-500/10 text-blue-400 text-[6px] font-black ${OPERATIONAL_WORKSPACE_VISUALS.standardRadius} uppercase`}>3 Variations</span>
              </div>
              <WorkspacePanelTitle>Workspace Panel Title</WorkspacePanelTitle>
              <h1 className="text-2xl font-black uppercase tracking-tighter text-white">Large Section Header</h1>
              <h2 className="text-xl font-black uppercase tracking-tighter text-blue-500">Sub-Module Title</h2>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                 <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Text Metadata</p>
                 <span className={`px-1.5 py-0.5 bg-amber-500/10 text-amber-400 text-[6px] font-black ${OPERATIONAL_WORKSPACE_VISUALS.standardRadius} uppercase`}>Semantic</span>
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

      <Section id="interactive" title="Interactive Components" description="Buttons, toolbars, and control surfaces" count={12}>
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

      <Section id="modals" title="Modal Schemas" description="Visualization of standardized pop-up window sizes" count={modalSizes.length}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {modalSizes.map((size) => (
            <button
              key={size.id}
              onClick={() => setModalSize(size.id)}
              className={`p-6 ${OPERATIONAL_WORKSPACE_VISUALS.standardRadius} border border-white/5 bg-black/20 text-left hover:border-blue-500/40 hover:bg-blue-500/5 transition-all group relative overflow-hidden`}
            >
              <div className="absolute top-0 right-0 p-3">
                 <span className="text-[6px] font-mono text-slate-700 uppercase group-hover:text-blue-500/40 transition-colors">{size.spec}</span>
              </div>
              <div className={`w-10 h-10 ${OPERATIONAL_WORKSPACE_VISUALS.standardRadius} bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-4 group-hover:scale-110 transition-transform`}>
                {size.id === 'fullscreen' ? <Maximize2 size={20} /> : size.id === 'compact' ? <Minimize2 size={20} /> : <Layout size={20} />}
              </div>
              <h4 className="text-[11px] font-black uppercase text-white tracking-widest">{size.label}</h4>
              <p className="mt-2 text-[9px] font-bold text-slate-500 uppercase leading-relaxed tracking-tight">{size.description}</p>
            </button>
          ))}
        </div>
      </Section>

      <Section id="empty-states" title="Empty States" description="Visual cues for missing or pending data" count={1}>
        <WorkspaceEmptyState 
          icon={<Package size={32} />}
          title="No Active Deployments Found"
          description="The monitoring engine has not detected any active infrastructure nodes in this sector. Verify connectivity and authentication parameters."
          action={<ToolbarButton variant="primary">Initialize Sector</ToolbarButton>}
        />
      </Section>

      <Section id="operational-contract" title="Operational Workspace Contract" description="The behavioral and structural mandate for all high-fidelity views" count="Global Protocol">
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
                  <div className={`mt-1 flex h-3 w-3 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-blue-400`}>
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
                  <div className={`mt-1 flex h-3 w-3 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-400`}>
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
              <div className={`p-8 border border-dashed border-white/10 bg-black/20 flex flex-col items-center justify-center text-center ${OPERATIONAL_WORKSPACE_VISUALS.standardRadius}`}>
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
                  <div className={`h-20 bg-white/5 ${OPERATIONAL_WORKSPACE_VISUALS.standardRadius} border border-white/5`} />
                </WorkspaceSectionCard>
                <WorkspaceSectionCard>
                   <div className="flex items-center justify-between mb-4">
                      <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Module Beta</p>
                      <WorkspaceSectionBadge tone="emerald">Active</WorkspaceSectionBadge>
                   </div>
                  <div className={`h-20 bg-white/5 ${OPERATIONAL_WORKSPACE_VISUALS.standardRadius} border border-white/5`} />
                </WorkspaceSectionCard>
              </div>
            </div>
          </WorkspaceModal>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
