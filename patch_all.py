
import os

files = {
    'frontend/src/components/MonitoringGrid.tsx': ('<OperationalAnchoredPanel', '</OperationalAnchoredPanel>', '''          <OperationalAnchoredPanel
            isOpen={!!rowActionMenu}
            panelKey="row-action-menu"
            style={rowActionMenu?.style ?? { position: 'fixed', top: -9999, left: -9999 }}
            className="row-action-menu-container"
          >
            {rowActionMenu && (() => {
              const item = rowActionMenu.item
              const sections: OperationalRowActionSectionModel[] = [
                {
                    id: 'quickAccess',
                    columns: 5,
                    items: [
                        { id: 'details', label: 'Details', icon: Maximize2, tone: 'info', onClick: () => { detailRoute.openDetail(item); setRowActionMenu(null); } },
                        { id: 'edit', label: 'Edit', icon: Edit2, tone: 'success', onClick: () => { setEditingItem(item); setIsFormOpen(true); setRowActionMenu(null); } },
                        { id: 'history', label: 'History', icon: Clock, tone: 'warning', onClick: () => { setHistoryItem(item); setRowActionMenu(null); } },
                        { id: 'asset', label: 'Asset', icon: Monitor, tone: 'info', onClick: () => { if (item.device_id) navigate(`/asset?id=${item.device_id}`); setRowActionMenu(null); } },
                        { id: 'knowledge', label: 'Knowledge', icon: BookOpen, tone: 'success', onClick: () => { const firstDoc = item.recovery_docs?.[0]; const docId = typeof firstDoc === 'object' ? firstDoc?.id : firstDoc; if (docId) navigate(`/knowledge?id=${docId}`); setRowActionMenu(null); }, disabled: !item.recovery_docs?.[0] }
                    ]
                },
                {
                    id: 'followOptions',
                    columns: 2,
                    items: [
                        { id: 'watch', label: watchIds.includes(item.id) ? 'Unwatch' : 'Watch', icon: watchIds.includes(item.id) ? EyeOff : Eye, tone: 'neutral', onClick: () => toggleWatch(item.id) },
                        { id: 'favorite', label: favoriteIds.includes(item.id) ? 'Unpin' : 'Pin', icon: Star, tone: 'warning', onClick: () => toggleFavorite(item.id) }
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
                  meta={`ID ${item.id} · ${item.device_name || 'No target asset linked'}`}
                  title={item.title}
                  sections={sections}
                />
              )
            })()}
          </OperationalAnchoredPanel>'''),
    'frontend/src/components/ServicesReal.tsx': ('<OperationalRowActionMenu', '</OperationalRowActionMenu>', '''              <OperationalRowActionMenu
                  onClose={() => setRowActionMenu(null)}
                  meta={`ID ${rowMenuItem.id} · ${rowMenuItem.name}`}
                  title={rowMenuItem.type || 'Service'}
                  sections={[
                    {
                        id: 'quickAccess',
                        columns: 2,
                        items: [
                            { id: 'details', label: 'Details', icon: Maximize2, tone: 'info', onClick: () => { if (!rowMenuItem?.id) return; detailRoute.openDetail(rowMenuItem, { replace: false }); setRowActionMenu(null); } },
                            { id: 'edit', label: 'Edit', icon: Edit2, tone: 'success', onClick: () => { if (!rowMenuItem?.id) return; setEditingItem(rowMenuItem); setIsFormOpen(true); setRowActionMenu(null); } }
                        ]
                    },
                    {
                        id: 'followOptions',
                        columns: 2,
                        items: [
                            { id: 'watch', label: watchIds.includes(rowMenuItem.id) ? 'Unwatch' : 'Watch', icon: watchIds.includes(rowMenuItem.id) ? EyeOff : Eye, tone: 'neutral', onClick: () => { if (!rowMenuItem?.id) return; toggleWatch(rowMenuItem.id); } },
                            { id: 'favorite', label: favoriteIds.includes(rowMenuItem.id) ? 'Unpin' : 'Pin', icon: Star, tone: 'warning', onClick: () => { if (!rowMenuItem?.id) return; toggleFavorite(rowMenuItem.id); } }
                        ]
                    },
                    {
                        id: 'archive',
                        columns: 1,
                        items: [
                            ...(activeTab === 'deleted' ? [{ id: 'restore', label: 'Restore', icon: Undo2, tone: 'success', variant: 'inline' as OperationalRowActionVariant, onClick: () => { if (!rowMenuItem?.id) return; bulkMutation.mutate({ action: 'restore', ids: [rowMenuItem.id] }); setRowActionMenu(null); } }] : []),
                            {
                                id: 'archive',
                                label: rowDeleteConfirmId === rowMenuItem.id ? (activeTab === 'active' ? OPERATIONAL_ACTION_LABELS.archiveConfirm : OPERATIONAL_ACTION_LABELS.purgeConfirm) : (activeTab === 'active' ? OPERATIONAL_ACTION_LABELS.archive : OPERATIONAL_ACTION_LABELS.purge),
                                icon: Trash2,
                                tone: 'danger',
                                variant: 'inline' as OperationalRowActionVariant,
                                confirming: rowDeleteConfirmId === rowMenuItem.id,
                                onClick: () => {
                                    if (!rowMenuItem?.id) return
                                    if (rowDeleteConfirmId !== rowMenuItem.id) { setRowDeleteConfirmId(rowMenuItem.id); return }
                                    bulkMutation.mutate({ action: activeTab === 'active' ? 'delete' : 'purge', ids: [rowMenuItem.id] });
                                    setRowActionMenu(null); setRowDeleteConfirmId(null);
                                }
                            }
                        ]
                    }
                  ]}
                />''')
}

for file_path, (start_m, end_m, new_block) in files.items():
    with open(file_path, 'r') as f:
        content = f.read()
    
    start_idx = content.find(start_m)
    end_idx = content.find(end_m, start_idx) + len(end_m)
    
    if start_idx == -1 or end_idx == -1:
        print(f"Could not find markers in {file_path}")
        continue
        
    new_content = content[:start_idx] + new_block + content[end_idx:]
    with open(file_path, 'w') as f:
        f.write(new_content)
    print(f"Patched {file_path}")
