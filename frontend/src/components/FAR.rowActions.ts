export type FarDossierTab = 'causal' | 'roadmap' | 'versions' | 'history'

export const FAR_CONTEXT_DETAIL_TABS = {
  detail: 'causal',
  versionHistory: 'versions',
  researchHistory: 'history',
} as const satisfies Record<string, FarDossierTab>

export type FarContextActionState = {
  linkedIncidents: any[]
  linkedIncidentCount: number
  canOpenLinkedIncidents: boolean
}

export function getFarContextActionState(mode: any): FarContextActionState {
  const linkedIncidents = Array.isArray(mode?.linked_rcas) ? [...mode.linked_rcas] : []
  return {
    linkedIncidents,
    linkedIncidentCount: linkedIncidents.length,
    canOpenLinkedIncidents: linkedIncidents.length > 0,
  }
}
