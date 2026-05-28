import React, { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { 
  Upload, Check, X, AlertCircle, FileText, Download, 
  RefreshCcw, Database, Terminal, ChevronRight, Layout, Info
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
  const [file, setFile] = useState<File | null>(null)
  const [auditResults, setAuditResults] = useState<any>(null)
  const queryClient = useQueryClient()

  const auditMutation = useMutation({
    mutationFn: async (uploadFile: File) => {
      const formData = new FormData()
      formData.append("file", uploadFile)
      const res = await apiFetch(`/api/v1/import/audit?table_name=${tableName}`, {
        method: "POST",
        body: formData,
        // Don't set Content-Type header manually, let fetch set it with boundary
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
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
        <motion.div 
          initial={{ scale: 0.95, opacity: 0 }} 
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="glass-panel w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-8 rounded-2xl border border-blue-500/30 shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/5 pb-6">
            <div className="flex items-center space-x-4">
               <div className="p-3 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-500/20"><Upload size={24} /></div>
               <div>
                  <h2 className="text-2xl font-black uppercase text-white tracking-tighter leading-none">Bulk Ingestion <span className="text-blue-500">Engine</span></h2>
                  <p className="text-[10px] text-slate-500 uppercase font-black tracking-[0.2em] mt-2">Target Matrix: {displayName}</p>
               </div>
            </div>
            <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-lg"><X size={24}/></button>
          </div>

          {/* Stepper */}
          <div className="flex items-center justify-center gap-4 py-8 border-b border-white/5 bg-white/2">
             {[
               { id: 'upload', icon: Upload, label: 'Upload' },
               { id: 'audit', icon: Terminal, label: 'Pre-flight Audit' },
               { id: 'confirm', icon: Check, label: 'Final Ingestion' }
             ].map((s, i) => (
               <React.Fragment key={s.id}>
                 <div className={`flex items-center gap-2 ${step === s.id ? 'text-blue-400' : 'text-slate-600'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step === s.id ? 'border-blue-500 bg-blue-500/10' : 'border-slate-800 bg-black/20'}`}>
                       <s.icon size={14} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest">{s.label}</span>
                 </div>
                 {i < 2 && <ChevronRight size={14} className="text-slate-800" />}
               </React.Fragment>
             ))}
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
            {step === 'upload' && (
              <div className="h-full flex flex-col items-center justify-center space-y-8 py-12">
                 <div className="flex flex-col items-center text-center space-y-4 max-w-md">
                    <div className="w-20 h-20 rounded-full bg-blue-500/10 border-2 border-dashed border-blue-500/30 flex items-center justify-center text-blue-500 animate-pulse">
                       <FileText size={40} />
                    </div>
                    <h3 className="text-xl font-black uppercase text-white tracking-widest">Select Source Data</h3>
                    <p className="text-[10px] font-bold text-slate-500 uppercase leading-relaxed">
                       Upload a CSV or Excel file following the system schema. We will audit all records against model constraints before ingestion.
                    </p>
                 </div>

                 <div className="w-full max-w-lg space-y-4">
                    <label className="relative block w-full aspect-[4/1] border-2 border-dashed border-white/10 rounded-2xl hover:border-blue-500/50 hover:bg-blue-500/5 transition-all cursor-pointer group">
                       <input type="file" className="hidden" accept=".csv,.xlsx,.xls" onChange={handleFileChange} />
                       <div className="absolute inset-0 flex flex-col items-center justify-center space-y-2">
                          {file ? (
                             <>
                                <Check className="text-emerald-500" size={24} />
                                <span className="text-[11px] font-black uppercase text-white">{file.name}</span>
                                <span className="text-[9px] font-bold text-slate-500 uppercase">{(file.size / 1024).toFixed(2)} KB</span>
                             </>
                          ) : (
                             <>
                                <Upload className="text-slate-500 group-hover:text-blue-400 transition-colors" size={32} />
                                <span className="text-[10px] font-black uppercase text-slate-500 group-hover:text-white">Click to browse file</span>
                             </>
                          )}
                       </div>
                    </label>

                    <div className="flex justify-between items-center px-2">
                       <button 
                          onClick={handleDownloadTemplate}
                          className="flex items-center gap-2 text-[9px] font-black uppercase text-blue-500 hover:underline"
                       >
                          <Download size={14} /> Download Template
                       </button>
                       <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Supports: CSV, XLSX</span>
                    </div>
                 </div>
              </div>
            )}

            {step === 'audit' && auditResults && (
              <div className="space-y-6">
                 <div className="grid grid-cols-4 gap-4">
                    {[
                      { label: 'Total Rows', val: auditResults.total_rows, color: 'text-white', icon: Database },
                      { label: 'Valid Records', val: auditResults.valid_rows, color: 'text-emerald-400', icon: Check },
                      { label: 'Invalid Rows', val: auditResults.invalid_rows, color: 'text-rose-400', icon: X },
                      { label: 'Total Errors', val: auditResults.total_errors, color: 'text-amber-500', icon: AlertCircle }
                    ].map(s => (
                      <div key={s.label} className="p-4 bg-black/30 border border-white/5 rounded-xl flex flex-col items-center gap-2">
                         <s.icon size={14} className={s.color} />
                         <span className={`text-xl font-black ${s.color}`}>{s.val}</span>
                         <span className="text-[7px] font-black uppercase text-slate-500 tracking-widest">{s.label}</span>
                      </div>
                    ))}
                 </div>

                 <div className="space-y-4">
                    <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                       <Terminal size={12} /> Audit Trail Results
                    </h4>
                    <div className="bg-black/40 border border-white/5 rounded-xl overflow-hidden shadow-2xl">
                       <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                          <table className="w-full text-left border-collapse">
                             <thead className="sticky top-0 bg-[#1a1b26] z-10 shadow-lg">
                                <tr className="text-[8px] font-black uppercase text-slate-500 tracking-widest border-b border-white/5">
                                   <th className="p-4">Row</th>
                                   <th className="p-4">Status</th>
                                   <th className="p-4">Audit Findings</th>
                                </tr>
                             </thead>
                             <tbody>
                                {auditResults.results.map((r: any, i: number) => (
                                   <tr key={i} className={`border-b border-white/5 hover:bg-white/2 transition-colors ${r.status === 'INVALID' ? 'bg-rose-500/5' : ''}`}>
                                      <td className="p-4 text-[10px] font-mono text-slate-500">{r.row}</td>
                                      <td className="p-4">
                                         <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${r.status === 'VALID' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                            {r.status}
                                         </span>
                                      </td>
                                      <td className="p-4">
                                         {r.status === 'VALID' ? (
                                            <span className="text-[9px] font-bold text-slate-500 uppercase">Schema Compliant</span>
                                         ) : (
                                            <div className="flex flex-col gap-1">
                                               {r.errors.map((err: string, j: number) => (
                                                  <div key={j} className="flex items-center gap-2 text-rose-400">
                                                     <AlertCircle size={10} />
                                                     <span className="text-[9px] font-bold uppercase tracking-tight">{err}</span>
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
                    <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-xl flex items-start gap-4">
                       <Info size={18} className="text-amber-500 shrink-0" />
                       <div className="space-y-1">
                          <p className="text-[9px] font-black text-amber-500 uppercase tracking-tight">Data Integrity Warning</p>
                          <p className="text-[8px] font-bold text-amber-500/60 uppercase leading-relaxed">
                             {invalidRows.length} rows failed pre-flight audit. Only VALID records will be processed if you proceed. Correct the invalid rows in your source file and re-upload for full ingestion.
                          </p>
                       </div>
                    </div>
                 )}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="border-t border-white/5 pt-6 flex justify-between items-center bg-white/2 p-6 rounded-b-2xl">
             <button 
                onClick={reset}
                className="px-6 py-3 border border-white/10 text-slate-500 hover:text-white hover:bg-white/5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all"
             >
                {step === 'upload' ? 'Cancel' : 'Restart Engine'}
             </button>

             <div className="flex items-center gap-3">
                {step === 'upload' && (
                  <button 
                     onClick={() => file && auditMutation.mutate(file)}
                     disabled={!file || auditMutation.isPending}
                     className="px-8 py-3 bg-blue-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-blue-500/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                     {auditMutation.isPending ? <RefreshCcw className="animate-spin" size={14} /> : <Terminal size={14} />}
                     Run Pre-flight Audit
                  </button>
                )}

                {step === 'audit' && (
                   <button 
                      onClick={() => executeMutation.mutate(validRows.map(r => r.data))}
                      disabled={validRows.length === 0 || executeMutation.isPending}
                      className="px-8 py-3 bg-emerald-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2"
                   >
                      {executeMutation.isPending ? <RefreshCcw className="animate-spin" size={14} /> : <Database size={14} />}
                      Commit {validRows.length} Records
                   </button>
                )}
             </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
