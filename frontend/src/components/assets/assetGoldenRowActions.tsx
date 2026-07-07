import { Activity, ArchiveRestore, Clipboard, Cpu, Edit2, Eye, EyeOff, Star, FileText, GitCompare, Map, Maximize2, Network, Server, Shield, Terminal, Trash2 } from 'lucide-react'

export function buildAssetGoldenRowActionSections({
  asset,
  activeTab,
  onOpenQuickLook,
  onOpenReport,
  onOpenMap,
  onOpenDetails,
  onOpenEdit,
  onOpenReportSection,
  onAddToCompare,
  onCloseMenu,
  onRequestConfirm,
  onBulkAction,
  onCopyAssetId,
  onCopyRow,
  onExportRow,
  getConsoleUrl,
  rowDeleteConfirmId,
  setRowDeleteConfirmId,
  favoriteIds = [],
  watchIds = [],
  onToggleFavorite,
  onToggleWatch,
}: {
  asset: any
  activeTab: 'inventory' | 'deleted'
  onOpenQuickLook: (asset: any) => void
  onOpenReport: (asset: any) => void
  onOpenMap: (asset: any) => void
  onOpenDetails: (asset: any) => void
  onOpenEdit: (asset: any) => void
  onOpenReportSection: (asset: any, section?: string) => void
  onAddToCompare: (asset: any) => void
  onCloseMenu: () => void
  onRequestConfirm: (title: string, message: string, onConfirm: () => void) => void
  onBulkAction: (payload: { action: string; ids: number[] }) => void
  onCopyAssetId: (asset: any) => void
  onCopyRow: (asset: any) => void
  onExportRow: (asset: any) => void
  getConsoleUrl: (asset: any) => string | null
  rowDeleteConfirmId?: number | null
  setRowDeleteConfirmId?: (id: number | null) => void
  favoriteIds?: number[]
  watchIds?: number[]
  onToggleFavorite?: (id: number) => void
  onToggleWatch?: (id: number) => void
}) {
  const consoleUrl = getConsoleUrl(asset)
  const isDeletedScope = activeTab === 'deleted'

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
        !isDeletedScope ? {
          id: 'asset-edit',
          label: 'Edit Configuration',
          icon: Edit2,
          tone: 'success',
          onClick: () => {
            onOpenEdit(asset)
            onCloseMenu()
          },
        } : null,
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
        !isDeletedScope ? {
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
        } : null,
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
        !isDeletedScope ? {
          id: 'asset-compare',
          label: 'Compare / Add to Compare',
          icon: GitCompare,
          tone: 'warning',
          onClick: () => {
            onAddToCompare(asset)
            onCloseMenu()
          },
        } : null,
      ].filter(Boolean),
    },
    {
      id: 'followOptions',
      columns: 3,
      items: [
        {
          id: 'watch',
          label: watchIds.includes(asset.id) ? 'Unwatch' : 'Watch',
          icon: watchIds.includes(asset.id) ? EyeOff : Eye,
          tone: 'neutral',
          onClick: () => {
            if (onToggleWatch) onToggleWatch(asset.id)
            onCloseMenu()
          },
        },
        {
          id: 'favorite',
          label: favoriteIds.includes(asset.id) ? 'Unpin' : 'Pin',
          icon: Star,
          tone: 'warning',
          onClick: () => {
            if (onToggleFavorite) onToggleFavorite(asset.id)
            onCloseMenu()
          },
        },
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
        !isDeletedScope ? {
          id: 'asset-services',
          label: 'Services',
          icon: Server,
          tone: 'info',
          onClick: () => {
            onOpenReportSection(asset, 'services')
            onCloseMenu()
          },
        } : null,
        !isDeletedScope ? {
          id: 'asset-monitoring',
          label: 'Monitoring',
          icon: Activity,
          tone: 'info',
          onClick: () => {
            onOpenReportSection(asset, 'monitoring')
            onCloseMenu()
          },
        } : null,
        !isDeletedScope ? {
          id: 'asset-relationships',
          label: 'Relationships',
          icon: Network,
          tone: 'info',
          onClick: () => {
            onOpenReportSection(asset, 'relationships')
            onCloseMenu()
          },
        } : null,
        !isDeletedScope ? {
          id: 'asset-dependencies',
          label: 'Dependencies',
          icon: Network,
          tone: 'info',
          onClick: () => {
            onOpenMap(asset)
            onCloseMenu()
          },
        } : null,
        !isDeletedScope ? {
          id: 'asset-hardware',
          label: 'Hardware',
          icon: Cpu,
          tone: 'info',
          onClick: () => {
            onOpenReportSection(asset, 'hardware-summary')
            onCloseMenu()
          },
        } : null,
        !isDeletedScope ? {
          id: 'asset-secrets',
          label: 'Secrets / Security',
          icon: Shield,
          tone: 'warning',
          onClick: () => {
            onOpenReportSection(asset, 'security')
            onCloseMenu()
          },
        } : null,
        !isDeletedScope ? {
          id: 'asset-map',
          label: 'Locate in Map',
          icon: Map,
          tone: 'info',
          onClick: () => {
            onOpenMap(asset)
            onCloseMenu()
          },
        } : null,
      ].filter(Boolean),
    },
    {
      id: 'archive',
      columns: 1,
      items: [
        activeTab !== 'deleted'
          ? {
              id: 'asset-delete',
              label: 'Soft Delete',
              confirmLabel: 'Confirm Archive?',
              icon: Trash2,
              tone: 'danger',
              confirming: rowDeleteConfirmId === asset.id,
              onClick: () => {
                if (setRowDeleteConfirmId && rowDeleteConfirmId !== asset.id) {
                  setRowDeleteConfirmId(asset.id)
                  return
                }
                onBulkAction({ action: 'delete', ids: [asset.id] })
                if (setRowDeleteConfirmId) setRowDeleteConfirmId(null)
                onCloseMenu()
              },
            }
          : {
              id: 'asset-restore',
              label: 'Restore',
              icon: ArchiveRestore,
              tone: 'success',
              onClick: () => {
                onBulkAction({ action: 'restore', ids: [asset.id] })
                onCloseMenu()
              },
            },
        activeTab === 'deleted'
          ? {
              id: 'asset-purge',
              label: 'Purge',
              confirmLabel: 'Confirm Purge?',
              icon: Trash2,
              tone: 'danger',
              confirming: rowDeleteConfirmId === asset.id,
              onClick: () => {
                if (setRowDeleteConfirmId && rowDeleteConfirmId !== asset.id) {
                  setRowDeleteConfirmId(asset.id)
                  return
                }
                onBulkAction({ action: 'purge', ids: [asset.id] })
                if (setRowDeleteConfirmId) setRowDeleteConfirmId(null)
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
