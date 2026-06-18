import React, { useState } from 'react'
import { History as HistoryIcon, Clock, Share2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useEscapeDismiss, useBodyModalFlag } from '../shared/OperationalWorkspacePrimitives'
import { WorkspaceModal } from '../shared/WorkspaceModal'
import { WorkspaceHistoryShell } from '../shared/WorkspaceModalShells'
import { ToolbarButton } from '../shared/LayoutPrimitives'

export function ConfigHistoryModal({ field, versions, onClose, onRevert }: { field: string, versions: any[], onClose: () => void, onRevert: (val: string) => void }) {
  useEscapeDismiss(onClose)
  useBodyModalFlag()
  const [isMaximized, setIsMaximized] = useState(false)
  const [selectedIndices, setSelectedIndices] = useState<number[]>([0])

  const toggleSelection = (idx: number) => {
    if (selectedIndices.includes(idx)) {
       if (selectedIndices.length > 1) {
          setSelectedIndices(selectedIndices.filter(i => i !== idx))
       }
    } else {
       if (selectedIndices.length === 2) {
          setSelectedIndices([selectedIndices[1], idx])
       } else {
          setSelectedIndices([...selectedIndices, idx].sort((a, b) => a - b))
       }
    }
  }

  const indexedVersions = (versions || []).map((v, i) => ({
    ...v,
    v_num: versions.length - i,
    label: v.timestamp
  }))

  const newer = indexedVersions?.[Math.min(...selectedIndices)]
  const older = selectedIndices.length > 1 
    ? indexedVersions?.[Math.max(...selectedIndices)] 
    : (selectedIndices[0] + 1 < indexedVersions.length ? indexedVersions[selectedIndices[0] + 1] : null)

  return (
    <WorkspaceModal
      isOpen={true}
      onClose={onClose}
      size="workspace"
      isMaximized={isMaximized}
      onMaximizeToggle={() => setIsMaximized(!isMaximized)}
      title={
        <div className="flex items-center gap-3">
          Parameter Revision History
          <button
            onClick={() => {
              const url = new URL(window.location.href);
              url.searchParams.set('history_field', String(field));
              navigator.clipboard.writeText(url.toString());
              toast.success("Direct link copied to clipboard");
            }}
            className="text-slate-500 hover:text-blue-400 transition-colors p-1"
            title="Share direct link"
          >
            <Share2 size={16} />
          </button>
        </div>
      }
      subtitle={`Auditing state vectors for ${field}`}
      icon={<HistoryIcon size={20} />}
      footerRight={
        <ToolbarButton onClick={onClose}>Dismiss</ToolbarButton>
      }
    >
      <WorkspaceHistoryShell
          header={null}
          sidebar={
           <div className="flex h-full flex-col min-h-0">
              <div className="mb-4 flex items-center justify-between px-1">
                 <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Revision Timeline</h3>
                 <span className="text-[9px] font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-lg border border-blue-500/20">{indexedVersions.length} states</span>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2">
                {indexedVersions.map((h: any, idx: number) => {
                  const isSelected = selectedIndices.includes(idx);
                  return (
                    <button 
                      key={idx}
                      onClick={() => toggleSelection(idx)}
                      className={`w-full p-4 rounded-lg border text-left transition-all relative group overflow-hidden ${
                        isSelected 
                          ? 'bg-blue-600/20 border-blue-500/40 shadow-lg shadow-blue-500/5' 
                          : 'bg-white/5 border-white/5 hover:border-white/10'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                         <span className={`text-[11px] font-black tracking-tighter ${isSelected ? 'text-white' : 'text-blue-400'}`}>v{h.v_num}</span>
                         <span className={`text-[8px] font-black uppercase ${isSelected ? 'text-blue-400' : 'text-slate-500'}`}>
                            {h.timestamp?.split(' ')[1]}
                         </span>
                      </div>
                      <p className={`text-[10px] font-bold leading-tight line-clamp-2 ${isSelected ? 'text-white/90' : 'text-slate-300'}`}>
                         By: {h.user || 'System'}
                      </p>
                      <div className="mt-3 flex items-center justify-between">
                         <div className="flex items-center gap-1.5">
                            <Clock size={10} className="text-slate-600" />
                            <span className="text-[8px] font-bold text-slate-600">{h.timestamp?.split(' ')[0]}</span>
                         </div>
                         <button 
                            onClick={(e) => { e.stopPropagation(); onRevert(h.new_value); }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-[8px] font-black uppercase text-amber-500 hover:text-amber-400"
                         >
                            Restore Vector
                         </button>
                      </div>
                    </button>
                  )
                })}
              </div>
           </div>
          }
          content={
           <>
              <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5 backdrop-blur-md sticky top-0 z-10">
                 <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                       <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 text-[12px] font-black">{newer?.v_num}</div>
                       <div className="w-4 h-px bg-slate-700" />
                       <div className="w-8 h-8 rounded-lg bg-slate-800 border border-white/10 flex items-center justify-center text-slate-500 text-[12px] font-black">{older ? older.v_num : 'Ø'}</div>
                    </div>
                    <div>
                       <h3 className="text-[11px] font-black text-slate-300 uppercase tracking-widest">Semantic Delta</h3>
                       <p className="text-[9px] font-bold text-slate-600">Comparison of property states for {field}</p>
                    </div>
                 </div>
              </div>
           </>
          }
      />
    </WorkspaceModal>
  )
}
