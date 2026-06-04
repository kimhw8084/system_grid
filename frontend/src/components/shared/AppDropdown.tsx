import React, { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface Option {
  value: string | number
  label: string
}

interface AppDropdownProps {
  value: string | number
  onChange: (value: any) => void
  options: Option[]
  label?: string
  placeholder?: string
  className?: string
  disabled?: boolean
}

export const AppDropdown = ({
  value,
  onChange,
  options,
  label,
  placeholder,
  className = '',
  disabled = false
}: AppDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectedOption = options.find(opt => opt.value === value)

  return (
    <div ref={containerRef} className={`space-y-1 ${className} ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}>
      {label && (
        <label className="text-[9px] font-black text-slate-500 uppercase block tracking-widest px-1">
          {label}
        </label>
      )}
      <div className="relative">
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          className={`
            w-full flex items-center justify-between bg-slate-900 border 
            border-white/10 hover:border-white/20
            rounded-lg px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest outline-none focus:border-blue-500/50 
            transition-all ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'} 
            ${!value ? 'text-slate-500' : 'text-slate-200'}
          `}
        >
          <span className="truncate">{selectedOption ? selectedOption.label : placeholder || 'Select...'}</span>
          <ChevronDown size={14} className={`text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.98 }}
              className="absolute z-[100] top-full mt-2 w-full min-w-[200px] bg-slate-950 border border-white/10 rounded-lg shadow-2xl overflow-hidden backdrop-blur-xl"
            >
              <div className="max-h-[300px] overflow-y-auto custom-scrollbar p-1">
                {options.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(opt.value)
                      setIsOpen(false)
                    }}
                    className={`
                      w-full flex items-center justify-between px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all
                      ${opt.value === value ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'}
                    `}
                  >
                    {opt.label}
                    {opt.value === value && <Check size={12} />}
                  </button>
                ))}
                {options.length === 0 && (
                  <div className="px-3 py-2 text-[10px] text-slate-600 italic">No options available</div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
