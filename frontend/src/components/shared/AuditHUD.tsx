import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock3,
  ExternalLink,
  Filter,
  Sparkles,
  Wrench,
  X
} from 'lucide-react'
import { FEATURE_AUDIT_ITEMS, FeatureAuditItem, FeatureAuditStatus } from './featureAudit'

const STORAGE_KEY = 'sysgrid_feature_audit_v2'

const STATUS_META: Record<FeatureAuditStatus, { label: string, tone: string, chip: string, icon: any }> = {
  unreviewed: {
    label: 'Unreviewed',
    tone: 'text-slate-300',
    chip: 'bg-slate-700/40 border-white/10 text-slate-300',
    icon: Clock3
  },
  validated: {
    label: 'Validated',
    tone: 'text-emerald-400',
    chip: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    icon: CheckCircle2
  },
  followup: {
    label: 'Follow-up Needed',
    tone: 'text-amber-400',
    chip: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
    icon: Wrench
  },
  problematic: {
    label: 'Still Problematic',
    tone: 'text-rose-400',
    chip: 'bg-rose-500/10 border-rose-500/20 text-rose-400',
    icon: AlertTriangle
  },
  not_applicable: {
    label: 'Not Applicable',
    tone: 'text-blue-400',
    chip: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
    icon: Filter
  }
}

type SavedState = Record<string, { status: FeatureAuditStatus }>

const loadState = (): SavedState => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw)
  } catch (error) {
    console.error('Feature audit state hydration failure:', error)
    return {}
  }
}

const saveState = (next: SavedState) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
}

const getStatus = (state: SavedState, item: FeatureAuditItem): FeatureAuditStatus =>
  state[item.id]?.status || 'unreviewed'

export const AuditHUD = () => {
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const [activeFilter, setActiveFilter] = useState<'all' | FeatureAuditStatus>('all')
  const [savedState, setSavedState] = useState<SavedState>(() => loadState())
  const [modalOpen, setModalOpen] = useState(false)

  React.useEffect(() => {
    if (typeof document === 'undefined') return
    const sync = () => setModalOpen(document.body.dataset.sysgridModalOpen === 'true')
    sync()
    const observer = new MutationObserver(sync)
    observer.observe(document.body, { attributes: true, attributeFilter: ['data-sysgrid-modal-open'] })
    return () => observer.disconnect()
  }, [])

  const items = useMemo(() => {
    if (activeFilter === 'all') return FEATURE_AUDIT_ITEMS
    return FEATURE_AUDIT_ITEMS.filter(item => getStatus(savedState, item) === activeFilter)
  }, [activeFilter, savedState])

  const counts = useMemo(() => {
    return FEATURE_AUDIT_ITEMS.reduce<Record<FeatureAuditStatus, number>>((acc, item) => {
      const status = getStatus(savedState, item)
      acc[status] += 1
      return acc
    }, {
      unreviewed: 0,
      validated: 0,
      followup: 0,
      problematic: 0,
      not_applicable: 0
    })
  }, [savedState])

  const unresolvedCount = counts.unreviewed + counts.followup + counts.problematic

  const updateStatus = (id: string, status: FeatureAuditStatus) => {
    const next = { ...savedState, [id]: { status } }
    setSavedState(next)
    saveState(next)
  }

  const reset = () => {
    setSavedState({})
    localStorage.removeItem(STORAGE_KEY)
  }

  return (
    <div className={`feature-audit-hud fixed bottom-6 right-6 z-[9999] ${modalOpen ? 'pointer-events-none opacity-40' : ''}`}>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.96 }}
            className="mb-4 w-[460px] overflow-hidden rounded-3xl border border-blue-500/20 bg-slate-950/95 shadow-[0_0_60px_rgba(37,99,235,0.16)] backdrop-blur-2xl pointer-events-auto"
          >
            <div className="border-b border-white/10 bg-gradient-to-r from-blue-600/10 to-transparent p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl bg-blue-600 p-2.5 text-white shadow-lg shadow-blue-600/30">
                    <ClipboardList size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-[0.25em] text-white">Feature Audit</h3>
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-blue-300/80">
                      In-app rollout tracker and verification guide
                    </p>
                  </div>
                </div>
                <button onClick={() => setIsOpen(false)} className="text-slate-500 transition-colors hover:text-white">
                  <X size={18} />
                </button>
              </div>

              <div className="mt-5 grid grid-cols-4 gap-2">
                {([
                  ['validated', counts.validated],
                  ['followup', counts.followup],
                  ['problematic', counts.problematic],
                  ['unreviewed', counts.unreviewed]
                ] as Array<[FeatureAuditStatus, number]>).map(([status, count]) => {
                  const meta = STATUS_META[status]
                  return (
                    <button
                      key={status}
                      onClick={() => setActiveFilter(activeFilter === status ? 'all' : status)}
                      className={`rounded-2xl border p-3 text-left transition-all ${activeFilter === status ? meta.chip : 'border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/20'}`}
                    >
                      <div className="text-[8px] font-black uppercase tracking-[0.22em]">{meta.label}</div>
                      <div className="mt-1 text-xl font-black tabular-nums">{count}</div>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="border-b border-white/10 bg-black/20 px-6 py-3">
              <div className="flex items-center justify-between">
                <div className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
                  {activeFilter === 'all' ? 'Showing all features' : `Filter: ${STATUS_META[activeFilter].label}`}
                </div>
                <button onClick={reset} className="text-[9px] font-bold uppercase tracking-widest text-slate-600 transition-colors hover:text-rose-400">
                  Reset State
                </button>
              </div>
            </div>

            <div className="max-h-[560px] space-y-3 overflow-y-auto p-4 custom-scrollbar">
              {items.map(item => {
                const status = getStatus(savedState, item)
                const statusMeta = STATUS_META[status]
                const StatusIcon = statusMeta.icon

                return (
                  <div key={item.id} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-md bg-white/5 px-2 py-1 text-[8px] font-black uppercase tracking-[0.2em] text-slate-400">
                            {item.category}
                          </span>
                          <span className={`rounded-md border px-2 py-1 text-[8px] font-black uppercase tracking-[0.2em] ${
                            item.type === 'new'
                              ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                              : item.type === 'fixed'
                                ? 'border-blue-500/20 bg-blue-500/10 text-blue-400'
                                : 'border-amber-500/20 bg-amber-500/10 text-amber-400'
                          }`}>
                            {item.type}
                          </span>
                          <span className={`rounded-md border px-2 py-1 text-[8px] font-black uppercase tracking-[0.2em] ${statusMeta.chip}`}>
                            <StatusIcon size={10} className="mr-1 inline-block" /> {statusMeta.label}
                          </span>
                        </div>
                        <div>
                          <h4 className="text-[12px] font-black uppercase tracking-tight text-white">{item.title}</h4>
                          <p className="mt-1 text-[10px] font-medium leading-relaxed text-slate-400">{item.summary}</p>
                        </div>
                      </div>

                      <button
                        onClick={() => navigate(item.route)}
                        className="rounded-xl border border-white/10 bg-white/[0.03] p-2 text-slate-400 transition-all hover:border-blue-500/30 hover:text-blue-400"
                        title="Open target view"
                      >
                        <ExternalLink size={14} />
                      </button>
                    </div>

                    <div className="mt-4 rounded-2xl border border-blue-500/10 bg-blue-500/[0.04] p-3">
                      <p className="mb-2 text-[8px] font-black uppercase tracking-[0.25em] text-blue-400">How To Verify</p>
                      <div className="space-y-1.5">
                        {item.verification.map((step, index) => (
                          <p key={index} className="text-[9px] font-bold uppercase leading-tight text-slate-300">
                            {index + 1}. {step}
                          </p>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2">
                      {([
                        'validated',
                        'followup',
                        'problematic',
                        'not_applicable'
                      ] as FeatureAuditStatus[]).map(nextStatus => {
                        const meta = STATUS_META[nextStatus]
                        return (
                          <button
                            key={nextStatus}
                            onClick={() => updateStatus(item.id, nextStatus)}
                            className={`rounded-xl border px-3 py-2 text-[9px] font-black uppercase tracking-widest transition-all ${
                              status === nextStatus
                                ? meta.chip
                                : 'border-white/10 bg-black/20 text-slate-400 hover:border-white/20 hover:text-white'
                            }`}
                          >
                            {meta.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        layoutId="feature-audit-toggle"
        onClick={() => setIsOpen(!isOpen)}
        disabled={modalOpen}
        className={`group flex items-center gap-3 rounded-full px-6 py-4 shadow-2xl transition-all active:scale-95 ${
          unresolvedCount > 0
            ? 'bg-blue-600 text-white shadow-blue-600/25'
            : 'border border-white/10 bg-slate-900 text-slate-300'
        } ${modalOpen ? 'pointer-events-none' : 'pointer-events-auto'}`}
      >
        <div className="relative">
          <Sparkles size={20} />
          {unresolvedCount > 0 && (
            <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-blue-600 bg-amber-400 animate-pulse" />
          )}
        </div>
        <div className="text-left">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] leading-none">Feature Audit</p>
          <p className="mt-1 text-[8px] font-bold uppercase tracking-widest text-blue-100/80">
            {counts.validated}/{FEATURE_AUDIT_ITEMS.length} validated
          </p>
        </div>
        <ChevronRight size={16} className={`transition-transform duration-300 ${isOpen ? 'rotate-90' : ''}`} />
      </motion.button>
    </div>
  )
}
