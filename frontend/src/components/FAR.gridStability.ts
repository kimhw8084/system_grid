import {
  getOperationalColumnLayoutSnapshot,
  isOperationalAutoResizeSource,
} from './shared/OperationalGridSizing'

export const getStableFarManualResizeLayout = (event: any) => {
  if (!event?.finished) return null
  if (isOperationalAutoResizeSource(event.source || '')) return null
  const nextLayout = getOperationalColumnLayoutSnapshot(event.api, true)
  return nextLayout.length ? nextLayout : null
}

export const FAR_PRESERVES_EXPLICIT_COLUMN_WIDTHS = true
