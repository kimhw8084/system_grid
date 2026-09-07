import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

type Props = { open: boolean; title: string; onClose: () => void; children: React.ReactNode; restoreFocusRef?: React.RefObject<HTMLElement | null>; labelledBy?: string }

const focusable = (root: HTMLElement) => Array.from(root.querySelectorAll<HTMLElement>('a[href],button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex]:not([tabindex="-1"])'))

export function DetailPanelHost({ open, title, onClose, children, restoreFocusRef, labelledBy = 'pv1-detail-panel-title' }: Props) {
  const [wide, setWide] = useState(() => typeof window === 'undefined' || window.innerWidth >= 1200)
  const panelRef = useRef<HTMLElement | null>(null)
  const previousFocus = useRef<HTMLElement | null>(null)
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true); return () => setMounted(false) }, [])
  useEffect(() => {
    const update = () => setWide(window.innerWidth >= 1200)
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])
  useEffect(() => {
    if (!open) return
    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const page = document.querySelector<HTMLElement>('[data-pv1-projects-route]')
    const modal = window.innerWidth < 1200
    if (modal && page) page.inert = true
    const frame = requestAnimationFrame(() => {
      const panel = panelRef.current
      if (panel) focusable(panel).find((element) => element.dataset.pv1PanelClose === 'true')?.focus()
    })
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); return }
      if (event.key !== 'Tab' || !panelRef.current) return
      const items = focusable(panelRef.current); if (!items.length) return
      const index = items.indexOf(document.activeElement as HTMLElement)
      if (event.shiftKey && index <= 0) { event.preventDefault(); items[items.length - 1].focus() }
      else if (!event.shiftKey && index === items.length - 1) { event.preventDefault(); items[0].focus() }
    }
    document.addEventListener('keydown', keydown)
    return () => { cancelAnimationFrame(frame); document.removeEventListener('keydown', keydown); if (page) page.inert = false; requestAnimationFrame(() => (restoreFocusRef?.current || previousFocus.current)?.focus()) }
  }, [open, onClose, restoreFocusRef])
  if (!open || !mounted) return null
  const modal = !wide
  return createPortal(<>
    {modal ? <button type="button" className="sg-pv1-panel-scrim" aria-label="Close detail panel" onClick={onClose} /> : null}
    <aside ref={panelRef} className={`sg-pv1-detail-panel ${wide ? 'is-docked' : 'is-overlay'}`} data-pv1-detail-panel="true" data-pv1-panel-modal={modal ? 'true' : 'false'} role="dialog" aria-modal={modal ? 'true' : 'false'} aria-labelledby={labelledBy}>
      <header className="sg-pv1-detail-panel-header"><h2 id={labelledBy}>{title}</h2><button type="button" data-pv1-panel-close="true" onClick={onClose} aria-label={`Close ${title}`}>×</button></header>
      <div className="sg-pv1-detail-panel-body">{children}</div>
    </aside>
  </>, document.body)
}
