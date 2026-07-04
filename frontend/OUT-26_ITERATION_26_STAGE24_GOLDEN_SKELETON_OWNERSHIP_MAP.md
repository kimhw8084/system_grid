# Stage 24 Golden Skeleton Ownership Map

| Region | Golden primitive / contract | Asset plug-in | Old page ownership status | Result |
| --- | --- | --- | --- | --- |
| Shell / frame | `OperationalWorkspaceShell` | Asset title, scope, actions | Retained shared shell | PASS |
| Header | `OperationalWorkspaceShell.header` | Asset title, subtitle, scope switch | Retained shared header | PASS |
| Status / action zone | shell action slot | Compare, bulk, add asset | Old custom view-strip removed from action zone | PARTIAL |
| Command bar | shell toolbar slots | Views, display, export, copy, settings, import, filters, template, snapshot | More golden than before, still asset-specific choices | PARTIAL |
| Search | `ToolbarSearch` | Asset text search | Shared search primitive retained | PASS |
| Filters | secondary toolbar | Lens + status/system/type/owner | Lens moved out of custom button strip | PASS |
| Display views | `OperationalDisplayPanel` | Font, density, columns | Shared panel retained | PASS |
| Saved views | `OperationalSavedViewsPanel` | Asset saved views | Shared panel retained | PASS |
| Import / export | command slots + import modal | Import, CSV export, clipboard, template, snapshot | Shared command grammar, asset actions plugged in | PARTIAL |
| Table container | `OperationalDataGrid` | Asset rows | Shared grid surface retained | PASS |
| Table header | `buildOperationalGridColumnDefinitions()` | Asset column configs | Old hand-built header grammar removed | PASS |
| Rows | operational column contract | Asset cells, badges, prose, dates | Old row layout removed from inline page body | PASS |
| Row actions | action column + `OperationalRowActionMenu` | Details, edit, delete/purge | Shared action grammar retained | PASS |
| Selection / bulk | grid selection + anchored panel | Bulk status/environment/owner/delete/restore | Shared anchored bulk panel retained | PASS |
| Quick look / details | `WorkspaceFloatingPanel`, existing modals | Quick look, full details | Domain content reused, shell shared | PARTIAL |
| Map | existing domain surface | `AssetMap` | Domain feature retained | PARTIAL |
| Relationships / dependencies | existing asset details subfeatures | Reused in retained details content | Domain reuse only | PARTIAL |
| History / compare / report | retained domain views | Compare/report preserved | Domain reuse only | PARTIAL |
| Security / secrets / hardware / monitoring | retained detail/modal flows | Existing feature content preserved | Domain reuse only | PARTIAL |
| Forms / editing | existing modals/forms | Add/edit asset + related editors | Domain reuse only | PARTIAL |
| Loading / empty / error | `resolveOperationalDataState()` + grid shell | Asset data-state messaging | Shared contract retained | PASS |
| Responsive | viewport-driven shell + grid | Default and `960x720` screenshot attempted | Live workspace blocked before parity inspection | FAIL |

Source similarity statement:
The new visible workspace is no longer controlled by the old inline asset `columnDefs` body. The live browser environment still blocked full page comparison before visual PASS could be established.
