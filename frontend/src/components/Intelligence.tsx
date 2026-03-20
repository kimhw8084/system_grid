import React from 'react'
import { Upload, FileText, CheckCircle2 } from 'lucide-react'

export default function Intelligence() {
  return (
    <div className="h-full flex flex-col space-y-6 max-w-4xl mx-auto">
      <div className="text-center space-y-2 mt-8">
        <h1 className="text-3xl font-black tracking-tighter">Bulk Intelligence Ingestion</h1>
        <p className="text-slate-400 text-sm">Download the template, populate your entity data, and drag-and-drop to provision thousands of assets instantly.</p>
      </div>

      <div className="glass-panel p-12 rounded-3xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center text-center space-y-6 hover:border-[#034EA2]/50 transition-colors bg-slate-900/20 group relative overflow-hidden">
        <div className="absolute inset-0 bg-[#034EA2]/5 opacity-0 group-hover:opacity-100 transition-opacity" />
        
        <div className="w-20 h-20 bg-[#034EA2]/10 rounded-3xl flex items-center justify-center">
          <Upload size={40} className="text-[#034EA2] group-hover:scale-110 transition-transform" />
        </div>
        
        <div className="space-y-2 relative z-10">
          <h3 className="text-xl font-bold">Upload CSV / Excel</h3>
          <p className="text-sm text-slate-400">Supported formats: .csv, .xlsx, .xls</p>
        </div>
        
        <button className="px-8 py-3 bg-[#034EA2] text-white rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg shadow-[#034EA2]/20 hover:scale-105 transition-all relative z-10">
          Select File
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-8">
        <div className="glass-panel p-6 rounded-2xl flex items-start space-x-4 border-l-4 border-l-blue-500">
          <FileText className="text-blue-400 flex-shrink-0" />
          <div>
            <h4 className="font-bold text-sm mb-1">1. Download Template</h4>
            <p className="text-xs text-slate-500 leading-relaxed">Ensure your data matches the SYSGRID schema perfectly by using our official ingestion template. Contains all required enums and validation rules.</p>
            <button className="mt-3 text-[10px] uppercase font-bold tracking-widest text-blue-400 hover:text-blue-300">Download .CSV</button>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl flex items-start space-x-4 border-l-4 border-l-emerald-500">
          <CheckCircle2 className="text-emerald-400 flex-shrink-0" />
          <div>
            <h4 className="font-bold text-sm mb-1">2. Zero-Downtime Validation</h4>
            <p className="text-xs text-slate-500 leading-relaxed">All uploads undergo an atomic pre-flight check. Duplicates are ignored and invalid rows are flagged before any database write occurs.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
