import { buildOperationalDiagnosticDetail } from './shared/OperationalDataStatus'

export const FAR_REGISTRY_ENDPOINT = '/api/v1/far/modes?include_deleted=true'

export function buildFarRegistryDiagnosticDetail(error: unknown) {
  return buildOperationalDiagnosticDetail({
    endpoint: FAR_REGISTRY_ENDPOINT,
    error,
    fallbackMessage: 'The failure analysis registry request failed.',
  })
}
