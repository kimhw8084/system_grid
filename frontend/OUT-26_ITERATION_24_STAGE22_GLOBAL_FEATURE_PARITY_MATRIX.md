# OUT-26 Iteration 24 Stage 22 Global Feature Parity Matrix

| Feature | Golden reference | Asset feature placement after | Behavior preserved | Status | Evidence |
| --- | --- | --- | --- | --- | --- |
| Search | shared command bar | `ToolbarSearch` | yes | PASS | focused asset workflow pass |
| Filters | shared secondary toolbar | secondary filter row | yes | PASS | filter row retained |
| Display views | shared display panel | `OperationalDisplayPanel` | yes | PASS | shared panel preserved |
| Saved views | shared saved views panel | `OperationalSavedViewsPanel` | yes | PASS | shared panel preserved |
| Import/export | shared command placement | import left; template/snapshot right | yes | PASS | command-bar recomposition |
| Row actions | shared row-action menu | same | yes | PASS | asset workflow pass |
| Bulk actions | shared flyout | same shell, compare-visible restored | yes | PASS | asset workflow pass |
| Quick look/detail | shared floating/detail grammar | quick look + modal detail | yes | PASS | `QuickLookPanel`, `AssetDetailsView` retained |
| Floating panels | shared anchored panels | same | yes | PASS | display/views/bulk/quick look |
| Map | domain slot inside shared shell | `AssetMap` body slot | yes | PASS | route/body branch preserved |
| Relationships/dependencies | domain detail slot | `AssetDetailsView` | yes | PASS | preserved |
| History/compare/report | domain body slot | compare/report preserved | yes | PASS | compare-visible restored |
| Security/secrets/hardware/monitoring | domain detail slot | preserved | yes | PASS | preserved through asset details/forms |
| Form/details editing | shared modal shell + domain form | preserved | yes | PASS | `AssetForm` retained |
| Data states | shared resolver | preserved | yes | PASS | `resolveOperationalDataState` retained |
| Modal dirty-state | shared modal dirty contract | preserved | yes | PASS | asset/service/network dirty guards retained |
