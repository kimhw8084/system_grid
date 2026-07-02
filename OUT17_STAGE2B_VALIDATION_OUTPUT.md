# OUT17 Stage 2B Validation Output

## `cd frontend && npm run typecheck`

Command run:

```bash
cd /Users/haewonkim/home/development/sysgrid/frontend && rtk npm run typecheck
```

Exact output:

```text
> tsc --noEmit
```

## Focused Playwright `/vendors-real` proof

Command run:

```bash
cd /Users/haewonkim/home/development/sysgrid/frontend && rtk npx playwright test tests/vendors-real-runtime.spec.ts --reporter=line
```

Exact output:

```text
PASS (3) FAIL (0)

Time: 8672ms
```

## Route mapping proof

Command run:

```bash
cd /Users/haewonkim/home/development/sysgrid && rtk rg -n 'path="/vendors"|path="/vendors-real"|<Vendor />|<VendorsReal />' frontend/src/App.tsx
```

Exact output:

```text
618:            <SidebarItem icon={Globe} label="Vendors" path="/vendors" active={location.pathname === "/vendors"} isOpen={isSidebarOpen} isSubItem disabled={userProfile && !userProfile.is_admin && getPermLevel(userProfile.permissions, "vendors") < 1} />
733:              <Route path="/vendors" element={<ProtectedRoute view="vendors" userProfile={userProfile}><Vendor /></ProtectedRoute>} />
734:              <Route path="/vendors-real" element={<ProtectedRoute view="vendors" userProfile={userProfile}><VendorsReal /></ProtectedRoute>} />
```

## Candidate file existence proof

Command run:

```bash
cd /Users/haewonkim/home/development/sysgrid && rtk rg --files frontend/src/components | rg '(^|/)(Vendor|VendorsReal)\.tsx$'
```

Exact output:

```text
frontend/src/components/Vendor.tsx
frontend/src/components/VendorsReal.tsx
```

## Stale `rowActionMenu` proof

Command run:

```bash
cd /Users/haewonkim/home/development/sysgrid && rtk rg -n 'rowActionMenu\.style|setRowActionMenu\(\{ item \}\)' frontend/src/components/VendorsReal.tsx
```

Exact output:

```text
(no output, exit 1)
```

## Git status

Command run:

```bash
cd /Users/haewonkim/home/development/sysgrid && git status --short
```

Exact output:

```text
```

## `git diff --name-only`

Command run:

```bash
cd /Users/haewonkim/home/development/sysgrid && git diff --name-only
```

Exact output:

```text
```

## `git diff --stat`

Command run:

```bash
cd /Users/haewonkim/home/development/sysgrid && git diff --stat
```

Exact output:

```text
```
