import React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { PageToolbar } from './LayoutPrimitives'

export function WorkspaceCommandBar({
  left,
  right,
  secondary,
  filterChips,
}: {
  left: React.ReactNode
  right?: React.ReactNode
  secondary?: React.ReactNode
  filterChips?: Array<{ id: string; label: string; onRemove: () => void }>
}) {
  return (
    <div className="space-y-3">
      <PageToolbar left={left} right={right} />
      {secondary ? <PageToolbar left={secondary} className="px-4 py-3" /> : null}
      <AnimatePresence>
        {!!filterChips?.length && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="flex flex-wrap items-center gap-2"
          >
            {filterChips.map((chip) => (
              <button
                key={chip.id}
                onClick={chip.onRemove}
                className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] font-semibold text-slate-300 transition-all hover:border-white/20 hover:bg-white/[0.08]"
              >
                {chip.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
