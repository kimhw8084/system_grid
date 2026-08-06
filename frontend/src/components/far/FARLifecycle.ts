import { apiFetch } from '../../api/apiClient'

export type FARNestedEntityType = 'cause' | 'mitigation' | 'prevention' | 'resolution'

export interface FARNestedLifecyclePreview {
  operation: 'retire' | 'unlink'
  selected_count: number
  matched_count: number
  changed_count: number
  unchanged_count: number
  blocked_count: number
  missing_count: number
  changed_ids: number[]
  unchanged_ids: number[]
  missing_ids: number[]
  blockers: Array<Record<string, unknown>>
  can_execute: boolean
  preview_token: string
  preview_hash: string
  expires_at: string
  target_versions: Record<string, number>
  idempotency_key: string
}

export class FARNestedLifecycleCancelled extends Error {
  constructor() {
    super('FAR lifecycle change cancelled')
    this.name = 'FARNestedLifecycleCancelled'
  }
}

export function newFARLifecycleIdempotencyKey(scope: string): string {
  const random = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`
  return `far-${scope}-${random}`
}

export function assertFAROnlineForMutation(): void {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new Error('FAR is in read-only offline mode. Mutations are not queued.')
  }
}

async function requireFARJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.text()
    throw new Error(body || `FAR request failed (${response.status})`)
  }
  return response.json() as Promise<T>
}

export async function previewFARNestedLifecycle(input: {
  entityType: FARNestedEntityType
  entityId: number
  expectedVersion: number
  reason: string
  modeId?: number | null
  idempotencyKey?: string
}): Promise<FARNestedLifecyclePreview> {
  assertFAROnlineForMutation()
  const reason = input.reason.trim()
  if (reason.length < 3) throw new Error('A lifecycle reason of at least three characters is required.')
  const idempotencyKey = input.idempotencyKey || newFARLifecycleIdempotencyKey(`${input.entityType}-preview`)
  const response = await apiFetch(
    `/api/v1/far/${input.entityType}/${input.entityId}/retirement/preview`,
    {
      method: 'POST',
      body: JSON.stringify({
        expected_version: input.expectedVersion,
        reason,
        mode_id: input.modeId ?? null,
        idempotency_key: idempotencyKey,
      }),
    },
  )
  const preview = await requireFARJson<Omit<FARNestedLifecyclePreview, 'idempotency_key'>>(response)
  return { ...preview, idempotency_key: idempotencyKey }
}

export async function executeFARNestedLifecycle(
  preview: FARNestedLifecyclePreview,
): Promise<Record<string, unknown>> {
  assertFAROnlineForMutation()
  if (!preview.can_execute || !preview.preview_token || !preview.preview_hash) {
    const reason = preview.blockers.length ? JSON.stringify(preview.blockers) : 'The target is unchanged.'
    throw new Error(`FAR lifecycle preview is not executable: ${reason}`)
  }
  const response = await apiFetch('/api/v1/far/nested/retirement/execute', {
    method: 'POST',
    body: JSON.stringify({
      preview_token: preview.preview_token,
      preview_hash: preview.preview_hash,
      idempotency_key: preview.idempotency_key,
      confirm: true,
    }),
  })
  return requireFARJson<Record<string, unknown>>(response)
}

export async function confirmAndExecuteFARNestedLifecycle(input: {
  entityType: FARNestedEntityType
  entityId: number
  expectedVersion: number
  reason: string
  modeId?: number | null
  label: string
}): Promise<Record<string, unknown>> {
  const preview = await previewFARNestedLifecycle(input)
  if (!preview.can_execute) {
    const reason = preview.blockers.length ? JSON.stringify(preview.blockers) : 'No current relationship or active record would change.'
    throw new Error(`FAR lifecycle preview was blocked: ${reason}`)
  }
  const confirmation = `${input.label}\n\nOperation: ${preview.operation}\nRecords changed: ${preview.changed_count}\nReason: ${input.reason}\n\nThis preserves history and requires an explicit restore to reverse.`
  if (typeof window !== 'undefined' && !window.confirm(confirmation)) {
    throw new FARNestedLifecycleCancelled()
  }
  return executeFARNestedLifecycle(preview)
}
