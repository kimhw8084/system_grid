/**
 * Compatibility export only.
 *
 * FAR domain ownership lives in FARDomain.ts and the authoritative runtime is
 * frontend/src/components/FAR.tsx. This module intentionally owns no parallel
 * state, fetch, grid, or workflow behavior.
 */
export * from './FARDomain'
