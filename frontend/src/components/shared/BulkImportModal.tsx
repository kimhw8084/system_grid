import React, { useState, useRef } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { 
  Upload, Check, X, AlertCircle, FileText, Download, 
  RefreshCcw, Database, Terminal, ChevronRight, Layout, Info,
  Clipboard, FileUp, Copy, Trash2, CheckCircle2
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
  const [selectedRowIndices, setSelectedRowIndices] = useState<Set<number>>(new Set())
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
      const validIndices = new Set<number>(data.results.filter((r: any) => r.status === "VALID").map((r: any) => r.row))
      setSelectedRowIndices(validIndices)
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
    setSelectedRowIndices(new Set())
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const handleDownloadTemplate = () => {
    window.open(`${window.location.origin}/api/v1/import/template/${tableName}`, '_blank')
  }

  const handleDownloadSnapshot = () => {
    window.open(`${window.location.origin}/api/v1/import/snapshot/${tableName}`, '_blank')
  }

  const validRows = auditResults?.results?.filter((r: any) => r.status === "VALID") || []
  const invalidRows = auditResults?.results?.filter((r: any) => r.status === "INVALID") || []
  const selectedRowsData = validRows.filter((r: any) => selectedRowIndices.has(r.row)).map((r: any) => r.data)

  if (!isOpen) return null

  const toggleRowSelection = (rowIdx: number) => {
    const next = new Set(selectedRowIndices)
    if (next.has(rowIdx)) next.delete(rowIdx)
    else next.add(rowIdx)
    setSelectedRowIndices(next)
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
        <motion.div 
          initial={{ scale: 0.98, opacity: 0, y: 10 }} 
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.98, opacity: 0, y: 10 }}
          className="glass-panel w-full max-w-6xl h-[90vh] overflow-hidden flex flex-col rounded-2xl border border-white/10 shadow-2xl bg-[#0f172a]/95"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/5 p-6 bg-white/[0.02]">
            <div className="flex items-center space-x-5">
               <div className="p-3 bg-blue-600 rounded-xl text-white shadow-xl shadow-blue-500/20">
                  <Database size={24} />
               </div>
               <div>
                  <h2 className="text-xl font-bold uppercase text-white tracking-tight leading-none">
                    Data Ingestion <span className="text-blue-500">Pipeline</span>
                  </h2>
                  <div className="flex items-center gap-4 mt-2">
                    <p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest flex items-center gap-1.5">
                      <Layout size={10} className="text-blue-500" /> Matrix: <span className="text-white">{displayName}</span>
                    </p>
                    <p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest flex items-center gap-1.5">
                      <Terminal size={10} className="text-blue-500" /> Table: <span className="text-white">{tableName}</span>
                    </p>
                  </div>
               </div>
            </div>
            <button 
              onClick={onClose} 
              className="text-slate-500 hover:text-rose-500 transition-all p-2 hover:bg-white/5 rounded-lg"
            >
              <X size={24}/>
            </button>
          </div>

          {/* Stepper */}
          <div className="flex items-center justify-center gap-10 py-4 border-b border-white/5 bg-white/[0.01] shrink-0">
             {[
               { id: 'upload', icon: Upload, label: 'Source' },
               { id: 'audit', icon: Terminal, label: 'Audit' },
               { id: 'confirm', icon: Check, label: 'Ingest' }
             ].map((s, i) => (
               <React.Fragment key={s.id}>
                 <div className={`flex items-center gap-3 transition-all ${step === s.id ? 'text-blue-400' : 'text-slate-600'}`}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-all ${step === s.id ? 'border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/10' : 'border-white/5 bg-black/20'}`}>
                       <s.icon size={14} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[7px] font-bold text-slate-600 uppercase tracking-widest">Step 0{i+1}</span>
                      <span className="text-[9px] font-bold uppercase tracking-widest">{s.label}</span>
                    </div>
                 </div>
                 {i < 2 && <div className="h-px w-12 bg-white/5" />}
               </React.Fragment>
             ))}
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-black/20">
            {step === 'upload' && (
              <div className="h-full flex flex-col space-y-6">
                 <div className="flex flex-col items-center text-center space-y-4">
                    <h3 className="text-lg font-bold uppercase text-white tracking-widest">Ingestion Method</h3>
                    
                    <div className="flex bg-black/40 p-1 rounded-xl border border-white/5 w-full max-w-lg">
                      <button 
                        onClick={() => setUploadMode('file')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-bold uppercase text-[9px] tracking-widest transition-all ${uploadMode === 'file' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                      >
                        <FileUp size={14} /> File Upload
                      </button>
                      <button 
                        onClick={() => setUploadMode('paste')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-bold uppercase text-[9px] tracking-widest transition-all ${uploadMode === 'paste' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                      >
                        <Clipboard size={14} /> Clipboard
                      </button>
                    </div>
                 </div>

                 <div className="flex-1 flex items-center justify-center">
                    {uploadMode === 'file' ? (
                      <div className="w-full max-w-xl space-y-5">
                        <div 
                          onClick={() => fileInputRef.current?.click()}
                          className="relative block w-full aspect-[21/9] border-2 border-dashed border-white/5 rounded-2xl hover:border-blue-500/30 hover:bg-blue-500/5 transition-all cursor-pointer group"
                        >
                           <input 
                              type="file" 
                              ref={fileInputRef}
                              className="hidden" 
                              accept=".csv,.xlsx,.xls" 
                              onChange={handleFileChange} 
                           />
                           <div className="absolute inset-0 flex flex-col items-center justify-center space-y-4">
                              {file ? (
                                 <motion.div 
                                    initial={{ scale: 0.9, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    className="flex flex-col items-center gap-3"
                                 >
                                    <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                                      <Check className="text-emerald-500" size={32} />
                                    </div>
                                    <div className="text-center">
                                      <span className="text-sm font-bold uppercase text-white block truncate max-w-[300px]">{file.name}</span>
                                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1 block">{(file.size / 1024).toFixed(1)} KB • {file.type || 'Data'}</span>
                                    </div>
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); setFile(null); }}
                                      className="text-[8px] font-bold text-rose-500 uppercase hover:underline"
                                    >
                                      Remove
                                    </button>
                                 </motion.div>
                              ) : (
                                 <>
                                    <div className="p-4 bg-blue-500/5 rounded-2xl border border-blue-500/10 group-hover:scale-105 transition-transform">
                                      <Upload className="text-blue-500" size={36} />
                                    </div>
                                    <div className="text-center space-y-1">
                                      <span className="text-sm font-bold uppercase text-slate-400 group-hover:text-white transition-colors block">Browse Vector Source</span>
                                      <span className="text-[8px] font-bold text-slate-600 uppercase tracking-widest block">XLSX, CSV (UTF-8)</span>
                                    </div>
                                 </>
                              )}
                           </div>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-full max-w-4xl flex flex-col space-y-3">
                        <div className="flex justify-between items-center px-1">
                          <span className="text-[9px] font-bold uppercase text-slate-500 tracking-widest flex items-center gap-2">
                            <Copy size={12} /> Paste CSV Data
                          </span>
                          {pastedData && (
                            <button 
                              onClick={() => setPastedData("")}
                              className="text-[9px] font-bold text-rose-500 uppercase flex items-center gap-1.5 hover:bg-rose-500/5 px-2 py-1 rounded-lg transition-all"
                            >
                              <Trash2 size={12} /> Clear
                            </button>
                          )}
                        </div>
                        <textarea 
                          value={pastedData}
                          onChange={(e) => setPastedData(e.target.value)}
                          placeholder="Hostname, IP, System..."
                          className="flex-1 w-full bg-black/40 border border-white/5 rounded-xl p-5 font-mono text-[11px] text-blue-400 focus:border-blue-500/30 outline-none transition-all resize-none min-h-[260px]"
                        />
                      </div>
                    )}
                 </div>

                 <div className="flex justify-center items-center gap-4 border-t border-white/5 pt-6 shrink-0">
                    <button 
                        onClick={handleDownloadTemplate}
                        className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg font-bold uppercase text-[9px] tracking-widest transition-all border border-white/5"
                    >
                        <Download size={14} className="text-blue-500" /> Download Raw Template
                    </button>
                    <button 
                        onClick={handleDownloadSnapshot}
                        className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg font-bold uppercase text-[9px] tracking-widest transition-all border border-white/5"
                    >
                        <Download size={14} className="text-emerald-500" /> Export Snapshot
                    </button>
                 </div>
              </div>
            )}

            {step === 'audit' && auditResults && (
              <div className="space-y-6">
                 <div className="grid grid-cols-4 gap-4 shrink-0">
                    {[
                      { label: 'Scanned', val: auditResults.total_rows, color: 'text-white', icon: Database, bg: 'bg-white/5' },
                      { label: 'Valid', val: auditResults.valid_rows, color: 'text-emerald-400', icon: Check, bg: 'bg-emerald-500/5' },
                      { label: 'Logic Error', val: auditResults.invalid_rows, color: 'text-rose-400', icon: X, bg: 'bg-rose-500/5' },
                      { label: 'Violations', val: auditResults.total_errors, color: 'text-amber-500', icon: AlertCircle, bg: 'bg-amber-500/5' }
                    ].map(s => (
                      <div key={s.label} className={`p-4 ${s.bg} border border-white/5 rounded-xl flex flex-col items-center gap-1 shadow-lg`}>
                         <s.icon size={16} className={s.color} />
                         <span className={`text-xl font-bold ${s.color}`}>{s.val}</span>
                         <span className="text-[7px] font-bold uppercase text-slate-500 tracking-widest">{s.label}</span>
                      </div>
                    ))}
                 </div>

                 {/* Valid Records Section */}
                 <div className="space-y-3">
                    <div className="flex justify-between items-center px-1">
                      <h4 className="text-[10px] font-bold uppercase text-emerald-400 tracking-widest flex items-center gap-2">
                         <CheckCircle2 size={14} /> Valid Neural Vectors ({validRows.length})
                      </h4>
                      <span className="text-[8px] font-bold text-slate-600 uppercase">Selected: {selectedRowIndices.size}</span>
                    </div>

                    <div className="bg-black/40 border border-white/5 rounded-xl overflow-hidden shadow-xl">
                       <div className="max-h-[30vh] overflow-y-auto custom-scrollbar">
                          <table className="w-full text-left border-collapse">
                             <thead className="sticky top-0 bg-[#0d0e12] z-10">
                                <tr className="text-[8px] font-bold uppercase text-slate-500 tracking-widest border-b border-white/5">
                                   <th className="p-3 w-10 text-center">
                                      <input 
                                        type="checkbox" 
                                        checked={selectedRowIndices.size === validRows.length && validRows.length > 0} 
                                        onChange={() => {
                                          if (selectedRowIndices.size === validRows.length) setSelectedRowIndices(new Set())
                                          else setSelectedRowIndices(new Set(validRows.map((r: any) => r.row)))
                                        }}
                                        className="rounded border-white/20 bg-slate-900" 
                                      />
                                   </th>
                                   <th className="p-3">Index</th>
                                   {validRows.length > 0 && Object.keys(validRows[0].data).slice(0, 5).map(k => (
                                     <th key={k} className="p-3 uppercase">{k.replace('_', ' ')}</th>
                                   ))}
                                   <th className="p-3">...</th>
                                </tr>
                             </thead>
                             <tbody>
                                {validRows.map((r: any, i: number) => (
                                   <tr key={i} className={`border-b border-white/5 hover:bg-white/[0.02] transition-colors ${selectedRowIndices.has(r.row) ? 'bg-blue-500/5' : ''}`}>
                                      <td className="p-3 text-center">
                                         <input 
                                          type="checkbox" 
                                          checked={selectedRowIndices.has(r.row)} 
                                          onChange={() => toggleRowSelection(r.row)}
                                          className="rounded border-white/20 bg-slate-900" 
                                         />
                                      </td>
                                      <td className="p-3 text-[10px] font-mono text-slate-500">#{r.row.toString().padStart(4, '0')}</td>
                                      {Object.values(r.data).slice(0, 5).map((v: any, j: number) => (
                                        <td key={j} className="p-3 text-[10px] font-bold text-slate-300 truncate max-w-[150px]">{String(v)}</td>
                                      ))}
                                      <td className="p-3 text-slate-600">...</td>
                                   </tr>
                                ))}
                                {validRows.length === 0 && (
                                  <tr><td colSpan={8} className="p-10 text-center text-slate-600 font-bold uppercase tracking-widest">No valid records identified</td></tr>
                                )}
                             </tbody>
                          </table>
                       </div>
                    </div>
                 </div>

                 {/* Invalid Records Section */}
                 {(invalidRows.length > 0) && (
                   <div className="space-y-3">
                      <div className="flex justify-between items-center px-1">
                        <h4 className="text-[10px] font-bold uppercase text-rose-400 tracking-widest flex items-center gap-2">
                           <AlertCircle size={14} /> Logic Errors & Violations ({invalidRows.length})
                        </h4>
                      </div>

                      <div className="bg-rose-500/5 border border-rose-500/10 rounded-xl overflow-hidden shadow-xl">
                        <div className="max-h-[25vh] overflow-y-auto custom-scrollbar">
                            <table className="w-full text-left border-collapse">
                              <thead className="sticky top-0 bg-[#1a0a0c] z-10">
                                  <tr className="text-[8px] font-bold uppercase text-rose-300 tracking-widest border-b border-white/5">
                                    <th className="p-3">Index</th>
                                    <th className="p-3">Diagnostic Findings</th>
                                  </tr>
                              </thead>
                              <tbody>
                                  {invalidRows.map((r: any, i: number) => (
                                    <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors bg-rose-500/5">
                                        <td className="p-3 text-[10px] font-mono text-rose-400/60">#{r.row.toString().padStart(4, '0')}</td>
                                        <td className="p-3">
                                          <div className="flex flex-col gap-1">
                                              {r.errors.map((err: string, j: number) => (
                                                <div key={j} className="flex items-center gap-2 text-rose-400">
                                                    <div className="w-1 h-1 rounded-full bg-rose-500" />
                                                    <span className="text-[9px] font-bold uppercase">{err}</span>
                                                </div>
                                              ))}
                                          </div>
                                        </td>
                                    </tr>
                                  ))}
                              </tbody>
                            </table>
                        </div>
                      </div>
                   </div>
                 )}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="border-t border-white/5 flex justify-between items-center bg-white/[0.01] p-4 px-6 rounded-b-2xl shrink-0">
             <button 
                onClick={reset}
                className="px-4 py-2 border border-white/5 text-slate-500 hover:text-white hover:bg-white/5 rounded-lg font-bold uppercase text-[9px] tracking-widest transition-all flex items-center gap-2"
             >
                {step === 'upload' ? <X size={14} /> : <RefreshCcw size={14} />}
                {step === 'upload' ? 'Abort' : 'Restart'}
             </button>

             <div className="flex items-center gap-3">
                {step === 'upload' && (
                  <button 
                     onClick={() => auditMutation.mutate()}
                     disabled={(uploadMode === 'file' ? !file : !pastedData.trim()) || auditMutation.isPending}
                     className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold uppercase text-[9px] tracking-widest shadow-xl shadow-blue-500/20 transition-all disabled:opacity-30 flex items-center gap-2"
                  >
                     {auditMutation.isPending ? <RefreshCcw className="animate-spin" size={14} /> : <Terminal size={14} />}
                     Initiate Audit
                  </button>
                )}

                {step === 'audit' && (
                   <button 
                      onClick={() => executeMutation.mutate(selectedRowsData)}
                      disabled={selectedRowIndices.size === 0 || executeMutation.isPending}
                      className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold uppercase text-[9px] tracking-widest shadow-xl shadow-emerald-500/20 transition-all disabled:opacity-30 flex items-center gap-2"
                   >
                      {executeMutation.isPending ? <RefreshCcw className="animate-spin" size={14} /> : <Database size={14} />}
                      Commit {selectedRowIndices.size} Vectors
                   </button>
                )}
             </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

