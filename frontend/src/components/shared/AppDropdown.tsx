import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Check } from 'lucide-react'
import { OPERATIONAL_WORKSPACE_VISUALS } from './OperationalWorkspace'
import { getWorkspaceFloatingPanelClass, useWorkspaceAnchoredLayer } from './OperationalWorkspacePrimitives'

interface Option {
  value: string | number
  label: string
}

interface AppDropdownProps {
  value: string | number | Array<string | number>
  onChange: (value: any) => void
  options: Option[]
  label?: string
  placeholder?: string
  className?: string
  disabled?: boolean
  multi?: boolean
}

export const AppDropdown = ({
  value,
  onChange,
  options,
  label,
  placeholder,
  className = '',
  disabled = false,
  multi = false
}: AppDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const { triggerRef, panelRef, panelStyle } = useWorkspaceAnchoredLayer(isOpen, { minWidth: 200 })

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (triggerRef.current?.contains(target) || 
          panelRef.current?.contains(target) ||
          (target instanceof HTMLElement && target.closest('[data-workspace-panel]'))) return
      setIsOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [panelRef, triggerRef])

  useEffect(() => {
    if (isOpen) setSearchTerm('')
  }, [isOpen])

  const filteredOptions = options.filter(opt => 
    String(opt.label).toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(opt.value).toLowerCase().includes(searchTerm.toLowerCase())
  )

  const isSelected = (optValue: string | number) => {
    if (multi && Array.isArray(value)) {
      return value.includes(optValue)
    }
    return value === optValue
  }

  const handleSelect = (optValue: string | number) => {
    if (multi) {
      const currentValues = Array.isArray(value) ? value : []
      const nextValues = currentValues.includes(optValue)
        ? currentValues.filter(v => v !== optValue)
        : [...currentValues, optValue]
      onChange(nextValues)
    } else {
      onChange(optValue)
      setIsOpen(false)
    }
  }

  const getLabel = () => {
    if (multi && Array.isArray(value)) {
      if (value.length === 0) return placeholder || 'Select...'
      if (value.length === 1) return options.find(o => o.value === value[0])?.label || value[0]
      return `${value.length} selected`
    }
    const selectedOption = options.find(opt => opt.value === value)
    return selectedOption ? selectedOption.label : placeholder || 'Select...'
  }

  return (
    <div className={`space-y-1 ${className} ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}>
      {label && (
        <label className={`block px-1 ${OPERATIONAL_WORKSPACE_VISUALS.fieldLabelText}`}>
          {label}
        </label>
      )}
      <div>
        <button
          ref={(node) => {
            triggerRef.current = node
          }}
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          className={`
            w-full flex items-center justify-between
            ${OPERATIONAL_WORKSPACE_VISUALS.controlSurface}
            px-4 py-2.5 text-[11px] font-semibold outline-none focus:border-blue-500/50
            transition-all ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'} 
            ${(!value || (Array.isArray(value) && value.length === 0)) ? 'text-slate-500' : 'text-slate-200'}
          `}
        >
          <span className="truncate">{getLabel()}</span>
          <ChevronDown size={14} className={`text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && typeof document !== 'undefined' && createPortal(
          <div
            ref={panelRef}
            style={panelStyle}
            data-workspace-panel="true"
            onMouseDown={(e) => e.stopPropagation()}
            className={`${getWorkspaceFloatingPanelClass('menu')} overflow-hidden shadow-2xl flex flex-col`}
          >
            <div className="p-2 border-b border-white/5">
              <input
                autoFocus
                type="text"
                placeholder="Search options..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded px-3 py-1.5 text-[10px] text-white focus:outline-none focus:border-blue-500/50"
              />
            </div>
            <div className="max-h-[300px] overflow-y-auto custom-scrollbar p-1">
              {filteredOptions.map((opt) => {
                const active = isSelected(opt.value)
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelect(opt.value)}
                    className={`
                      w-full flex items-center justify-between px-3 py-2 rounded-lg text-[10px] font-semibold transition-all
                      ${active ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:bg-white/5 hover:text-white'}
                    `}
                  >
                    <div className="flex items-center gap-2 truncate">
                      {multi && (
                        <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors ${active ? 'bg-white border-white' : 'border-white/20 bg-black/20'}`}>
                          {active && <Check size={10} className="text-blue-600" />}
                        </div>
                      )}
                      <span className="truncate">{opt.label}</span>
                    </div>
                    {!multi && active && <Check size={12} className="shrink-0 ml-2" />}
                  </button>
                )
              })}
              {filteredOptions.length === 0 && (
                <div className="px-3 py-4 text-center">
                  <p className="text-[10px] text-slate-500 italic">No matching options</p>
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
      </div>
    </div>
  )
}
