import React from 'react'
import { Server } from 'lucide-react'
import { HeaderScopeSwitch, ToolbarSearch } from '../shared/LayoutPrimitives'
import { OperationalWorkspaceShell } from '../shared/OperationalWorkspaceShells'

type AssetGoldenShellScaffoldProps = {
  activeTab: 'inventory' | 'deleted'
  existingCount: number
  purgedCount: number
  onTabChange: (next: 'inventory' | 'deleted') => void
  searchTerm: string
  onSearchTermChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  toolbarControls: React.ReactNode
  secondaryToolbar?: React.ReactNode
  toolbarActions?: React.ReactNode
  filterChips: Array<{ id: string; label: string; onRemove: () => void }>
  floatingPanels?: React.ReactNode
  children: React.ReactNode
}

export default function AssetGoldenShellScaffold({
  activeTab,
  existingCount,
  purgedCount,
  onTabChange,
  searchTerm,
  onSearchTermChange,
  toolbarControls,
  secondaryToolbar,
  toolbarActions,
  filterChips,
  floatingPanels,
  children,
}: AssetGoldenShellScaffoldProps) {
  return (
    <OperationalWorkspaceShell
      className="relative overflow-hidden"
      header={{
        eyebrow: 'Infrastructure',
        title: (
          <div className="flex items-center gap-3">
            <Server className="text-blue-500" size={18} />
            <span>Assets</span>
          </div>
        ),
        subtitle: 'Operational asset inventory, topology context, and ownership status',
        actions: (
          <HeaderScopeSwitch
            label="Registry Scope"
            summary={`${existingCount} existing · ${purgedCount} purged`}
            value={activeTab}
            onChange={(next) => onTabChange(next as 'inventory' | 'deleted')}
            options={[
              { label: 'Existing', value: 'inventory' },
              { label: 'Purged', value: 'deleted' },
            ]}
          />
        ),
      }}
      toolbarSearch={(
        <ToolbarSearch
          value={searchTerm}
          onChange={onSearchTermChange}
          placeholder="Scan asset matrix..."
        />
      )}
      toolbarControls={toolbarControls}
      secondaryToolbar={secondaryToolbar}
      toolbarActions={toolbarActions}
      filterChips={filterChips}
      floatingPanels={floatingPanels}
    >
      {children}
    </OperationalWorkspaceShell>
  )
}
