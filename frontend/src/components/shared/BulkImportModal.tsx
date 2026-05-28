import React, { useState, useRef } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { 
  Upload, Check, X, AlertCircle, FileText, Download, 
  RefreshCcw, Database, Terminal, ChevronRight, Layout, Info,
  Clipboard, FileUp, Copy, Trash2
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { apiFetch } from "../../api/apiClient"
import toast from "react-hot-toast"

interface BulkImportModalProps {
  isOpen: boolean
  onClose: () => void
  tableName: string
  displayName: string
}

export function BulkImportModal({ isOpen, onClose, tableName, displayName }: BulkImportModalProps) {
  const [step, setStep] = useState<'upload' | 'audit' | 'confirm'>('upload')
  const [uploadMode, setUploadMode] = useState<'file' | 'paste'>('file')
  const [file, setFile] = useState<File | null>(null)
  const [pastedData, setPastedData] = useState<string>("")
  const [auditResults, setAuditResults] = useState<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()

  const auditMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData()
      
      if (uploadMode === 'file') {
        if (!file) throw new Error("No file selected")
        formData.append("file", file)
      } else {
        if (!pastedData.trim()) throw new Error("No data pasted")
        const blob = new Blob([pastedData], { type: 'text/csv' })
        formData.append("file", blob, "pasted_data.csv")
      }

      const res = await apiFetch(`/api/v1/import/audit?table_name=${tableName}`, {
        method: "POST",
        body: formData,
        headers: {}
      })
      if (!res.ok) throw new Error(await res.text())
      return res.json()
    },
    onSuccess: (data) => {
      setAuditResults(data)
      setStep('audit')
    },
    onError: (e: any) => {
      toast.error(`Audit Failed: ${e.message}`)
    }
  })

  const executeMutation = useMutation({
    mutationFn: async (validData: any[]) => {
      const res = await apiFetch(`/api/v1/import/execute?table_name=${tableName}`, {
        method: "POST",
        body: JSON.stringify(validData)
      })
      if (!res.ok) throw new Error(await res.text())
      return res.json()
    },
    onSuccess: (data) => {
      if (data.status === "success") {
        toast.success(`Successfully imported ${data.count} records`)
        queryClient.invalidateQueries()
        onClose()
        reset()
      } else {
        toast.error(`Ingestion Failed: ${data.errors?.join(", ")}`)
      }
    },
    onError: (e: any) => {
      toast.error(`Ingestion Failed: ${e.message}`)
    }
  })

  const reset = () => {
    setStep('upload')
    setFile(null)
    setPastedData("")
    setAuditResults(null)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const handleDownloadTemplate = () => {
    window.open(`${window.location.origin}/api/v1/import/template/${tableName}`, '_blank')
  }

  const validRows = auditResults?.results?.filter((r: any) => r.status === "VALID") || []
  const invalidRows = auditResults?.results?.filter((r: any) => r.status === "INVALID") || []

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 lg:p-12">
        <motion.div 
          initial={{ scale: 0.98, opacity: 0, y: 20 }} 
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.98, opacity: 0, y: 20 }}
          className="glass-panel w-full max-w-[95vw] h-[90vh] overflow-hidden flex flex-col p-6 lg:p-10 rounded-3xl border border-blue-500/30 shadow-[0_0_100px_rgba(0,0,0,0.8)]"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/5 pb-8">
            <div className="flex items-center space-x-6">
               <div className="p-4 bg-gradient-to-br from-blue-600 to-blue-800 text-white rounded-2xl shadow-2xl shadow-blue-500/30">
                  <Database size={32} />
               </div>
               <div>
                  <h2 className="text-3xl font-black uppercase text-white tracking-tighter leading-none">
                    Data Ingestion <span className="text-blue-500">Pipeline</span>
                  </h2>
                  <div className="flex items-center gap-4 mt-3">
                    <p className="text-[10px] text-slate-400 uppercase font-black tracking-[0.3em] flex items-center gap-2">
                      <Layout size={12} className="text-blue-500" /> Target Matrix: <span className="text-white bg-blue-500/20 px-2 py-0.5 rounded">{displayName}</span>
                    </p>
                    <p className="text-[10px] text-slate-400 uppercase font-black tracking-[0.3em] flex items-center gap-2">
                      <Terminal size={12} className="text-blue-500" /> Table: <span className="text-white bg-white/5 px-2 py-0.5 rounded">{tableName}</span>
                    </p>
                  </div>
               </div>
            </div>
            <button 
              onClick={onClose} 
              className="text-slate-500 hover:text-rose-500 transition-all p-3 hover:bg-rose-500/10 rounded-xl"
            >
              <X size={32}/>
            </button>
          </div>

          {/* Stepper */}
          <div className="flex items-center justify-center gap-12 py-8 border-b border-white/5 bg-white/[0.02]">
             {[
               { id: 'upload', icon: Upload, label: 'Source Setup' },
               { id: 'audit', icon: Terminal, label: 'Neural Audit' },
               { id: 'confirm', icon: Check, label: 'Final Ingestion' }
             ].map((s, i) => (
               <React.Fragment key={s.id}>
                 <div className={`flex items-center gap-4 transition-all ${step === s.id ? 'text-blue-400 scale-110' : 'text-slate-600'}`}>
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 transition-all shadow-lg ${step === s.id ? 'border-blue-500 bg-blue-500/20 shadow-blue-500/20' : 'border-slate-800 bg-black/40'}`}>
                       <s.icon size={20} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em]">Step 0{i+1}</span>
                      <span className="text-[11px] font-black uppercase tracking-widest">{s.label}</span>
                    </div>
                 </div>
                 {i < 2 && <div className="h-px w-16 bg-gradient-to-r from-transparent via-slate-800 to-transparent" />}
               </React.Fragment>
             ))}
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-10 bg-black/20">
            {step === 'upload' && (
              <div className="h-full flex flex-col space-y-10">
                 <div className="flex flex-col items-center text-center space-y-6">
                    <h3 className="text-2xl font-black uppercase text-white tracking-[0.2em]">Select Ingestion Method</h3>
                    
                    <div className="flex bg-black/40 p-2 rounded-2xl border border-white/5 w-full max-w-xl">
                      <button 
                        onClick={() => setUploadMode('file')}
                        className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${uploadMode === 'file' ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/20' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                      >
                        <FileUp size={16} /> File Upload
                      </button>
                      <button 
                        onClick={() => setUploadMode('paste')}
                        className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${uploadMode === 'paste' ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/20' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                      >
                        <Clipboard size={16} /> Clipboard Paste
                      </button>
                    </div>
                 </div>

                 <div className="flex-1 flex items-center justify-center">
                    {uploadMode === 'file' ? (
                      <div className="w-full max-w-2xl space-y-6">
                        <label 
                          onClick={() => fileInputRef.current?.click()}
                          className="relative block w-full aspect-[21/9] border-4 border-dashed border-white/10 rounded-[2rem] hover:border-blue-500/50 hover:bg-blue-500/5 transition-all cursor-pointer group overflow-hidden"
                        >
                           <input 
                              type="file" 
                              ref={fileInputRef}
                              className="hidden" 
                              accept=".csv,.xlsx,.xls" 
                              onChange={handleFileChange} 
                           />
                           <div className="absolute inset-0 flex flex-col items-center justify-center space-y-6">
                              {file ? (
                                 <motion.div 
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    className="flex flex-col items-center gap-4"
                                 >
                                    <div className="p-6 bg-emerald-500/20 rounded-3xl border border-emerald-500/30">
                                      <Check className="text-emerald-500" size={48} />
                                    </div>
                                    <div className="text-center">
                                      <span className="text-xl font-black uppercase text-white block">{file.name}</span>
                                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2 block">{(file.size / 1024).toFixed(2)} KB • {file.type || 'Binary'}</span>
                                    </div>
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); setFile(null); }}
                                      className="text-[10px] font-black text-rose-500 uppercase hover:underline"
                                    >
                                      Remove File
                                    </button>
                                 </motion.div>
                              ) : (
                                 <>
                                    <div className="p-6 bg-blue-500/10 rounded-3xl border border-blue-500/20 group-hover:scale-110 transition-transform duration-500">
                                      <Upload className="text-blue-500" size={48} />
                                    </div>
                                    <div className="text-center space-y-2">
                                      <span className="text-lg font-black uppercase text-slate-400 group-hover:text-white transition-colors block">Click to browse file</span>
                                      <span className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] block">Fast system explorer (XLSX, CSV)</span>
                                    </div>
                                 </>
                              )}
                           </div>
                        </label>
                      </div>
                    ) : (
                      <div className="w-full h-full max-w-5xl flex flex-col space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
                            <Copy size={12} /> Paste CSV Data Below (comma or tab separated)
                          </span>
                          {pastedData && (
                            <button 
                              onClick={() => setPastedData("")}
                              className="text-[10px] font-black text-rose-500 uppercase flex items-center gap-2 hover:bg-rose-500/10 px-3 py-1 rounded-lg transition-all"
                            >
                              <Trash2 size={12} /> Clear Data
                            </button>
                          )}
                        </div>
                        <textarea 
                          value={pastedData}
                          onChange={(e) => setPastedData(e.target.value)}
                          placeholder="Column 1, Column 2, Column 3..."
                          className="flex-1 w-full bg-black/40 border-2 border-white/5 rounded-2xl p-6 font-mono text-sm text-blue-400 focus:border-blue-500/50 outline-none transition-all resize-none min-h-[300px]"
                        />
                      </div>
                    )}
                 </div>

                 <div className="flex justify-center items-center gap-8 border-t border-white/5 pt-10">
                    <button 
                        onClick={handleDownloadTemplate}
                        className="flex items-center gap-3 px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-black uppercase text-[10px] tracking-widest transition-all border border-white/10"
                    >
                        <Download size={16} className="text-blue-500" /> Download {tableName} Template
                    </button>
                    <div className="flex items-center gap-3 p-3 bg-amber-500/10 rounded-xl border border-amber-500/20">
                      <Info size={16} className="text-amber-500" />
                      <span className="text-[9px] font-black text-amber-500/80 uppercase tracking-widest">
                        Data will be validated against server-side model constraints
                      </span>
                    </div>
                 </div>
              </div>
            )}

            {step === 'audit' && auditResults && (
              <div className="space-y-10">
                 <div className="grid grid-cols-4 gap-6">
                    {[
                      { label: 'Total Scanned', val: auditResults.total_rows, color: 'text-white', icon: Database, bg: 'bg-white/5' },
                      { label: 'Neural Valid', val: auditResults.valid_rows, color: 'text-emerald-400', icon: Check, bg: 'bg-emerald-500/10' },
                      { label: 'Logic Errors', val: auditResults.invalid_rows, color: 'text-rose-400', icon: X, bg: 'bg-rose-500/10' },
                      { label: 'Constraint Violations', val: auditResults.total_errors, color: 'text-amber-500', icon: AlertCircle, bg: 'bg-amber-500/10' }
                    ].map(s => (
                      <div key={s.label} className={`p-6 ${s.bg} border border-white/5 rounded-2xl flex flex-col items-center gap-4 shadow-xl`}>
                         <s.icon size={24} className={s.color} />
                         <span className={`text-4xl font-black ${s.color}`}>{s.val}</span>
                         <span className="text-[9px] font-black uppercase text-slate-500 tracking-[0.3em]">{s.label}</span>
                      </div>
                    ))}
                 </div>

                 <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="text-xs font-black uppercase text-slate-400 tracking-[0.3em] flex items-center gap-3">
                         <Terminal size={16} className="text-blue-500" /> Neural Audit Diagnostic Report
                      </h4>
                      <span className="text-[9px] font-black text-slate-600 uppercase">Engine V4.2.0 • Real-time Validation</span>
                    </div>

                    <div className="bg-black/60 border border-white/5 rounded-[2rem] overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                       <div className="max-h-[45vh] overflow-y-auto custom-scrollbar">
                          <table className="w-full text-left border-collapse">
                             <thead className="sticky top-0 bg-[#0d0e12] z-10">
                                <tr className="text-[9px] font-black uppercase text-slate-500 tracking-[0.2em] border-b border-white/5">
                                   <th className="p-6">Registry Index</th>
                                   <th className="p-6">Health Status</th>
                                   <th className="p-6">Diagnostic Findings</th>
                                </tr>
                             </thead>
                             <tbody>
                                {auditResults.results.map((r: any, i: number) => (
                                   <tr key={i} className={`border-b border-white/5 hover:bg-white/[0.03] transition-colors ${r.status === 'INVALID' ? 'bg-rose-500/5' : ''}`}>
                                      <td className="p-6 text-xs font-mono text-slate-500">#{r.row.toString().padStart(4, '0')}</td>
                                      <td className="p-6">
                                         <span className={`px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm ${r.status === 'VALID' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/20 text-rose-400 border border-rose-500/20'}`}>
                                            {r.status}
                                         </span>
                                      </td>
                                      <td className="p-6">
                                         {r.status === 'VALID' ? (
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight flex items-center gap-2">
                                              <Check size={12} className="text-emerald-500" /> Schema Compliant - Ready for Ingestion
                                            </span>
                                         ) : (
                                            <div className="flex flex-col gap-2">
                                               {r.errors.map((err: string, j: number) => (
                                                  <div key={j} className="flex items-center gap-3 text-rose-400">
                                                     <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]" />
                                                     <span className="text-[10px] font-black uppercase tracking-tight">{err}</span>
                                                  </div>
                                               ))}
                                            </div>
                                         )}
                                      </td>
                                   </tr>
                                ))}
                             </tbody>
                          </table>
                       </div>
                    </div>
                 </div>

                 {invalidRows.length > 0 && (
                    <div className="p-6 bg-amber-500/5 border border-amber-500/20 rounded-2xl flex items-start gap-6 animate-pulse">
                       <AlertCircle size={32} className="text-amber-500 shrink-0" />
                       <div className="space-y-2">
                          <p className="text-sm font-black text-amber-500 uppercase tracking-widest">Partial Sync Intelligence</p>
                          <p className="text-[10px] font-bold text-amber-500/60 uppercase leading-relaxed max-w-4xl">
                             The engine detected {invalidRows.length} non-compliant records. If you proceed, only the neural-verified rows ({validRows.length}) will be committed to the master database. We recommend full correction for absolute data integrity.
                          </p>
                       </div>
                    </div>
                 )}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="border-t border-white/5 pt-8 flex justify-between items-center bg-white/[0.02] p-10 rounded-b-3xl">
             <button 
                onClick={reset}
                className="px-10 py-4 border border-white/10 text-slate-500 hover:text-white hover:bg-rose-500/10 hover:border-rose-500/20 rounded-2xl font-black uppercase text-[11px] tracking-[0.2em] transition-all flex items-center gap-3"
             >
                {step === 'upload' ? <X size={18} /> : <RefreshCcw size={18} />}
                {step === 'upload' ? 'Abort Pipeline' : 'Restart Diagnostic'}
             </button>

             <div className="flex items-center gap-6">
                {step === 'upload' && (
                  <button 
                     onClick={() => auditMutation.mutate()}
                     disabled={(uploadMode === 'file' ? !file : !pastedData.trim()) || auditMutation.isPending}
                     className="px-12 py-5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl font-black uppercase text-[12px] tracking-[0.3em] shadow-2xl shadow-blue-500/40 hover:scale-105 active:scale-95 transition-all disabled:opacity-30 disabled:grayscale flex items-center gap-4"
                  >
                     {auditMutation.isPending ? <RefreshCcw className="animate-spin" size={20} /> : <Terminal size={20} />}
                     Initiate Neural Audit
                  </button>
                )}

                {step === 'audit' && (
                   <button 
                      onClick={() => executeMutation.mutate(validRows.map(r => r.data))}
                      disabled={validRows.length === 0 || executeMutation.isPending}
                      className="px-12 py-5 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-2xl font-black uppercase text-[12px] tracking-[0.3em] shadow-2xl shadow-emerald-500/40 hover:scale-105 active:scale-95 transition-all disabled:opacity-30 flex items-center gap-4"
                   >
                      {executeMutation.isPending ? <RefreshCcw className="animate-spin" size={20} /> : <Database size={20} />}
                      Commit {validRows.length} Neural Vectors
                   </button>
                )}
             </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

