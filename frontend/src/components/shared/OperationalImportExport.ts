import { apiFetch } from '../../api/apiClient'

interface DownloadOperationalImportFileOptions {
  tableName: string
  kind: 'template' | 'snapshot'
  params?: Record<string, string | number | null | undefined>
  expectedProfile?: string
  requireSchemaHeaders?: boolean
  fallbackFileName?: string
  preferredFileName?: string
  metadataContract?: ExportMetadataContract
}

interface ExportMetadataContract {
  manifestEndpoint: string
  expectedProfile: string
  expectedSchemaVersion: string
  expectedFilenamePattern: RegExp
  expectedScope?: string
  expectedContentType?: string
}

interface ExportManifest {
  profile?: string
  schema_version?: string
  filename?: string
  download_url?: string
  scope?: string
  content_type?: string
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

function parseDownloadFileName(response: Response) {
  const contentDisposition = response.headers.get('Content-Disposition') || response.headers.get('content-disposition')
  const match = contentDisposition?.match(/filename="?([^"]+)"?/)
  return match?.[1] || null
}

function normalizeContentType(contentType: string | null | undefined) {
  return (contentType || '').split(';')[0]?.trim().toLowerCase() || null
}

function validateManifest(manifest: ExportManifest, contract: ExportMetadataContract) {
  if (manifest.profile !== contract.expectedProfile) {
    throw new Error(`Export manifest returned import profile "${manifest.profile || 'missing'}" instead of "${contract.expectedProfile}"`)
  }
  if (manifest.schema_version !== contract.expectedSchemaVersion) {
    throw new Error(`Export manifest returned schema version "${manifest.schema_version || 'missing'}" instead of "${contract.expectedSchemaVersion}"`)
  }
  if (!manifest.filename || !contract.expectedFilenamePattern.test(manifest.filename)) {
    throw new Error('Export manifest returned an invalid filename')
  }
  if (contract.expectedScope && manifest.scope !== contract.expectedScope) {
    throw new Error(`Export manifest returned scope "${manifest.scope || 'missing'}" instead of "${contract.expectedScope}"`)
  }
  if (contract.expectedContentType && normalizeContentType(manifest.content_type) !== normalizeContentType(contract.expectedContentType)) {
    throw new Error(`Export manifest returned content type "${manifest.content_type || 'missing'}" instead of "${contract.expectedContentType}"`)
  }
  if (!manifest.download_url) {
    throw new Error('Export manifest did not include a download URL')
  }
}

function readRoundTripHeaders(response: Response) {
  return {
    profile: response.headers.get('X-SysGrid-Import-Profile') || response.headers.get('x-sysgrid-import-profile'),
    schemaVersion: response.headers.get('X-SysGrid-Schema-Version') || response.headers.get('x-sysgrid-schema-version'),
    fileName: parseDownloadFileName(response),
    contentType: normalizeContentType(response.headers.get('Content-Type') || response.headers.get('content-type')),
  }
}

function validateRoundTripHeaders(
  response: Response,
  expectedProfile?: string,
  requireSchemaHeaders?: boolean,
  manifest?: ExportManifest,
  metadataContract?: ExportMetadataContract
) {
  const { profile, schemaVersion, fileName, contentType } = readRoundTripHeaders(response)
  const headerValues = [profile, schemaVersion, fileName]
  const anyContractHeaderReadable = headerValues.some((value) => Boolean(value))

  if (!expectedProfile && !requireSchemaHeaders && !metadataContract) return

  if (metadataContract && manifest) {
    if (!anyContractHeaderReadable) {
      if (metadataContract.expectedContentType && contentType !== normalizeContentType(metadataContract.expectedContentType)) {
        throw new Error('Export metadata could not be verified.')
      }
      return
    }
    if (profile && profile !== manifest.profile) {
      throw new Error(`Export returned import profile "${profile}" instead of "${manifest.profile}"`)
    }
    if (schemaVersion && schemaVersion !== manifest.schema_version) {
      throw new Error(`Export returned schema version "${schemaVersion}" instead of "${manifest.schema_version}"`)
    }
    if (fileName && fileName !== manifest.filename) {
      throw new Error(`Export returned filename "${fileName}" instead of "${manifest.filename}"`)
    }
    if (metadataContract.expectedContentType && contentType !== normalizeContentType(metadataContract.expectedContentType)) {
      throw new Error(`Export returned content type "${contentType || 'missing'}" instead of "${normalizeContentType(metadataContract.expectedContentType)}"`)
    }
    return
  }

  if (expectedProfile && profile !== expectedProfile) {
    throw new Error(`Export returned import profile "${profile || 'missing'}" instead of "${expectedProfile}"`)
  }
  if (requireSchemaHeaders && !schemaVersion) {
    throw new Error('Export did not include schema version metadata')
  }
  if ((expectedProfile || requireSchemaHeaders) && !fileName) {
    throw new Error('Export did not include Content-Disposition metadata')
  }
}

async function fetchAndValidateManifest(contract?: ExportMetadataContract) {
  if (!contract) return null
  try {
    const response = await apiFetch(contract.manifestEndpoint, { method: 'GET' })
    const manifest = await response.json() as ExportManifest
    validateManifest(manifest, contract)
    return manifest
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Export manifest returned')) throw error
    throw new Error('Export metadata could not be verified.')
  }
}

export async function downloadOperationalImportFile({
  tableName,
  kind,
  params,
  expectedProfile,
  requireSchemaHeaders = false,
  fallbackFileName,
  preferredFileName,
  metadataContract,
}: DownloadOperationalImportFileOptions) {
  const manifest = await fetchAndValidateManifest(metadataContract)
  const endpoint = manifest?.download_url || buildImportDownloadUrl(tableName, kind, params)
  const response = await apiFetch(endpoint, { method: 'GET' })
  try {
    validateRoundTripHeaders(response, expectedProfile, requireSchemaHeaders, manifest || undefined, metadataContract)
  } catch (error) {
    if (!manifest && metadataContract) {
      throw new Error('Export metadata could not be verified.')
    }
    throw error
  }

  const blob = await response.blob()
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = preferredFileName || parseDownloadFileName(response) || manifest?.filename || fallbackFileName || `SYSGRID_${tableName}_${kind === 'snapshot' ? 'Snapshot' : 'Template'}.csv`
  link.click()
  URL.revokeObjectURL(objectUrl)

  const readableHeaders = readRoundTripHeaders(response)
  return {
    endpoint,
    fileName: link.download,
    importProfile: readableHeaders.profile || manifest?.profile || null,
    schemaVersion: readableHeaders.schemaVersion || manifest?.schema_version || null,
  }
}
