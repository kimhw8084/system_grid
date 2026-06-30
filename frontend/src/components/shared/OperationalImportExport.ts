import { apiFetch } from '../../api/apiClient'

interface DownloadOperationalImportFileOptions {
  tableName: string
  kind: 'template' | 'snapshot'
  params?: Record<string, string | number | null | undefined>
  expectedProfile?: string
  requireSchemaHeaders?: boolean
  fallbackFileName?: string
  downloadFileName?: string
}

function buildImportDownloadUrl(
  tableName: string,
  kind: 'template' | 'snapshot',
  params?: Record<string, string | number | null | undefined>
) {
  const searchParams = new URLSearchParams()
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value == null || value === '') return
    searchParams.set(key, String(value))
  })
  const query = searchParams.toString()
  return `/api/v1/import/${kind}/${tableName}${query ? `?${query}` : ''}`
}

function getDownloadFileName(response: Response, fallbackFileName: string) {
  const contentDisposition = response.headers.get('Content-Disposition') || response.headers.get('content-disposition')
  const match = contentDisposition?.match(/filename="?([^"]+)"?/)
  return match?.[1] || fallbackFileName
}

function formatExportTimestampPart(value: number) {
  return String(value).padStart(2, '0')
}

export function buildOperationalExportFileName(viewName: string, date: Date = new Date()) {
  const timestamp = [
    date.getFullYear(),
    formatExportTimestampPart(date.getMonth() + 1),
    formatExportTimestampPart(date.getDate()),
  ].join('-')
  const time = [
    formatExportTimestampPart(date.getHours()),
    formatExportTimestampPart(date.getMinutes()),
    formatExportTimestampPart(date.getSeconds()),
  ].join('-')
  return `SysGrid_${viewName}_${timestamp}_${time}.csv`
}

function validateRoundTripHeaders(
  response: Response,
  expectedProfile?: string,
  requireSchemaHeaders?: boolean
) {
  if (!expectedProfile && !requireSchemaHeaders) return

  const profile = response.headers.get('X-SysGrid-Import-Profile') || response.headers.get('x-sysgrid-import-profile')
  const schemaVersion = response.headers.get('X-SysGrid-Schema-Version') || response.headers.get('x-sysgrid-schema-version')

  if (expectedProfile && profile !== expectedProfile) {
    throw new Error(`Export returned import profile "${profile || 'missing'}" instead of "${expectedProfile}"`)
  }
  if (requireSchemaHeaders && !schemaVersion) {
    throw new Error('Export did not include schema version metadata')
  }
}

export async function downloadOperationalImportFile({
  tableName,
  kind,
  params,
  expectedProfile,
  requireSchemaHeaders = false,
  fallbackFileName,
  downloadFileName,
}: DownloadOperationalImportFileOptions) {
  const endpoint = buildImportDownloadUrl(tableName, kind, params)
  const response = await apiFetch(endpoint, { method: 'GET' })
  validateRoundTripHeaders(response, expectedProfile, requireSchemaHeaders)

  const blob = await response.blob()
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = downloadFileName || getDownloadFileName(
    response,
    fallbackFileName || `SYSGRID_${tableName}_${kind === 'snapshot' ? 'Snapshot' : 'Template'}.csv`
  )
  link.click()
  URL.revokeObjectURL(objectUrl)

  return {
    endpoint,
    fileName: link.download,
    importProfile: response.headers.get('X-SysGrid-Import-Profile') || response.headers.get('x-sysgrid-import-profile'),
    schemaVersion: response.headers.get('X-SysGrid-Schema-Version') || response.headers.get('x-sysgrid-schema-version'),
  }
}
