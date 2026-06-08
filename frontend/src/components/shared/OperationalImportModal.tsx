import React, { useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertCircle, CheckSquare, Clipboard, Download, FileSpreadsheet, FileUp, Maximize2, Minimize2, Plus, Trash2, Upload, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { apiFetch, getApiBaseUrl } from '../../api/apiClient'
import { AppDropdown } from './AppDropdown'
import {
  WorkspaceEmptyState,
  WorkspaceFieldLabel,
  WorkspaceModalFooter,
  WorkspaceModalHeader,
  WorkspacePanelHint,
  WorkspacePanelSubtitle,
  WorkspacePanelTitle,
  WorkspaceSectionBadge,
  WorkspaceSectionCard,
  WorkspaceSplitView,
  WorkspaceInfoTooltip,
  WorkspaceValidationBanner,
  WorkspaceCollapsibleHeader,
  getWorkspaceInputClass,
  getWorkspaceModalFrameClass,
  getWorkspaceModalShellClass,
} from './OperationalWorkspacePrimitives'

type ImportMode = 'file' | 'paste' | 'builder'

interface ImportFieldMeta {
  name: string
  label: string
  required: boolean
  description: string
  input_kind: string
  template_hint: string
  aliases: string[]
  accepts_multiple: boolean
  input_control: string
  supported_in_builder: boolean
  unsupported_reason: string
  validation_rules: string[]
  options: Array<{ value: string; label: string; description?: string }>
}

interface ImportSchemaResponse {
  table_name: string
  display_name: string
  fields: ImportFieldMeta[]
  required_fields: string[]
  example_records: Array<{ id: number; label: string }>
}

interface ImportPreviewRow {
  row: number
  source: Record<string, any>
  normalized: Record<string, any>
  status: 'VALID' | 'INVALID'
  errors: string[]
}

interface ImportPreviewResponse {
  table_name: string
  total_rows: number
  valid_rows: number
  invalid_rows: number
  total_errors: number
  results: ImportPreviewRow[]
}

interface OperationalImportModalProps {
  isOpen: boolean
  onClose: () => void
  tableName: string
  displayName: string
}

type TemplateMode = 'raw' | 'hints' | 'example'

const SOURCE_MODES: Array<{ id: ImportMode; label: string; icon: React.ReactNode }> = [
  { id: 'file', label: 'File Upload', icon: <Upload size={14} /> },
  { id: 'paste', label: 'Paste CSV / Grid', icon: <Clipboard size={14} /> },
  { id: 'builder', label: 'Build Rows', icon: <FileSpreadsheet size={14} /> },
]

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/[\s_-]+/g, '')
}

function parseDelimitedLine(line: string, delimiter: string) {
  const values: string[] = []
  let current = ''
  let inQuotes = false

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    const next = line[index + 1]

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"'
        index += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === delimiter && !inQuotes) {
      values.push(current)
      current = ''
      continue
    }

    current += char
  }

  values.push(current)
  return values.map((value) => value.replace(/\r/g, '').trim())
}

function parseDelimitedText(text: string) {
  const lines = text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0)

  if (lines.length === 0) return { delimiter: ',', rows: [] as string[][] }

  const delimiter = lines[0].includes('\t') ? '\t' : ','
  return {
    delimiter,
    rows: lines.map((line) => parseDelimitedLine(line, delimiter)),
  }
}

function valueToCell(value: any) {
  if (value == null) return ''
  if (Array.isArray(value) || typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function createEmptyRow(columnNames: string[]) {
  return columnNames.reduce<Record<string, string>>((row, columnName) => {
    row[columnName] = ''
    return row
  }, {})
}

function isMeaningfulRow(row: Record<string, string>, columnNames: string[]) {
  return columnNames.some((columnName) => (row[columnName] || '').trim().length > 0)
}

function stringifyPreviewValue(value: any) {
  if (value == null || value === '') return '—'
  if (Array.isArray(value)) return value.join(', ')
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function getChoicePreview(options: Array<{ value: string; label: string }>) {
  if (options.length === 0) return ''
  const labels = options.slice(0, 4).map((option) => option.label)
  return options.length > 4 ? `${labels.join(', ')} +${options.length - 4} more` : labels.join(', ')
}

export function OperationalImportModal({
  isOpen,
  onClose,
  tableName,
  displayName,
}: OperationalImportModalProps) {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [mode, setMode] = useState<ImportMode>('file')
  const [file, setFile] = useState<File | null>(null)
  const [pasteText, setPasteText] = useState('')
  const [selectedColumns, setSelectedColumns] = useState<string[]>([])
  const [draftRows, setDraftRows] = useState<Array<Record<string, string>>>([])
  const [preview, setPreview] = useState<ImportPreviewResponse | null>(null)
  const [selectedPreviewRows, setSelectedPreviewRows] = useState<number[]>([])
  const [templateMode, setTemplateMode] = useState<TemplateMode>('raw')
  const [exampleRecordId, setExampleRecordId] = useState<number | null>(null)
  const [isMaximized, setIsMaximized] = useState(false)
  const [isPickerOpening, setIsPickerOpening] = useState(false)
  const [isTemplateCollapsed, setIsTemplateCollapsed] = useState(true)

  const schemaQuery = useQuery({
    queryKey: ['operational-import-schema', tableName],
    queryFn: async () => {
      const response = await apiFetch(`/api/v1/import/schema/${tableName}`)
      return response.json() as Promise<ImportSchemaResponse>
    },
    enabled: isOpen,
  })

  const schema = schemaQuery.data
  const fieldMap = useMemo(
    () => new Map((schema?.fields || []).map((field) => [field.name, field])),
    [schema?.fields]
  )
  const requiredFieldNames = schema?.required_fields || []

  useEffect(() => {
    if (!schema) return
    setSelectedColumns((current) => {
      if (current.length > 0) return current
      return schema.fields.filter((field) => field.supported_in_builder !== false).map((field) => field.name)
    })
    setDraftRows((current) => {
      if (current.length > 0) return current
      return [createEmptyRow(schema.fields.map((field) => field.name))]
    })
    setExampleRecordId((current) => current ?? schema.example_records?.[0]?.id ?? null)
  }, [schema])

  useEffect(() => {
    if (!preview) return
    const validRowNumbers = preview.results.filter((result) => result.status === 'VALID').map((result) => result.row)
    setSelectedPreviewRows(validRowNumbers)
  }, [preview])

  useEffect(() => {
    if (!isOpen) {
      setMode('file')
      setFile(null)
      setPasteText('')
      setPreview(null)
      setSelectedPreviewRows([])
      setSelectedColumns([])
      setDraftRows([])
      setTemplateMode('raw')
      setExampleRecordId(null)
      setIsMaximized(false)
      setIsPickerOpening(false)
      setIsTemplateCollapsed(true)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isPickerOpening) return
    
    // Use a slight delay before listening for focus to avoid immediate firing on click
    const timer = setTimeout(() => {
      const handleFocus = () => setIsPickerOpening(false)
      window.addEventListener('focus', handleFocus, { once: true })
    }, 500)

    const safetyTimeout = window.setTimeout(() => setIsPickerOpening(false), 8000)
    
    return () => {
      window.removeEventListener('focus', () => setIsPickerOpening(false))
      window.clearTimeout(safetyTimeout)
      clearTimeout(timer)
    }
  }, [isPickerOpening])

  const supportedFields = useMemo(
    () => (schema?.fields || []).filter((field) => field.supported_in_builder !== false),
    [schema?.fields]
  )
  const unsupportedFields = useMemo(
    () => (schema?.fields || []).filter((field) => field.supported_in_builder === false),
    [schema?.fields]
  )
  const activeColumns = useMemo(() => {
    if (!schema) return []
    const selected = new Set([...requiredFieldNames, ...selectedColumns])
    return supportedFields.filter((field) => selected.has(field.name))
  }, [requiredFieldNames, selectedColumns, supportedFields])

  const nonFileRows = useMemo(() => {
    const columnNames = activeColumns.map((field) => field.name)
    return draftRows.filter((row) => isMeaningfulRow(row, columnNames))
  }, [activeColumns, draftRows])

  const previewMutation = useMutation({
    mutationFn: async () => {
      if (mode === 'file') {
        if (!file) throw new Error('Select a CSV or Excel file first.')
        const formData = new FormData()
        formData.append('table_name', tableName)
        formData.append('file', file)
        const response = await apiFetch('/api/v1/import/preview-file', {
          method: 'POST',
          body: formData,
          headers: {},
        })
        return response.json() as Promise<ImportPreviewResponse>
      }

      if (nonFileRows.length === 0) throw new Error('Add at least one row before validating.')
      const response = await apiFetch(`/api/v1/import/preview-rows?table_name=${tableName}`, {
        method: 'POST',
        body: JSON.stringify({ rows: nonFileRows }),
      })
      return response.json() as Promise<ImportPreviewResponse>
    },
    onSuccess: (data) => {
      setPreview(data)
      toast.success(`Validated ${data.total_rows} row${data.total_rows === 1 ? '' : 's'}`)
    },
    onError: (error: any) => {
      toast.error(error.message || 'Preview failed')
    },
  })

  const executeMutation = useMutation({
    mutationFn: async () => {
      if (!preview) throw new Error('Validate rows before importing.')
      const selectedRows = preview.results
        .filter((result) => result.status === 'VALID' && selectedPreviewRows.includes(result.row))
        .map((result) => result.source)

      if (selectedRows.length === 0) throw new Error('Select at least one valid row to import.')
      const response = await apiFetch(`/api/v1/import/execute?table_name=${tableName}`, {
        method: 'POST',
        body: JSON.stringify({ rows: selectedRows }),
      })
      return response.json()
    },
    onSuccess: (data: any) => {
      if (data.status !== 'success') {
        toast.error(data.errors?.join(', ') || 'Import failed')
        return
      }
      toast.success(`Imported ${data.count} row${data.count === 1 ? '' : 's'}`)
      queryClient.invalidateQueries()
      onClose()
    },
    onError: (error: any) => {
      toast.error(error.message || 'Import failed')
    },
  })

  const toggleColumn = (columnName: string) => {
    if (requiredFieldNames.includes(columnName)) return
    setSelectedColumns((current) => (
      current.includes(columnName)
        ? current.filter((name) => name !== columnName)
        : [...current, columnName]
    ))
    setPreview(null)
  }

  const selectAllOptionalColumns = () => {
    setSelectedColumns(supportedFields.map((field) => field.name))
    setPreview(null)
  }

  const unselectAllOptionalColumns = () => {
    setSelectedColumns([])
    setPreview(null)
  }

  const updateDraftCell = (rowIndex: number, columnName: string, value: string) => {
    setDraftRows((current) => current.map((row, index) => (
      index === rowIndex
        ? { ...row, [columnName]: value }
        : row
    )))
    setPreview(null)
  }

  const addDraftRow = () => {
    const nextRow = createEmptyRow(schema?.fields.map((field) => field.name) || [])
    setDraftRows((current) => [...current, nextRow])
    setPreview(null)
  }

  const removeDraftRow = (rowIndex: number) => {
    setDraftRows((current) => current.filter((_, index) => index !== rowIndex))
    setPreview(null)
  }

  const clearDraftRows = () => {
    const nextRow = createEmptyRow(schema?.fields.map((field) => field.name) || [])
    setDraftRows([nextRow])
    setPreview(null)
  }

  const loadPastedRows = () => {
    if (!schema) return
    if (!pasteText.trim()) {
      toast.error('Paste CSV or spreadsheet data first.')
      return
    }

    const parsed = parseDelimitedText(pasteText)
    if (parsed.rows.length === 0) {
      toast.error('No rows were found in the pasted data.')
      return
    }

    const fieldLookup = new Map<string, string>()
    supportedFields.forEach((field) => {
      fieldLookup.set(normalizeHeader(field.name), field.name)
      fieldLookup.set(normalizeHeader(field.label), field.name)
      field.aliases.forEach((alias) => fieldLookup.set(normalizeHeader(alias), field.name))
    })

    const firstRow = parsed.rows[0]
    const matchedHeaderCount = firstRow.filter((cell) => fieldLookup.has(normalizeHeader(cell))).length
    const hasHeader = matchedHeaderCount > 0
    const headerRow = hasHeader
      ? firstRow.map((cell) => fieldLookup.get(normalizeHeader(cell)) || '')
      : activeColumns.map((field) => field.name)
    const dataRows = hasHeader ? parsed.rows.slice(1) : parsed.rows

    const nextRows = dataRows
      .filter((row) => row.some((cell) => cell.trim().length > 0))
      .map((row) => {
        const nextRow = createEmptyRow(schema.fields.map((field) => field.name))
        row.forEach((cell, cellIndex) => {
          const columnName = headerRow[cellIndex]
          if (columnName) nextRow[columnName] = cell
        })
        return nextRow
      })

    if (nextRows.length === 0) {
      toast.error('No importable rows were found in the pasted data.')
      return
    }

    setDraftRows(nextRows)
    setMode('builder')
    setPreview(null)
    toast.success(`Loaded ${nextRows.length} row${nextRows.length === 1 ? '' : 's'} into the builder`)
  }

  const handlePastedFile = (event: React.ClipboardEvent<HTMLButtonElement | HTMLDivElement>) => {
    const clipboardFiles = Array.from(event.clipboardData.files || [])
    const pastedFile = clipboardFiles.find((candidate) => /\.(csv|xlsx|xls)$/i.test(candidate.name))
    if (!pastedFile) {
      toast.error('Clipboard does not contain a CSV or Excel file.')
      return
    }
    event.preventDefault()
    setFile(pastedFile)
    setMode('file')
    setPreview(null)
    toast.success(`Loaded ${pastedFile.name} from clipboard`)
  }

  const handleCellPaste = (rowIndex: number, columnIndex: number, text: string) => {
    if (!schema) return
    const parsed = parseDelimitedText(text)
    if (parsed.rows.length <= 1 && parsed.rows[0]?.length <= 1) return

    const allColumnNames = activeColumns.map((field) => field.name)
    setDraftRows((current) => {
      const nextRows = [...current]
      const neededRowCount = rowIndex + parsed.rows.length
      while (nextRows.length < neededRowCount) {
        nextRows.push(createEmptyRow(schema.fields.map((field) => field.name)))
      }
      parsed.rows.forEach((cells, rowOffset) => {
        const nextRow = { ...nextRows[rowIndex + rowOffset] }
        cells.forEach((cell, cellOffset) => {
          const columnName = allColumnNames[columnIndex + cellOffset]
          if (columnName) nextRow[columnName] = cell
        })
        nextRows[rowIndex + rowOffset] = nextRow
      })
      return nextRows
    })
    setPreview(null)
  }

  const handleDownloadTemplate = async () => {
    const includedColumns = activeColumns
      .filter((field) => !field.required)
      .map((field) => field.name)
      .join(',')
    const baseUrl = getApiBaseUrl()
    const params = new URLSearchParams()
    if (includedColumns) params.set('columns', includedColumns)
    params.set('mode', templateMode)
    if (templateMode === 'example' && exampleRecordId != null) {
      params.set('example_id', String(exampleRecordId))
    }
    const url = `${baseUrl.replace(/\/$/, '')}/api/v1/import/template/${tableName}?${params.toString()}`

    try {
      const response = await fetch(url, {
        headers: {
          'X-User-Id': localStorage.getItem('SYSGRID_USER_ID') || 'admin_root',
        },
      })
      if (!response.ok) throw new Error(`Template download failed: ${response.status}`)
      const blob = await response.blob()
      const objectUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = objectUrl
      link.download = `SYSGRID_${tableName}_Template.csv`
      link.click()
      URL.revokeObjectURL(objectUrl)
    } catch (error: any) {
      toast.error(error.message || 'Template download failed')
    }
  }

  const togglePreviewRow = (rowNumber: number) => {
    setSelectedPreviewRows((current) => (
      current.includes(rowNumber)
        ? current.filter((value) => value !== rowNumber)
        : [...current, rowNumber]
    ))
  }

  const previewErrors = preview?.results.flatMap((result) => result.errors.map((error) => `Row ${result.row}: ${error}`)) || []
  const previewErrorCount = preview?.total_errors ?? previewErrors.length
  const selectedImportCount = preview?.results.filter((result) => result.status === 'VALID' && selectedPreviewRows.includes(result.row)).length || 0

  if (!isOpen) return null

  const modal = (
    <AnimatePresence>
      <div
        onClick={onClose}
        className={`fixed inset-0 z-[3300] flex items-center justify-center bg-[rgba(2,6,23,0.62)] backdrop-blur-[14px] ${getWorkspaceModalFrameClass('workspace')}`}
      >
        <motion.div
          onClick={(event) => event.stopPropagation()}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className={`glass-panel w-full overflow-hidden flex flex-col rounded-lg border-blue-500/20 shadow-[0_0_80px_rgba(37,99,235,0.08)] ${isMaximized ? 'max-w-none h-[calc(100vh-3rem)]' : getWorkspaceModalShellClass('workspace')}`}
        >
          <div className="flex h-full min-h-0 flex-col">
            <WorkspaceModalHeader
              icon={<Upload size={24} />}
              title={`${displayName} Import`}
              subtitle="File upload, paste, manual row builder, strict validation, and selective commit."
              closeControl={(
                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-rose-500/90 text-transparent transition-all hover:text-rose-950"
                  title="Close"
                >
                  <X size={10} strokeWidth={3} />
                </button>
              )}
              maximizeControl={(
                <button
                  type="button"
                  onClick={() => setIsMaximized((current) => !current)}
                  className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500/90 text-transparent transition-all hover:text-emerald-950"
                  title={isMaximized ? 'Restore size' : 'Maximize'}
                >
                  {isMaximized ? <Minimize2 size={8} strokeWidth={3} /> : <Maximize2 size={8} strokeWidth={3} />}
                </button>
              )}
            />

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6 sm:px-8">
              <WorkspaceValidationBanner
                message={schemaQuery.error ? 'Import schema failed to load. Refresh the workspace and try again.' : undefined}
              />
              
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <div className="space-y-6">
                  <WorkspaceSectionCard>
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <WorkspacePanelTitle>Source</WorkspacePanelTitle>
                        <WorkspacePanelSubtitle>Choose one path, then validate before import.</WorkspacePanelSubtitle>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {SOURCE_MODES.map((sourceMode) => (
                          <button
                            key={sourceMode.id}
                            type="button"
                            onClick={() => {
                              setMode(sourceMode.id)
                              setPreview(null)
                            }}
                            className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-[10px] font-black transition-colors ${
                              mode === sourceMode.id
                                ? 'border-blue-500/30 bg-blue-500/10 text-blue-300'
                                : 'border-white/10 bg-black/20 text-slate-400 hover:text-white'
                            }`}
                          >
                            {sourceMode.icon}
                            {sourceMode.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {mode === 'file' && (
                      <div className="mt-4 space-y-4">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".csv,.xlsx,.xls"
                          className="hidden"
                          onChange={(event) => {
                            setFile(event.target.files?.[0] || null)
                            setPreview(null)
                            setIsPickerOpening(false)
                          }}
                        />
                        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
                          <button
                            type="button"
                            onClick={() => {
                              setIsPickerOpening(true)
                              fileInputRef.current?.click()
                            }}
                            className="flex min-h-[160px] w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-white/10 bg-black/20 text-slate-400 transition-colors hover:border-blue-500/30 hover:text-white"
                          >
                            <FileUp size={30} />
                            <div className="text-center">
                              <p className="text-[11px] font-black text-white">{file?.name || (isPickerOpening ? 'Opening...' : 'Open File Explorer')}</p>
                              <p className="mt-1 text-[9px] font-semibold text-slate-500">Choose a CSV or Excel file from disk.</p>
                            </div>
                          </button>
                          <button
                            type="button"
                            onPaste={handlePastedFile}
                            onClick={() => setMode('file')}
                            className="flex min-h-[160px] w-full flex-col items-center justify-center gap-3 rounded-lg border border-white/10 bg-slate-950/60 px-5 text-center text-slate-400 transition-colors hover:border-blue-500/30 hover:text-white focus:border-blue-500/40 focus:outline-none"
                          >
                            <Clipboard size={24} />
                            <div>
                              <p className="text-[11px] font-black text-white">Paste File From Clipboard</p>
                              <p className="mt-1 text-[9px] font-semibold text-slate-500">Click here, then press <span className="text-slate-300">Ctrl+V</span> if your browser clipboard contains a real file.</p>
                            </div>
                          </button>
                        </div>
                      </div>
                    )}

                    {mode === 'paste' && (
                      <div className="mt-4 space-y-3">
                        <div>
                          <WorkspaceFieldLabel label="Pasted data" required />
                          <textarea
                            value={pasteText}
                            onChange={(event) => {
                              setPasteText(event.target.value)
                              setPreview(null)
                            }}
                            placeholder="Paste CSV with headers, or paste spreadsheet cells directly."
                            className={`${getWorkspaceInputClass()} min-h-[180px] resize-y`}
                          />
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                          <button
                            type="button"
                            onClick={loadPastedRows}
                            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-[10px] font-black text-slate-200 transition-colors hover:border-blue-500/30 hover:text-white"
                          >
                            <Clipboard size={12} />
                            Load Into Builder
                          </button>
                          <WorkspacePanelHint>
                            Header row is optional. If omitted, the active template column order is used.
                          </WorkspacePanelHint>
                        </div>
                      </div>
                    )}

                    {mode !== 'file' && (
                      <div className="mt-5 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <WorkspacePanelTitle>Builder</WorkspacePanelTitle>
                            <WorkspacePanelSubtitle>Type by column, paste cell blocks, remove rows, then validate.</WorkspacePanelSubtitle>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={addDraftRow}
                              className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-[10px] font-black text-slate-200 transition-colors hover:border-blue-500/30 hover:text-white"
                            >
                              <Plus size={12} />
                              Add Row
                            </button>
                            <button
                              type="button"
                              onClick={clearDraftRows}
                              className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-[10px] font-black text-slate-400 transition-colors hover:border-rose-500/30 hover:text-rose-200"
                            >
                              <Trash2 size={12} />
                              Clear
                            </button>
                          </div>
                        </div>

                        <div className="overflow-x-auto rounded-lg border border-white/10">
                          <table className="min-w-full divide-y divide-white/10 bg-black/20">
                            <thead className="bg-slate-950/90">
                              <tr>
                                <th className="px-3 py-2 text-left text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Row</th>
                                {activeColumns.map((field) => (
                                  <th key={field.name} className="min-w-[180px] px-3 py-2 text-left text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">
                                    <div className="flex items-center gap-2">
                                      <span>{field.label}</span>
                                      {field.required && <span className="text-rose-400">*</span>}
                                    </div>
                                    {(field.options || []).length > 0 && (
                                      <p className="mt-1 text-[8px] font-semibold normal-case tracking-normal text-blue-300/80">
                                        Select from allowed values
                                      </p>
                                    )}
                                  </th>
                                ))}
                                <th className="px-3 py-2 text-left text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Remove</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                              {draftRows.map((row, rowIndex) => (
                                <tr key={`draft-row-${rowIndex}`}>
                                  <td className="px-3 py-2 text-[10px] font-black text-slate-500">{rowIndex + 1}</td>
                                  {activeColumns.map((field, columnIndex) => (
                                    <td key={`${rowIndex}-${field.name}`} className="px-2 py-2 align-top">
                                      {field.input_control === 'select' ? (
                                        <AppDropdown
                                          value={row[field.name] || ''}
                                          onChange={(value) => updateDraftCell(rowIndex, field.name, String(value))}
                                          options={(field.options || []).map((option) => ({ value: option.value, label: option.label }))}
                                          placeholder={field.required ? `Select ${field.label}` : `Optional ${field.label}`}
                                          className="min-w-[180px]"
                                        />
                                      ) : field.input_control === 'number' ? (
                                        <input
                                          type="number"
                                          value={row[field.name] || ''}
                                          onChange={(event) => updateDraftCell(rowIndex, field.name, event.target.value)}
                                          className={`${getWorkspaceInputClass()} h-[42px] px-3 py-2 text-[10px] leading-4 [appearance:textfield]`}
                                        />
                                      ) : field.input_control === 'url' ? (
                                        <input
                                          type="url"
                                          value={row[field.name] || ''}
                                          onChange={(event) => updateDraftCell(rowIndex, field.name, event.target.value)}
                                          className={`${getWorkspaceInputClass()} h-[42px] px-3 py-2 text-[10px] leading-4`}
                                        />
                                      ) : field.input_kind === 'multiline' ? (
                                        <textarea
                                          value={row[field.name] || ''}
                                          onChange={(event) => updateDraftCell(rowIndex, field.name, event.target.value)}
                                          onPaste={(event) => {
                                            const text = event.clipboardData.getData('text')
                                            if (text.includes('\n') || text.includes('\t')) {
                                              event.preventDefault()
                                              handleCellPaste(rowIndex, columnIndex, text)
                                            }
                                          }}
                                          className={`${getWorkspaceInputClass()} min-h-[42px] px-3 py-2 text-[10px] leading-4`}
                                        />
                                      ) : (
                                        <input
                                          value={row[field.name] || ''}
                                          onChange={(event) => updateDraftCell(rowIndex, field.name, event.target.value)}
                                          onPaste={(event) => {
                                            const text = event.clipboardData.getData('text')
                                            if (text.includes('\n') || text.includes('\t')) {
                                              event.preventDefault()
                                              handleCellPaste(rowIndex, columnIndex, text)
                                            }
                                          }}
                                          className={`${getWorkspaceInputClass()} h-[42px] px-3 py-2 text-[10px] leading-4`}
                                        />
                                      )}
                                      {(field.validation_rules || []).length > 0 && (
                                        <p className="mt-1 px-1 text-[8px] font-semibold text-slate-500">
                                          {(field.validation_rules || [])[0]}
                                        </p>
                                      )}
                                    </td>
                                  ))}
                                  <td className="px-3 py-2">
                                    <button
                                      type="button"
                                      onClick={() => removeDraftRow(rowIndex)}
                                      disabled={draftRows.length === 1}
                                      className="rounded-lg border border-white/10 bg-black/20 p-2 text-slate-500 transition-colors hover:border-rose-500/30 hover:text-rose-300 disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </WorkspaceSectionCard>

                  <WorkspaceSectionCard>
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <WorkspacePanelTitle>Simulation</WorkspacePanelTitle>
                        <WorkspacePanelSubtitle>Normalized rows, row selection, and final commit set.</WorkspacePanelSubtitle>
                      </div>
                      <button
                        type="button"
                        onClick={() => previewMutation.mutate()}
                        disabled={previewMutation.isPending || schemaQuery.isLoading}
                        className="inline-flex items-center gap-2 rounded-lg border border-blue-500/20 bg-blue-500/10 px-4 py-2 text-[10px] font-black text-blue-300 transition-colors hover:bg-blue-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <AlertCircle size={12} />
                        {previewMutation.isPending ? 'Validating...' : 'Validate Preview'}
                      </button>
                    </div>

                    {!preview && (
                      <div className="mt-4">
                        <WorkspaceEmptyState
                          compact
                          icon={<CheckSquare size={18} />}
                          title="Preview will appear here"
                          description="Run validation to inspect normalized rows, errors, and the exact row subset that will be committed."
                        />
                      </div>
                    )}

                    {preview && (
                      <div className="mt-4 space-y-4">
                        <div className="overflow-x-auto rounded-lg border border-white/10">
                          <table className="min-w-full divide-y divide-white/10 bg-black/20">
                            <thead className="bg-slate-950/90">
                              <tr>
                                <th className="px-3 py-2 text-center text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Add</th>
                                <th className="px-3 py-2 text-center text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Row</th>
                                <th className="px-3 py-2 text-center text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Status</th>
                                {activeColumns.map((field) => (
                                  <th key={`preview-${field.name}`} className="min-w-[160px] px-3 py-2 text-center text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">
                                    {field.label}
                                  </th>
                                ))}
                                <th className="min-w-[260px] px-3 py-2 text-center text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Errors</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                              {preview.results.map((result) => {
                                const selected = selectedPreviewRows.includes(result.row)
                                return (
                                  <tr key={`preview-row-${result.row}`} className={result.status === 'INVALID' ? 'bg-rose-500/[0.03]' : ''}>
                                    <td className="px-3 py-2 align-middle text-center">
                                      <input
                                        type="checkbox"
                                        checked={selected}
                                        disabled={result.status !== 'VALID'}
                                        onChange={() => togglePreviewRow(result.row)}
                                      />
                                    </td>
                                    <td className="px-3 py-2 align-middle text-center text-[10px] font-black text-slate-500">{result.row}</td>
                                    <td className="px-3 py-2 align-middle text-center">
                                      <WorkspaceSectionBadge tone={result.status === 'VALID' ? 'emerald' : 'rose'}>
                                        {result.status}
                                      </WorkspaceSectionBadge>
                                    </td>
                                    {activeColumns.map((field) => (
                                    <td key={`preview-cell-${result.row}-${field.name}`} className="px-3 py-2 align-middle text-center text-[10px] font-semibold text-slate-200">
                                      {stringifyPreviewValue(result.normalized[field.name] ?? result.source[field.name])}
                                    </td>
                                  ))}
                                    <td className="px-3 py-2 align-middle text-center text-[10px] font-semibold text-rose-200">
                                      {result.errors.length > 0 ? (
                                        <div className="space-y-1">
                                          {result.errors.map((error) => (
                                            <p key={`${result.row}-${error}`} className="rounded-lg border border-rose-500/10 bg-rose-500/5 px-2 py-1">
                                              {error}
                                            </p>
                                          ))}
                                        </div>
                                      ) : '—'}
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </WorkspaceSectionCard>
                </div>

                <div className="space-y-6">
                  <WorkspaceSectionCard>
                    <WorkspaceCollapsibleHeader
                      title="Template"
                      subtitle={!isTemplateCollapsed && "Required columns stay included. Optional columns are selectable. Unsupported columns stay visible with reasons."}
                      collapsed={isTemplateCollapsed}
                      onToggle={() => setIsTemplateCollapsed(!isTemplateCollapsed)}
                    />
                    
                    {!isTemplateCollapsed && (
                      <div className="mt-4 grid grid-cols-1 gap-3">
                        {unsupportedFields.length > 0 && (
                          <div className="rounded-lg border border-amber-500/10 bg-amber-500/5 px-3 py-2 text-[9px] font-semibold text-amber-200">
                            {unsupportedFields.length} column{unsupportedFields.length === 1 ? '' : 's'} stay visible but are intentionally disabled in the builder because they require the richer add/edit workspace.
                          </div>
                        )}
                        <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Download Mode</p>
                          <div className="mt-3 grid grid-cols-3 gap-2">
                            {[
                              { id: 'raw', label: 'Raw', description: 'Headers only.' },
                              { id: 'hints', label: 'Hints', description: 'Headers plus guidance row.' },
                              { id: 'example', label: 'Example', description: 'Hints plus a real record row.' },
                            ].map((option) => (
                              <button
                                key={option.id}
                                type="button"
                                title={option.description}
                                onClick={() => setTemplateMode(option.id as TemplateMode)}
                                className={`rounded-lg border px-3 py-2 text-center transition-all ${
                                  templateMode === option.id
                                    ? 'border-blue-500/30 bg-blue-500/10 text-blue-300'
                                    : 'border-white/10 bg-slate-950/60 text-slate-400 hover:text-slate-200'
                                }`}
                              >
                                <p className="text-[10px] font-black">{option.label}</p>
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={selectAllOptionalColumns}
                            className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-[10px] font-black text-slate-300 transition-colors hover:text-white"
                          >
                            Select All
                          </button>
                          <button
                            type="button"
                            onClick={unselectAllOptionalColumns}
                            className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-[10px] font-black text-slate-400 transition-colors hover:text-white"
                          >
                            Unselect All
                          </button>
                        </div>

                        {templateMode === 'example' && (
                          <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                            <WorkspaceFieldLabel label="Example Record" required />
                            <div className="mt-2">
                              <AppDropdown
                                value={exampleRecordId ?? ''}
                                onChange={(value) => setExampleRecordId(value ? Number(value) : null)}
                                options={(schema?.example_records || []).map((record) => ({
                                  value: record.id,
                                  label: record.label,
                                }))}
                                placeholder="Select example record"
                              />
                            </div>
                            <p className="mt-2 text-[9px] font-semibold text-slate-500">
                              Downloads a CSV that shows how a valid existing record is shaped.
                            </p>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={handleDownloadTemplate}
                          disabled={!schema || (templateMode === 'example' && !exampleRecordId)}
                          className="inline-flex items-center justify-center gap-2 rounded-lg border border-blue-500/20 bg-blue-500/10 px-3 py-2 text-[10px] font-black text-blue-300 transition-colors hover:bg-blue-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Download size={12} />
                          Download Template
                        </button>
                        
                        <div className="mt-4 space-y-2">
                          {(schema?.fields || []).map((field) => {
                            const checked = requiredFieldNames.includes(field.name) || selectedColumns.includes(field.name)
                            const fieldOptions = field.options || []
                            const fieldValidationRules = field.validation_rules || []
                            const supportedInBuilder = field.supported_in_builder !== false
                            return (
                              <label
                                key={field.name}
                                className={`flex items-start gap-3 rounded-lg border px-3 py-2 ${
                                  supportedInBuilder
                                    ? 'border-white/5 bg-black/20'
                                    : 'border-white/5 bg-slate-950/70 opacity-70'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  className="mt-0.5 h-4 w-4 rounded border-white/10 bg-slate-950 text-blue-500"
                                  checked={checked}
                                  disabled={requiredFieldNames.includes(field.name) || !supportedInBuilder}
                                  onChange={() => toggleColumn(field.name)}
                                />
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-[10px] font-black text-slate-100">{field.label}</span>
                                    {field.required && <WorkspaceSectionBadge tone="rose">Required</WorkspaceSectionBadge>}
                                    {!supportedInBuilder && <WorkspaceSectionBadge>Unavailable In Builder</WorkspaceSectionBadge>}
                                    {fieldOptions.length > 0 && <WorkspaceSectionBadge tone="blue">Strict Choice</WorkspaceSectionBadge>}
                                  </div>
                                  <p className="mt-1 text-[9px] font-semibold text-slate-500">
                                    {supportedInBuilder
                                      ? (field.template_hint || field.description || field.name)
                                      : field.unsupported_reason}
                                  </p>
                                  {fieldOptions.length > 0 && (
                                    <p className="mt-1 text-[8px] font-semibold text-blue-300/80">
                                      Allowed values: {getChoicePreview(fieldOptions)}
                                    </p>
                                  )}
                                  {fieldValidationRules.length > 0 && (
                                    <p className="mt-1 text-[8px] font-semibold text-amber-300/80">
                                      {fieldValidationRules.join(' ')}
                                    </p>
                                  )}
                                </div>
                              </label>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </WorkspaceSectionCard>

                  <WorkspaceSectionCard>
                    <WorkspacePanelTitle>Validation</WorkspacePanelTitle>
                    <WorkspacePanelSubtitle>Preview runs before commit and invalid rows stay out of the import set.</WorkspacePanelSubtitle>
                    <div className="mt-4 grid grid-cols-4 gap-2">
                      <div className="rounded-lg border border-white/5 bg-black/20 px-2 py-2">
                        <p className="text-[8px] font-black uppercase tracking-[0.1em] text-slate-500">Rows</p>
                        <p className="text-sm font-black text-white">{preview?.total_rows ?? nonFileRows.length}</p>
                      </div>
                      <div className="rounded-lg border border-emerald-500/10 bg-emerald-500/5 px-2 py-2">
                        <p className="text-[8px] font-black uppercase tracking-[0.1em] text-emerald-400">Valid</p>
                        <p className="text-sm font-black text-emerald-300">{preview?.valid_rows ?? 0}</p>
                      </div>
                      <div className="rounded-lg border border-rose-500/10 bg-rose-500/5 px-2 py-2">
                        <p className="text-[8px] font-black uppercase tracking-[0.1em] text-rose-400">Invalid</p>
                        <p className="text-sm font-black text-rose-300">{preview?.invalid_rows ?? 0}</p>
                      </div>
                      <div className="rounded-lg border border-blue-500/10 bg-blue-500/5 px-2 py-2">
                        <p className="text-[8px] font-black uppercase tracking-[0.1em] text-blue-400">Select</p>
                        <p className="text-sm font-black text-blue-300">{selectedImportCount}</p>
                      </div>
                    </div>
                    
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <WorkspaceInfoTooltip
                        label={<span>{previewErrorCount} error{previewErrorCount === 1 ? '' : 's'} to fix</span>}
                        content={
                          previewErrors.length > 0
                            ? previewErrors.map((error) => (
                                <div key={error} className="rounded-lg border border-rose-500/10 bg-rose-500/5 px-3 py-2">
                                  {error}
                                </div>
                              ))
                            : <p>No validation errors right now.</p>
                        }
                      />
                      <WorkspacePanelHint>
                        Required: {requiredFieldNames.map((fieldName) => fieldMap.get(fieldName)?.label || fieldName).join(', ')}
                      </WorkspacePanelHint>
                    </div>
                    
                    <div className="mt-4 max-h-48 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                      {previewErrors.slice(0, 12).map((error) => (
                        <div key={error} className="rounded-lg border border-rose-500/10 bg-rose-500/5 px-3 py-2 text-[9px] font-semibold text-rose-200">
                          {error}
                        </div>
                      ))}
                      {previewErrors.length === 0 && (
                        <div className="rounded-lg border border-white/5 bg-black/20 px-3 py-3 text-[9px] font-semibold text-slate-500">
                          Validate the import set to see row-level issues and the normalized preview.
                        </div>
                      )}
                    </div>
                  </WorkspaceSectionCard>
                </div>
              </div>
            </div>

            <WorkspaceModalFooter
              left={(
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold text-slate-400">
                    Import only commits checked valid rows. Invalid rows stay in the preview for correction.
                  </p>
                </div>
              )}
              right={(
                <>
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-lg border border-white/10 bg-black/20 px-4 py-2 text-[10px] font-black text-slate-300 transition-colors hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => executeMutation.mutate()}
                    disabled={!preview || selectedImportCount === 0 || executeMutation.isPending}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-[10px] font-black text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <CheckSquare size={12} />
                    {executeMutation.isPending ? 'Importing...' : `Import ${selectedImportCount || ''}`.trim()}
                  </button>
                </>
              )}
            />
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )

  return typeof document !== 'undefined' ? createPortal(modal, document.body) : null
}
