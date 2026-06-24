
file_path = 'frontend/src/components/ServicesReal.tsx'
with open(file_path, 'r') as f:
    content = f.read()

start_m = 'className="row-action-menu-container"'
end_m = '</OperationalAnchoredPanel>'

start_idx = content.find(start_m)
# Ensure we find the right closing tag
end_idx = content.find(end_m, start_idx) + len(end_m)

new_block = '''className="row-action-menu-container"
          >
            {rowActionMenu && (() => {
              const item = rowMenuItem
              const sections: OperationalRowActionSectionModel[] = [
                {
                    id: 'quickAccess',
                    columns: 2,
                    items: [
                        { id: 'details', label: 'Details', icon: Maximize2, tone: 'info', onClick: () => { detailRoute.openDetail(item, { replace: false }); setRowActionMenu(null); } },
                        { id: 'edit', label: 'Edit', icon: Edit2, tone: 'success', onClick: () => { setEditingItem(item); setIsFormOpen(true); setRowActionMenu(null); } }
                    ]
                },
                {
                    id: 'followOptions',
                    columns: 2,
                    items: [
                        { id: 'watch', label: watchIds.includes(item.id) ? 'Unwatch' : 'Watch', icon: watchIds.includes(item.id) ? EyeOff : Eye, tone: 'neutral', onClick: () => { toggleWatch(item.id); } },
                        { id: 'favorite', label: favoriteIds.includes(item.id) ? 'Unpin' : 'Pin', icon: Star, tone: 'warning', onClick: () => { toggleFavorite(item.id); } }
                    ]
                },
                {
                    id: 'archive',
                    columns: 1,
                    items: [
                        ...(activeTab === 'deleted' ? [{ id: 'restore', label: 'Restore', icon: Undo2, tone: 'success', variant: 'inline' as OperationalRowActionVariant, onClick: () => { bulkMutation.mutate({ action: 'restore', ids: [item.id] }); setRowActionMenu(null); } }] : []),
                        {
                            id: 'archive',
                            label: rowDeleteConfirmId === item.id ? (activeTab === 'active' ? OPERATIONAL_ACTION_LABELS.archiveConfirm : OPERATIONAL_ACTION_LABELS.purgeConfirm) : (activeTab === 'active' ? OPERATIONAL_ACTION_LABELS.archive : OPERATIONAL_ACTION_LABELS.purge),
                            icon: Trash2,
                            tone: 'danger',
                            variant: 'inline' as OperationalRowActionVariant,
                            confirming: rowDeleteConfirmId === item.id,
                            onClick: () => {
                                if (rowDeleteConfirmId !== item.id) { setRowDeleteConfirmId(item.id); return }
                                bulkMutation.mutate({ action: activeTab === 'active' ? 'delete' : 'purge', ids: [item.id] });
                                setRowActionMenu(null); setRowDeleteConfirmId(null);
                            }
                        }
                    ]
                }
              ]
              return (
                <OperationalRowActionMenu
                  onClose={() => setRowActionMenu(null)}
                  meta={`ID ${item.id} · ${item.name}`}
                  title={item.type || 'Service'}
                  sections={sections}
                />
              )
            })()}
          </OperationalAnchoredPanel>'''

new_content = content[:start_idx] + new_block + content[end_idx:]
with open(file_path, 'w') as f:
    f.write(new_content)
