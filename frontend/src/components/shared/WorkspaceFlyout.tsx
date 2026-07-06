import React from 'react'
import { ChevronRight } from 'lucide-react'
import { AppDropdown } from './AppDropdown'

export function WorkspaceFlyoutActionCard({
  title,
  active,
  onClick,
}: {
  title: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full rounded-lg border px-4 py-3 text-left transition-all ${
        active ? 'border-blue-500/40 bg-blue-950/40' : 'border-slate-800 bg-slate-950 hover:border-slate-700 hover:bg-slate-900'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-semibold text-slate-100">{title}</p>
        <ChevronRight size={14} className={active ? 'text-blue-300' : 'text-slate-500'} />
      </div>
    </button>
  )
}

export function WorkspaceFlyoutDropdownEditor({
  value,
  onChange,
  options,
  quickSelectOptions,
  placeholder,
  actionLabel,
  onApply,
  disabled,
}: {
  value: string | number
  onChange: (value: string) => void
  options: Array<{ value: string | number; label: string }>
  quickSelectOptions?: Array<{ value: string | number; label: string }>
  placeholder: string
  actionLabel: string
  onApply: () => void
  disabled?: boolean
}) {
  return (
    <div className="rounded-lg border border-slate-800 bg-[#0b1220] p-3">
      <div className="grid gap-3">
        <AppDropdown
          value={value}
          onChange={(next) => onChange(String(next))}
          options={options}
          placeholder={placeholder}
        />
        {quickSelectOptions?.length ? (
          <div className="flex flex-wrap gap-2">
            {quickSelectOptions.map((option) => {
              const isActive = String(value) === String(option.value)
              return (
                <button
                  key={String(option.value)}
                  type="button"
                  onClick={() => onChange(String(option.value))}
                  className={`rounded-lg border px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.12em] transition-all ${
                    isActive
                      ? 'border-blue-500/30 bg-blue-600/20 text-blue-100'
                      : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  {option.label}
                </button>
              )
            })}
          </div>
        ) : null}
        <button
          onClick={onApply}
          disabled={disabled}
          className="rounded-lg border border-blue-500/20 bg-blue-600/15 px-4 py-2.5 text-[10px] font-semibold text-blue-200 transition-all hover:bg-blue-600/25 disabled:cursor-not-allowed disabled:border-slate-800 disabled:bg-slate-950 disabled:text-slate-600"
        >
          {actionLabel}
        </button>
      </div>
    </div>
  )
}
