import React, { ReactNode } from 'react'
import { Search } from 'lucide-react'

const join = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(' ')
const TOOLBAR_CONTROL_HEIGHT = 'h-9'

export const ShellHeader = ({
  left,
  right
}: {
  left: ReactNode
  right?: ReactNode
}) => (
  <header className="shrink-0 border-b border-[var(--glass-border)] bg-[var(--bg-header)] px-8 py-3 backdrop-blur-xl">
    <div className="flex min-h-[40px] items-center justify-between gap-6">
      <div className="flex min-w-0 items-center gap-4">{left}</div>
      {right && <div className="flex shrink-0 items-center gap-3">{right}</div>}
    </div>
  </header>
)

export const PageHeader = ({
  eyebrow,
  title,
  subtitle,
  meta,
  actions,
  className = ''
}: {
  eyebrow?: ReactNode
  title: ReactNode
  subtitle?: ReactNode
  meta?: ReactNode
  actions?: ReactNode
  className?: string
}) => (
  <section className={join('flex items-start justify-between gap-6', className)}>
    <div className="min-w-0 space-y-1">
      {eyebrow && <div className="text-[8px] font-black uppercase tracking-[0.24em] text-blue-400">{eyebrow}</div>}
      <div className="space-y-0.5">
        <h1 className="text-xl font-black tracking-tighter text-[var(--text-primary)]">{title}</h1>
        {subtitle && (
          <p className="max-w-3xl text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
            {subtitle}
          </p>
        )}
      </div>
      {meta && <div className="flex flex-wrap items-center gap-3">{meta}</div>}
    </div>
    {actions && <div className="flex shrink-0 items-start gap-3">{actions}</div>}
  </section>
)

export const PageToolbar = ({
  left,
  right,
  className = ''
}: {
  left?: ReactNode
  right?: ReactNode
  className?: string
}) => (
  <section
    className={join(
      'flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/5 bg-black/20 px-4 py-3 backdrop-blur-xl',
      className
    )}
  >
    {left ? <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">{left}</div> : <div />}
    {right && <div className="flex flex-wrap items-center justify-end gap-3">{right}</div>}
  </section>
)

export const ToolbarGroup = ({
  children,
  className = ''
}: {
  children: ReactNode
  className?: string
}) => (
  <div className={join('flex flex-wrap items-center gap-2', className)}>
    {children}
  </div>
)

export const ToolbarSearch = ({
  value,
  onChange,
  placeholder,
  className = ''
}: {
  value: string
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  placeholder: string
  className?: string
}) => (
  <div className={join('relative min-w-[240px] flex-1 max-w-md', className)}>
    <Search
      size={14}
      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 transition-colors group-focus-within:text-blue-400"
    />
    <input
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={`${TOOLBAR_CONTROL_HEIGHT} w-full rounded-lg border border-white/5 bg-white/5 pl-10 pr-4 py-0 text-[10px] font-black tracking-[0.04em] text-white outline-none transition-all placeholder:text-slate-600 focus:border-blue-500/40 focus:bg-white/[0.08]`}
    />
  </div>
)

export const ToolbarButton = React.forwardRef<HTMLButtonElement, {
  children: ReactNode
  onClick?: () => void
  active?: boolean
  disabled?: boolean
  variant?: 'primary' | 'secondary' | 'quiet' | 'danger'
  className?: string
  title?: string
}>(({
  children,
  onClick,
  active = false,
  disabled = false,
  variant = 'secondary',
  className = '',
  title
}, ref) => {
  const variantClass =
    variant === 'primary'
      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20 hover:bg-blue-500'
      : variant === 'danger'
        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20'
        : variant === 'quiet'
          ? 'bg-transparent text-slate-500 hover:bg-white/5 hover:text-white'
          : active
            ? 'bg-white/10 text-blue-400 border border-blue-500/20'
            : 'bg-white/5 text-slate-400 border border-white/5 hover:border-white/10 hover:text-white'

  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={join(
        `${TOOLBAR_CONTROL_HEIGHT} inline-flex items-center justify-center gap-2 rounded-lg px-3 py-0 text-[10px] font-bold uppercase tracking-widest whitespace-nowrap shrink-0 transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-40`,
        variantClass,
        className
      )}
    >
      {children}
    </button>
  )
})
ToolbarButton.displayName = 'ToolbarButton'

export const ToolbarIconButton = React.forwardRef<HTMLButtonElement, {
  children: ReactNode
  onClick?: () => void
  active?: boolean
  disabled?: boolean
  title?: string
  tone?: 'default' | 'danger'
}>(({
  children,
  onClick,
  active = false,
  disabled = false,
  title,
  tone = 'default'
}, ref) => (
  <button
    ref={ref}
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={join(
      `${TOOLBAR_CONTROL_HEIGHT} rounded-lg px-2.5 py-0 transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-40`,
      tone === 'danger'
        ? 'border border-rose-500/20 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20'
        : active
          ? 'border border-blue-500/20 bg-white/10 text-blue-400'
          : 'border border-white/5 bg-white/5 text-slate-500 hover:bg-white/10 hover:text-white'
    )}
  >
    {children}
  </button>
))
ToolbarIconButton.displayName = 'ToolbarIconButton'

export const ToolbarSegmented = ({
  options,
  value,
  onChange
}: {
  options: Array<{ label: ReactNode; value: string }>
  value: string
  onChange: (value: string) => void
}) => (
  <div className="flex items-center gap-1 rounded-lg border border-white/5 bg-white/5 p-1">
    {options.map((option) => (
      <button
        key={option.value}
        type="button"
        onClick={() => onChange(option.value)}
        className={join(
          `${TOOLBAR_CONTROL_HEIGHT} rounded-lg px-4 py-0 text-[10px] font-bold tracking-widest transition-all`,
          value === option.value
            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
            : 'text-slate-500 hover:text-slate-300'
        )}
      >
        {option.label}
      </button>
    ))}
  </div>
)

export const HeaderScopeSwitch = ({
  label,
  summary,
  options,
  value,
  onChange,
}: {
  label: ReactNode
  summary?: ReactNode
  options: Array<{ label: ReactNode; value: string }>
  value: string
  onChange: (value: string) => void
}) => (
  <div className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/5 p-1.5">
    <div className="px-2">
      <p className="text-[8px] font-black uppercase tracking-[0.18em] text-slate-500">{label}</p>
      {summary ? <p className="pt-0.5 text-[10px] font-semibold text-slate-300">{summary}</p> : null}
    </div>
    <ToolbarSegmented options={options} value={value} onChange={onChange} />
  </div>
)
