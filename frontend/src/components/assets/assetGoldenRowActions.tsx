import { ArchiveRestore, Edit2, Eye, Terminal, Trash2 } from 'lucide-react'

export function buildAssetGoldenRowActionSections({
  asset,
  activeTab,
  onOpenDetails,
  onOpenEdit,
  onCloseMenu,
  onOpenConfirm,
  onBulkAction,
  getConsoleUrl,
}: {
  asset: any
  activeTab: 'inventory' | 'deleted'
  onOpenDetails: (asset: any) => void
  onOpenEdit: (asset: any) => void
  onCloseMenu: () => void
  onOpenConfirm: (title: string, message: string, onConfirm: () => void) => void
  onBulkAction: (payload: { action: string; ids: number[] }) => void
  getConsoleUrl: (asset: any) => string | null
}) {
  const consoleUrl = getConsoleUrl(asset)

  return [
    {
      id: 'quickAccess',
      columns: 1,
      items: [
        {
          id: 'asset-console',
          label: 'Quick Console Access',
          icon: Terminal,
          tone: 'info',
          onClick: () => {
            if (!consoleUrl) return
            window.open(consoleUrl, '_blank')
            onCloseMenu()
          },
          disabled: !consoleUrl,
          disabledReason: 'No management endpoint configured',
        },
        {
          id: 'asset-details',
          label: 'View Details',
          icon: Eye,
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
              onClick: () => {
                onOpenConfirm('Soft Delete', 'Move this asset to deleted?', () => onBulkAction({ action: 'delete', ids: [asset.id] }))
                onCloseMenu()
              },
            }
          : {
              id: 'asset-restore',
              label: 'Restore',
              icon: ArchiveRestore,
              tone: 'success',
              onClick: () => {
                onOpenConfirm('Restore Asset', 'Return this asset to the active registry?', () => onBulkAction({ action: 'restore', ids: [asset.id] }))
                onCloseMenu()
              },
            },
        activeTab === 'deleted'
          ? {
              id: 'asset-purge',
              label: 'Purge',
              icon: Trash2,
              tone: 'danger',
              onClick: () => {
                onOpenConfirm('Purge Registry', 'PURGE PERMANENTLY?', () => onBulkAction({ action: 'purge', ids: [asset.id] }))
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
