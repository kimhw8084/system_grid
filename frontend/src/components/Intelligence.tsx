import React, { useState } from 'react'
import { Upload, FileText, CheckCircle2, Clipboard, Download, AlertCircle } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'

export default function Intelligence() {
  const [dragActive, setDragActive] = useState(false)
  const [pasteData, setPasteData] = useState('')
  const queryClient = useQueryClient()

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      return fetch('/api/v1/import/csv', { method: 'POST', body: formData })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] })
      alert('Import Successful')
    }
  })

  const handleDownloadTemplate = () => {
    window.location.href = '/api/v1/import/template'
  }

  const handlePasteImport = async () => {
    // In real MVP, convert text to Blob/File and upload
    const blob = new Blob([pasteData], { type: 'text/csv' })
    const file = new File([blob], 'pasted_data.csv')
    importMutation.mutate(file)
  }

  return (
    <div className="h-full flex flex-col space-y-8 max-w-5xl mx-auto overflow-y-auto custom-scrollbar pr-4">
      <div className="text-center space-y-2 mt-8">
        <h1 className="text-3xl font-black tracking-tighter uppercase">Intelligent Bulk Provisioning</h1>
        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Guided ingestion for complex infrastructure relations</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Upload Sector */}
        <div 
          onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => { e.preventDefault(); setDragActive(false); if(e.dataTransfer.files[0]) importMutation.mutate(e.dataTransfer.files[0]) }}
          className={`glass-panel p-12 rounded-3xl border-2 border-dashed transition-all flex flex-col items-center justify-center text-center space-y-6 ${dragActive ? 'border-blue-500 bg-blue-500/10' : 'border-white/10 bg-slate-900/20'}`}
        >
          <div className="w-20 h-20 bg-blue-500/10 rounded-3xl flex items-center justify-center">
            <Upload size={40} className="text-blue-500" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold uppercase tracking-tighter">Drop Infrastructure CSV</h3>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed">
              Drag file here or <label className="text-blue-400 cursor-pointer hover:underline">browse<input type="file" className="hidden" onChange={(e) => e.target.files && importMutation.mutate(e.target.files[0])} accept=".csv"/></label>
            </p>
          </div>
        </div>

        {/* Clipboard Sector */}
        <div className="glass-panel p-8 rounded-3xl bg-slate-900/20 border border-white/5 flex flex-col space-y-4">
           <div className="flex items-center space-x-3">
              <Clipboard size={18} className="text-amber-400" />
              <h3 className="font-bold text-sm uppercase tracking-widest">Paste from Clipboard</h3>
           </div>
           <textarea 
             value={pasteData}
             onChange={(e) => setPasteData(e.target.value)}
             className="flex-1 min-h-[120px] bg-slate-950/50 border border-white/5 rounded-xl p-4 text-[10px] font-mono outline-none focus:border-amber-500/30" 
             placeholder="hostname,system,model...&#10;SRV-01,ERP,R740..."
           />
           <button 
             onClick={handlePasteImport}
             className="w-full py-3 bg-amber-600/10 text-amber-400 border border-amber-600/20 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-600/20 transition-all"
           >
             Commit Clipboard Data
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel p-6 rounded-2xl border-l-4 border-l-blue-500">
           <div className="flex items-center justify-between mb-4">
              <h4 className="font-black text-[10px] uppercase tracking-widest text-slate-400">1. Ingestion Blueprint</h4>
              <button onClick={handleDownloadTemplate} className="p-2 bg-blue-500/10 rounded-lg hover:bg-blue-500/20 text-blue-400 transition-all"><Download size={16}/></button>
           </div>
           <p className="text-[10px] text-slate-500 leading-relaxed uppercase font-bold">Standardized CSV template supporting multi-relational mapping (HW/SW/ENT).</p>
        </div>

        <div className="glass-panel p-6 rounded-2xl border-l-4 border-l-emerald-500">
           <div className="flex items-center space-x-3 mb-4">
              <CheckCircle2 size={18} className="text-emerald-400" />
              <h4 className="font-black text-[10px] uppercase tracking-widest text-slate-400">2. Relational Handling</h4>
           </div>
           <p className="text-[10px] text-slate-500 leading-relaxed uppercase font-bold">Supports 1:N (HW components) and N:1 (System groupings) via smart primary keys.</p>
        </div>

        <div className="glass-panel p-6 rounded-2xl border-l-4 border-l-rose-500">
           <div className="flex items-center space-x-3 mb-4">
              <AlertCircle size={18} className="text-rose-400" />
              <h4 className="font-black text-[10px] uppercase tracking-widest text-slate-400">3. Conflict Resolution</h4>
           </div>
           <p className="text-[10px] text-slate-500 leading-relaxed uppercase font-bold">Atomic ingestion prevents data corruption. Duplicates are merged or flagged.</p>
        </div>
      </div>
    </div>
  )
}
