# Stage 26 Feature Mounting Matrix

| Feature | Old feature source | New golden slot | Interaction evidence | Result | Blocker |
| --- | --- | --- | --- | --- | --- |
| quick look/details | `AssetsGoldenWorkspace.tsx` | floating panel / modal | code preserved | PARTIAL | no live render |
| map | `AssetsGoldenWorkspace.tsx` | scaffold child surface | code preserved | PARTIAL | no live render |
| relationships/dependencies | `AssetsGoldenWorkspace.tsx` | detail views / map | code preserved | PARTIAL | no live render |
| forms/details editing | `AssetsGoldenWorkspace.tsx` | modal flow | code preserved | PARTIAL | no live render |
| history | existing legacy flows | existing modal/detail flow | code preserved | PARTIAL | no live render |
| compare | `viewMode === 'compare'` | scaffold child surface | code preserved | PARTIAL | no live render |
| report | `viewMode === 'report'` | scaffold child surface | code preserved | PARTIAL | no live render |
| security | existing detail views | detail/modal slots | code preserved | PARTIAL | no live render |
| secrets | existing detail views | detail/modal slots | code preserved | PARTIAL | no live render |
| hardware | existing detail views | detail/modal slots | code preserved | PARTIAL | no live render |
| monitoring | existing linked flows | detail/modal/navigation slots | code preserved | PARTIAL | no live render |
| import/export | anchored panels | floating panels | code preserved | PARTIAL | no live render |
| display/saved views | anchored panels | floating panels | code preserved | PARTIAL | no live render |
| lifecycle/data states | grid surface state | scaffold child surface | code preserved | PARTIAL | no live render |
| modal/form dirty-state | modal flows | modal flows | form-contracts check passed | PARTIAL | no live render |
