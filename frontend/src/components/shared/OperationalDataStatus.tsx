import React, { useState } from 'react'
import { AlertCircle, RefreshCw, X, Copy } from 'lucide-react'
import { WorkspaceModal } from './WorkspaceModal'

export type DataStatus = 'healthy' | 'loading' | 'error' | 'filtered' | 'empty'

export function normalizeOperationalListResponse(data: any) {
    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object') {
        if (Array.isArray(data.items)) return data.items;
        if (Array.isArray(data.data)) return data.data;
        if (Array.isArray(data.results)) return data.results;
        if (Array.isArray(data.rows)) return data.rows;
    }
    return null; // Signals shape mismatch
}

export function classifyDataStatus(
    isLoading: boolean,
    error: any,
    rawData: any,
    filteredCount: number,
    totalCount: number
): { status: DataStatus, errorDetail?: any } {
    if (isLoading) return { status: 'loading' };
    if (error) return { status: 'error', errorDetail: error };
    if (!rawData) return { status: 'error', errorDetail: { message: 'Invalid response shape' } };
    if (totalCount === 0) return { status: 'empty' };
    if (filteredCount === 0) return { status: 'filtered' };
    return { status: 'healthy' };
}

export function DataStatusPill({ status, errorDetail, onClose }: { status: string, errorDetail?: any, onClose: () => void }) {
    if (status === 'healthy') return null
    
    const colors = {
        error: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
        empty: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
        filtered: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
        loading: 'bg-blue-500/20 text-blue-300 border-blue-500/30'
    }
    
    const labels = {
        error: `Data error ${errorDetail?.status || ''}`,
        empty: 'No data',
        filtered: 'Filtered to 0',
        loading: 'Loading...'
    }

    return (
        <div className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest ${colors[status as keyof typeof colors]}`}>
            <AlertCircle size={12} />
            <span>{labels[status as keyof typeof labels]}</span>
            {status === 'error' && (
                <button onClick={onClose} className="ml-2 hover:text-white">
                    <X size={12} />
                </button>
            )}
        </div>
    )
}

export function DataDiagnosticModal({ isOpen, onClose, errorDetail }: { isOpen: boolean, onClose: () => void, errorDetail: any }) {
    const copyDiagnostics = () => {
        navigator.clipboard.writeText(JSON.stringify(errorDetail, null, 2))
    }

    return (
        <WorkspaceModal isOpen={isOpen} onClose={onClose} title="Diagnostic Information">
            <div className="p-4 text-[12px] text-slate-300 font-mono space-y-2">
                <p>Status: {errorDetail?.status}</p>
                <p>URL: {errorDetail?.url}</p>
                <p>Detail: {errorDetail?.message}</p>
                <div className="bg-slate-900 p-2 rounded overflow-x-auto">
                    <pre>{errorDetail?.rawBody}</pre>
                </div>
                <button onClick={copyDiagnostics} className="flex items-center gap-2 px-3 py-1 bg-slate-800 rounded hover:bg-slate-700">
                    <Copy size={12} />
                    Copy Diagnostics
                </button>
            </div>
        </WorkspaceModal>
    )
}
