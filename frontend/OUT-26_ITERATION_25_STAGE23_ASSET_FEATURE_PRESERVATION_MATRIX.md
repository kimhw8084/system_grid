# OUT-26 Iteration 25 Stage 23 Asset Feature Preservation Matrix

| Feature | Pre-existing behavior | Final placement in golden structure | Interaction evidence | Result | Blocker if not PASS |
| --- | --- | --- | --- | --- | --- |
| Quick look / details | asset quick look + detail modal | shared floating panel + shared modal shell | focused workflow pass | PASS | none |
| Map | dedicated asset topology mode | body slot under internal golden workspace | source audit | PASS | none |
| Relationships / dependencies | rich detail content | `AssetDetailsView` detail content | source audit | PASS | none |
| Forms / details editing | asset form modal | shared `WorkspaceModal` shell | focused workflow pass | PASS | none |
| History | no monitoring-style history timeline in canonical asset shell | unchanged | source audit | PARTIAL | still not a distinct golden history flow |
| Compare | selected / visible asset compare | body slot + shared bulk flyout entry | focused workflow pass | PASS | none |
| Report | list/report mode | body slot | source audit | PASS | none |
| Security | asset security detail flow | preserved inside asset detail/form flows | source audit | PASS | none |
| Secrets | asset secrets detail flow | preserved inside asset detail/form flows | source audit | PASS | none |
| Hardware | asset hardware detail flow | preserved inside asset detail/form flows | source audit | PASS | none |
| Monitoring | asset monitoring detail flow | preserved inside asset detail/form flows | focused workflow seed path | PASS | none |
| Import / export | asset import + snapshot/template | command action zone | visible text inventory | PASS | none |
| Display / saved views | local asset view persistence | shared panels | source audit | PASS | none |
| Lifecycle / data states | inventory / deleted split + loading/error | shared shell + scope switch | source audit | PASS | none |
| Modal / form dirty-state | asset/service/network dirty guards | preserved | source audit | PASS | none |
