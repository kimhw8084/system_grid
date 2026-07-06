import { Activity, ArchiveRestore, Clipboard, Cpu, Edit2, Eye, FileText, GitCompare, Map, Maximize2, Network, Server, Shield, Terminal, Trash2 } from 'lucide-react'
import type { OperationalRowActionVariant } from '../shared/OperationalRowActionMenu'

export function buildAssetGoldenRowActionSections({
  asset,
  activeTab,
  deleteConfirmId,
  onSetDeleteConfirmId,
  onOpenQuickLook,
  onOpenReport,
  onOpenMap,
  onOpenDetails,
  onOpenEdit,
  onOpenReportSection,
  onAddToCompare,
  onCloseMenu,
  onBulkAction,
  onCopyAssetId,
  onCopyRow,
  onExportRow,
  getConsoleUrl,
}: {
  asset: any
  activeTab: 'inventory' | 'deleted'
  deleteConfirmId: number | null
  onSetDeleteConfirmId: (id: number | null) => void
  onOpenQuickLook: (asset: any) => void
  onOpenReport: (asset: any) => void
  onOpenMap: (asset: any) => void
  onOpenDetails: (asset: any) => void
  onOpenEdit: (asset: any) => void
  onOpenReportSection: (asset: any, section?: string) => void
  onAddToCompare: (asset: any) => void
  onCloseMenu: () => void
  onBulkAction: (payload: { action: string; ids: number[] }) => void
  onCopyAssetId: (asset: any) => void
  onCopyRow: (asset: any) => void
  onExportRow: (asset: any) => void
  getConsoleUrl: (asset: any) => string | null
}) {
  const consoleUrl = getConsoleUrl(asset)
  const isDeleteConfirming = deleteConfirmId === asset.id

  return [
    {
      id: 'quickAccess',
      columns: 3,
      items: [
        {
          id: 'asset-details',
          label: 'View Details',
          icon: Maximize2,
          tone: 'info',
          onClick: () => {
            onOpenDetails(asset)
            onCloseMenu()
          },
        },
        {
          id: 'asset-edit',
          label: 'Edit Configuration',
          icon: Edit2,
          tone: 'success',
          onClick: () => {
            onOpenEdit(asset)
            onCloseMenu()
          },
        },
        {
          id: 'asset-quick-look',
          label: 'Quick Look',
          icon: Eye,
          tone: 'info',
          onClick: () => {
            onOpenQuickLook(asset)
            onCloseMenu()
          },
        },
        {
          id: 'asset-console',
          label: 'Quick Console',
          icon: Terminal,
          tone: 'info',
          onClick: () => {
            if (!consoleUrl) return
            window.open(consoleUrl, '_blank', 'noopener,noreferrer')
            onCloseMenu()
          },
          disabled: !consoleUrl,
          disabledReason: 'No management endpoint configured',
        },
        {
          id: 'asset-report',
          label: 'Open Report',
          icon: FileText,
          tone: 'info',
          onClick: () => {
            onOpenReport(asset)
            onCloseMenu()
          },
        },
        {
          id: 'asset-compare',
          label: 'Compare / Add to Compare',
          icon: GitCompare,
          tone: 'warning',
          onClick: () => {
            onAddToCompare(asset)
            onCloseMenu()
          },
        },
      ],
    },
    {
      id: 'followOptions',
      columns: 3,
      items: [
        {
          id: 'asset-copy-id',
          label: 'Copy Asset ID',
          icon: Clipboard,
          tone: 'neutral',
          onClick: () => {
            onCopyAssetId(asset)
            onCloseMenu()
          },
        },
        {
          id: 'asset-copy-row',
          label: 'Copy Row',
          icon: Clipboard,
          tone: 'neutral',
          onClick: () => {
            onCopyRow(asset)
            onCloseMenu()
          },
        },
        {
          id: 'asset-export-row',
          label: 'Export Row',
          icon: FileText,
          tone: 'neutral',
          onClick: () => {
            onExportRow(asset)
            onCloseMenu()
          },
        },
        {
          id: 'asset-services',
          label: 'Services',
          icon: Server,
          tone: 'info',
          onClick: () => {
            onOpenReportSection(asset, 'services')
            onCloseMenu()
          },
        },
        {
          id: 'asset-monitoring',
          label: 'Monitoring',
          icon: Activity,
          tone: 'info',
          onClick: () => {
            onOpenReportSection(asset, 'monitoring')
            onCloseMenu()
          },
        },
        {
          id: 'asset-relationships',
          label: 'Relationships',
          icon: Network,
          tone: 'info',
          onClick: () => {
            onOpenReportSection(asset, 'relationships')
            onCloseMenu()
          },
        },
        {
          id: 'asset-dependencies',
          label: 'Dependencies',
          icon: Network,
          tone: 'info',
          onClick: () => {
            onOpenMap(asset)
            onCloseMenu()
          },
        },
        {
          id: 'asset-hardware',
          label: 'Hardware',
          icon: Cpu,
          tone: 'info',
          onClick: () => {
            onOpenReportSection(asset, 'hardware-summary')
            onCloseMenu()
          },
        },
        {
          id: 'asset-secrets',
          label: 'Secrets / Security',
          icon: Shield,
          tone: 'warning',
          onClick: () => {
            onOpenReportSection(asset, 'security')
            onCloseMenu()
          },
        },
        {
          id: 'asset-map',
          label: 'Locate in Map',
          icon: Map,
          tone: 'info',
          onClick: () => {
            onOpenMap(asset)
            onCloseMenu()
          },
        },
      ],
    },
    {
      id: 'archive',
      columns: 1,
      items: [
        activeTab !== 'deleted'
          ? {
              id: 'asset-delete',
              label: 'Soft Delete',
              icon: Trash2,
              tone: 'danger',
              variant: 'inline' as OperationalRowActionVariant,
              confirming: isDeleteConfirming,
              confirmLabel: 'Confirm Delete',
              onClick: () => {
                if (!isDeleteConfirming) {
                  onSetDeleteConfirmId(asset.id)
                  return
                }
                onBulkAction({ action: 'delete', ids: [asset.id] })
                onSetDeleteConfirmId(null)
                onCloseMenu()
              },
            }
          : {
              id: 'asset-restore',
              label: 'Restore',
              icon: ArchiveRestore,
              tone: 'success',
              variant: 'inline' as OperationalRowActionVariant,
              onClick: () => {
                onSetDeleteConfirmId(null)
                onBulkAction({ action: 'restore', ids: [asset.id] })
                onCloseMenu()
              },
            },
        activeTab === 'deleted'
          ? {
              id: 'asset-purge',
              label: 'Purge',
              icon: Trash2,
              tone: 'danger',
              variant: 'inline' as OperationalRowActionVariant,
              confirming: isDeleteConfirming,
              confirmLabel: 'Confirm Purge',
              onClick: () => {
                if (!isDeleteConfirming) {
                  onSetDeleteConfirmId(asset.id)
                  return
                }
                onBulkAction({ action: 'purge', ids: [asset.id] })
                onSetDeleteConfirmId(null)
                onCloseMenu()
              },
            }
          : null,
      ],
    },
  ].map((section) => ({
    ...section,
    items: section.items.filter(Boolean),
  }))
}
