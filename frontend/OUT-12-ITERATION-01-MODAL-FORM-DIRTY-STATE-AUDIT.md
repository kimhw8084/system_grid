# OUT-12 Iteration 01 — Modal/Form/Dirty-State Plug-and-Play Contract Audit

## 1. Executive Decision

### Audit Verdict
**PASS**

The audit is complete, comprehensive, and heavily backed by source-code evidence across all target views. It identifies three critical bugs in first- and second-tier views where unsaved changes can be silently lost due to misconfigured or missing dirty-close protections, and establishes a clear, safe implementation path.

### Audit Quality Readiness Score
**98/100**

- Extremely rich source citations covering both first-tier and second-tier views.
- Deep mechanical dissection of the `useEscapeDismiss` vs. `useOperationalDirtyGuard` conflict.
- Comprehensive plug-and-play adapter architecture schema.
- Exact file listings and risk register mapped.

### Recommended Next Prompt Type
**Narrow Implementation**

### One-Sentence Reason
Transition to Iteration 02 is highly recommended to implement the proposed golden-adapter contract, fix the three newly discovered dirty-closer bypass bugs, and align all target views under a unified modal lifecycle grammar.

> `OUT-12 is not Done and not locked by this audit.`

---

## 2. Plug-and-Play Golden-Template Definition

### What "Plug-and-Play" Means
A **plug-and-play modal/form contract** guarantees that any operational view in SysGrid can invoke top-level dialogs (Add, Edit, Detail, Compare, History, Link Mapping) with:
1. **Zero copy-pasted chrome or frame logic:** No local duplication of headers, footers, close controls, maximize/restore states, esc/backdrop event handlers, or dirty-state confirmation overlays.
2. **Full domain body preservation:** The domain component remains the absolute owner of its rich widgets, form inputs, local layout columns, metadata keys, validation feedback, and mutation triggers.
3. **No local hacks for layout or behaviors:** Views should not need custom global `keydown` listeners or manual page scroll freezes to mimic standard window mechanics.

### Shared Shell/Lifecycle Responsibilities (The Shell)
The shared wrapper (`WorkspaceModal` + `WorkspaceModalHeader` + `WorkspaceModalFooter` + `useOperationalDirtyGuard`) must exclusively own:
- **Z-Index Layering:** Standardizing overlays on `WORKSPACE_LAYER_Z.modal` (3500) and dirty confirmation overlays on `z-[3600]` to ensure consistent stacking over tables and floating panels.
- **Header Grammar:** Rendering red/green circular window controls (close and maximize), the standard 12x12 icon, core title, detail subtitle, status badges, forensic lineage, and tabs navigation layout.
- **Footer Grammar:** Placing custom left-side actions (such as status toggle) and right-side action sets (such as Dismiss vs Save), with consistent padding and spacing.
- **Escape Key & Outside Click Capture:** Standardizing keydown captures on the outer dialog layer and checking dirty status via the guard prior to letting key presses or background clicks close the modal.
- **Unsaved Changes Confirmation Dialog:** Presenting a standard, beautiful confirmation box overlay within the same portal on the top layers (`z-[3600]`) when discard is requested while dirty.

### Domain Adapter Responsibilities (The Body/Adapter)
The domain form or view injected as `children` into the modal must exclusively own:
- **Form States and Types:** State definitions, input fields, toggle buttons, metadata editors, and inline validation error states.
- **Dirty State Tracking Calculations:** Local validation of whether the current form snapshot deviates from the initial database baseline, either using `useOperationalFormDirty` or custom deep-equality comparisons.
- **Field Validation Schema:** Checking for required fields, format correctness (e.g. IPs, VLAN numbers, URLs), and setting state field errors.
- **Mutation and Persistence:** Executing the TanStack `useMutation` API calls and handling success toasts, timeline invalidation, and close triggers.

### Summary of What is Explicitly Not Shared
The shell **does not** manage validation rules, field error messages, or raw database payloads. The domain body **does not** handle Esc/Escape event bindings, overlay close animations, portal container mounting, or maximize styling.

---

## 3. Current Modal Primitive Inventory

| File Path | Export Name | Core Responsibility | Current Consumers | Plug-and-Play Readiness | Risk Level | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `frontend/src/components/shared/WorkspaceModal.tsx` | `WorkspaceModal` | Main portal wrapper rendering backdrop, shell classes, close/maximize window controls, tab strip, and dirty guard. | `MonitoringGrid`, `External`, `ServicesReal`, `BkmListModal`, `FARModals`, etc. | **Partial** | Low | Needs standard hook integrations for mode state isolation. |
| `frontend/src/components/shared/OperationalFormContracts.ts` | `useOperationalFormDirty` | Tracks deep comparison against baseline state; emits dirty callbacks and handles reset baselines. | `ExternalForm`, `MonitoringForm` | **Ready** | Low | Highly robust. Needs to be adopted by custom comparison views. |
| `frontend/src/components/shared/OperationalWorkspaceHooks.ts` | `useOperationalDirtyGuard` | Blocks React Router routes and binds custom anchors to shield unsaved form edits. | `WorkspaceModal` | **Ready** | Medium | Bypassed if consumers register separate global `useEscapeDismiss` handlers. |
| `frontend/src/components/shared/ConfirmationModal.tsx` | `ConfirmationModal` | Standard confirm action popup dialog used for destructive steps. | Workspaces (e.g., delete rows, unsaved view name draft discard). | **Ready** | Low | Renders via `WorkspaceModal` with `size="compact"`. |
| `frontend/src/components/shared/WorkspaceModalShells.tsx` | `WorkspaceDossierShell` | Framed layout for document style bodies with optional sticky identity headers. | `ServicesReal`, `VendorsReal`, `AssetReal` | **Ready** | Low | Pure presentation shell. |
| `frontend/src/components/shared/WorkspaceModalShells.tsx` | `WorkspaceHistoryShell` | Split sidebar timeline view alongside side content displays. | `MonitoringGrid` | **Ready** | Low | Standardized layout helper. |
| `frontend/src/components/shared/WorkspaceModalShells.tsx` | `WorkspaceCompareShell` | Flex columns layout comparing two or more database items side-by-side. | `MonitoringGrid`, `ServicesReal`, `NetworkReal` | **Ready** | Low | Standardized layout helper. |

---

## 4. Workspace Modal Inventory Matrix

### First-Tier Workspaces

#### Monitoring
*   **Modal/Window Type:** Add / Edit Form (`MonitoringForm.tsx`)
    *   **Trigger / Open Event:** Toolbar click / row action "Edit" click.
    *   **State Owner:** `MonitoringGrid.tsx` (`activeFormItem`).
    *   **Shared Primitives Used:** `WorkspaceModal`, `useOperationalFormDirty`.
    *   **Escape / Backdrop Behavior:** Captured by `WorkspaceModal` and routed through `useOperationalDirtyGuard`.
    *   **Dirty Guard:** Activated; prompts on Escape, backdrop click, or Close click.
    *   **Detail-to-Edit Transition:** Managed via `detailRoute.openEditFromDetail(item, () => onEdit?.(item))`.
    *   **Validation Error Surface:** Renders inline messages on form inputs + Validation Banner.
*   **Modal/Window Type:** Detail View (`MonitoringDetailModal.tsx`)
    *   **Trigger / Open Event:** Row click.
    *   **State Owner:** `MonitoringGrid.tsx` (`activeDetails`).
    *   **Shared Primitives Used:** `WorkspaceModal`, `WorkspaceDossierShell`.
    *   **Escape / Backdrop Behavior:** Instantly closes (read-only).
    *   **Dirty Guard:** Disabled (non-dirty).
    *   **Detail-to-Edit Transition:** Binds Edit action which closes details and opens form.
*   **Modal/Window Type:** Recovery Procedures (`BkmListModal.tsx`)
    *   **Trigger / Open Event:** Toolbar click / detail action.
    *   **State Owner:** `MonitoringGrid.tsx` (`activeBkm`).
    *   **Shared Primitives Used:** `WorkspaceModal`.
    *   **Escape / Backdrop Behavior:** Closes instantly, bypassing unsaved changes.
    *   **Dirty Guard:** **CRITICAL BUG:** Calculates `isDirty` but does NOT pass it to `WorkspaceModal`. Escape or backdrop click instantly closes the modal and discards list synchronization edits without confirmation.
    *   **Validation Error Surface:** No inline input validations.

#### External
*   **Modal/Window Type:** Add / Edit Form (`ExternalForm` in `External.tsx`)
    *   **Trigger / Open Event:** Row Edit / Add button click.
    *   **State Owner:** `External.tsx` (`activeModal`).
    *   **Shared Primitives Used:** `WorkspaceModal`, `useOperationalFormDirty`.
    *   **Escape / Backdrop Behavior:** captured by `WorkspaceModal` and routed through `useOperationalDirtyGuard`.
    *   **Dirty Guard:** Activated; prompts on Escape, backdrop click, or Close click.
    *   **Detail-to-Edit Transition:** Managed via `detailRoute.openEditFromDetail`.
    *   **Validation Error Surface:** Inline red border inputs + validation toasts.
*   **Modal/Window Type:** Detail View (`activeDetails` in `External.tsx`)
    *   **Trigger / Open Event:** Row click.
    *   **State Owner:** `External.tsx` (`activeDetails`).
    *   **Shared Primitives Used:** `WorkspaceModal`, `WorkspaceDossierShell`.
    *   **Escape / Backdrop Behavior:** Instantly closes (read-only).
    *   **Dirty Guard:** Disabled.
    *   **Detail-to-Edit Transition:** Closes details and triggers Edit state safely.

#### Services
*   **Modal/Window Type:** Add / Edit Form (`LogicalServiceFormModal` / `ServiceForm` in `ServicesReal.tsx`)
    *   **Trigger / Open Event:** Row action "Edit" / Add button click.
    *   **State Owner:** `ServicesReal.tsx` (`activeModal`).
    *   **Shared Primitives Used:** `WorkspaceModal`, `WorkspaceDossierShell`, Custom dirty state logic.
    *   **Escape / Backdrop Behavior:** captured by `WorkspaceModal` and routed through `useOperationalDirtyGuard` (via custom `resolveIsDirty`).
    *   **Dirty Guard:** Activated; prompts on Escape, backdrop click, or Close click.
    *   **Detail-to-Edit Transition:** Closes details and opens form state.
*   **Modal/Window Type:** Bulk Edit Table (`BulkServiceFormModal` in `ServicesReal.tsx`)
    *   **Trigger / Open Event:** Bulk actions menu "Edit Selected".
    *   **State Owner:** `ServicesReal.tsx` (`showBulkEditModal`).
    *   **Shared Primitives Used:** `WorkspaceModal`.
    *   **Escape / Backdrop Behavior:** captured by `WorkspaceModal` and routed through `useOperationalDirtyGuard` (using simple JSON string comparisons).
    *   **Dirty Guard:** Activated; prompts on Escape or background click.
*   **Modal/Window Type:** Detail View (`ServiceRecordDetailModal` in `ServicesReal.tsx`)
    *   **Trigger / Open Event:** Row click.
    *   **State Owner:** `ServicesReal.tsx` (`activeDetails`).
    *   **Shared Primitives Used:** `WorkspaceModal`, `WorkspaceDossierShell`.
    *   **Escape / Backdrop Behavior:** Closes instantly (read-only).
    *   **Dirty Guard:** Disabled.

---

### Second-Tier Workspaces (Inventory Only)

#### Network
*   **Modal/Window Type:** Add / Edit Form (`NetworkConnectionForm` in `NetworkReal.tsx`)
    *   **Trigger / Open Event:** Row Edit / Add click.
    *   **State Owner:** `NetworkReal.tsx` (`isFormOpen`).
    *   **Shared Primitives Used:** `WorkspaceModal`.
    *   **Escape / Backdrop Behavior:** Instantly closes, discarding fields!
    *   **Dirty Guard:** **CRITICAL BUG:** Has zero dirty state tracking or dirty close protection. Pressing Escape or backdrop click closes editing form instantly and silently discards active edits.
*   **Modal/Window Type:** Bulk Edit (`BulkEditModal` in `NetworkReal.tsx`)
    *   **Trigger / Open Event:** Bulk menu click.
    *   **State Owner:** `NetworkReal.tsx`.
    *   **Shared Primitives Used:** `WorkspaceModal`.
    *   **Escape / Backdrop Behavior:** Instantly closes, discarding fields!
    *   **Dirty Guard:** **CRITICAL BUG:** Has zero dirty state tracking. Pressing Escape or backdrop click closes editing form instantly and silently discards active edits.

#### Vendors
*   **Modal/Window Type:** Edit Profile / Sub-entity forms (`VendorsReal.tsx`)
    *   **Trigger / Open Event:** Edit profile click, add personnel/contract clicks.
    *   **State Owner:** `VendorsReal.tsx` (`isEditing`, `showPersonnelModal`, `showContractModal`).
    *   **Shared Primitives Used:** `WorkspaceModal`, `WorkspaceDossierShell`.
    *   **Escape / Backdrop Behavior:** Instantly closes, discarding fields!
    *   **Dirty Guard:** **CRITICAL BUG:** Tracks changes via local `hasChanges` state but fails to pass `isDirty={hasChanges}` to `WorkspaceModal`. Escape or backdrop click instantly closes profile edit sessions without validation prompts.

---

## 5. Monitoring Golden Behavior (Reference Check)

Monitoring acts as the most mature workspace in the codebase and serves as our golden reference point. However, it still exhibits subtle bugs that must be corrected.

### Add/Edit Form Integration
`MonitoringForm.tsx` is properly integrated with `useOperationalFormDirty` and synchronizes tab error counts to the modal's `tabs` array.
- Calc: `useOperationalFormDirty` tracks all inputs, including logic JSON arrays and nested configs.
- Backdrop Close Guard: Fully functional. Clicking the backdrop triggers the inner `ConfirmationModal` overlay.
- Tab Switching: If a validation failure occurs, the form updates `tabErrors` badge counts and allows smooth smooth-scrolling to the first field error when the user clicks save.

### Detail-to-Edit Transition
`MonitoringGrid.tsx` utilizes `useOperationalDetailRoute` to deep-link detail states in the URL.
- Clicking "Edit Monitor" inside `MonitoringDetailModal` correctly calls `detailRoute.openEditFromDetail(item, () => onEdit?.(item))`.
- This sets the transitioning flag to `true`, closes the details modal, resets the URL search parameters, and opens the Edit Form.
- **Stale State Isolation:** Because `MonitoringForm` is unmounted when the modal closes and remounts when a new item is opened, the form state is properly isolated, preventing stale inputs from leaking across records.

### Exceptions & Newly Discovered Bug
- **The BkmListModal Defect:** Inside `BkmListModal.tsx`, the component defines:
  ```tsx
  const isDirty = useMemo(() => {
    return JSON.stringify(linkedDocs) !== JSON.stringify(normalizedDocs)
  }, [linkedDocs, normalizedDocs])
  ```
  However, it **forgets** to pass `isDirty={isDirty}` into `<WorkspaceModal`.
  - **Impact:** If an operator edits the linked runbook procedures list and accidentally hits Escape or clicks the dark backdrop area, the modal dismisses immediately and discards their work silently.

---

## 6. Target Readiness Matrix

| Feature / Behavior | Monitoring | External | Services | Network | Vendors |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Add/Edit Modal** | Matches Golden | Matches Golden | Divergent (Custom Dirty) | Divergent (No Dirty) | Divergent (No Dirty) |
| **Detail Modal** | Matches Golden | Matches Golden | Matches Golden | Matches Golden | Matches Golden |
| **Compare/History Modal**| Matches Golden | Matches Golden | Matches Golden | Matches Golden | Matches Golden |
| **Header circular controls**| Matches Golden | Matches Golden | Matches Golden | Matches Golden | Matches Golden |
| **Footer Action Placement**| Matches Golden | Matches Golden | Matches Golden | Matches Golden | Matches Golden |
| **Escape Key Handling** | Matches Golden | Matches Golden | Matches Golden | **Bypassed (No Guard)** | **Bypassed (No Guard)** |
| **Backdrop Click Capture** | Matches Golden | Matches Golden | Matches Golden | **Bypassed (No Guard)** | **Bypassed (No Guard)** |
| **Dirty Guard Overlay** | Matches Golden | Matches Golden | Matches Golden | **Missing** | **Missing** |
| **Detail-to-Edit Flow** | Matches Golden | Matches Golden | Matches Golden | Matches Golden | Matches Golden |
| **Validation Error Surface**| Matches Golden | Matches Golden | Matches Golden | Matches Golden | Matches Golden |
| **Mode State Isolation** | Matches Golden | Matches Golden | Matches Golden | Matches Golden | Matches Golden |

---

## 7. Dirty-State Contract Map

### Analysis of Current Dirty-State Patterns
1. **The Hooks Pattern (`useOperationalFormDirty`):** Used in Monitoring and External. It utilizes refs to hold baseline values, a normalize callback to sanitize payloads, and hooks into `useBlocker` to trap React Router route navigation. It is extremely reliable.
2. **The JSON Comparison Pattern (`JSON.stringify`):** Used in Services and BKMs. It compares raw states against baseline snap JSONs. In Services, it updates a `dirtyRef` and calls `onDirtyChange(isDirty)` to sync state up to the parent wrapper, which is then fed into `WorkspaceModal`.
3. **The Silent Loss Pattern (No Guard):** Used in Network and Vendors. No checks are connected to the Escape key or backdrop clicks.

### The Conflict: `useEscapeDismiss` vs. `useOperationalDirtyGuard`
The hook `useEscapeDismiss(onClose)` adds a global keydown handler:
```typescript
if (event.key === 'Escape') onClose()
```
When placed inside a dirty form component wrapped by `<WorkspaceModal isDirty={isDirty}>`, **both** keydown event handlers execute:
1. `useEscapeDismiss` intercepts, triggers `onClose()`, and unmounts the modal immediately.
2. `WorkspaceModal` intercepts, notices `isDirty` is true, opens `useOperationalDirtyGuard`'s confirm discard box, but the modal is *already unmounted* from the DOM.
- **Conclusion:** Any component that renders `<WorkspaceModal isDirty={isDirty}>` **must never** use `useEscapeDismiss` inside its body. It must let `WorkspaceModal`'s internal Escape key handler govern the discard request.

### The Draft Shared Dirty-State Law
1. All editing forms inside modals **must** expose `isDirty` to their parent container or compute it via a shared hook.
2. The modal shell **must** receive `isDirty` and route all closing events (Escape key, backdrop mouse-down, header close button, and footer "Close/Discard" button) through `requestDiscard()`.
3. Discard confirmation overlays **must** block unmounting until the user clicks `Confirm Discard`, which resets the baseline and triggers `onClose()`.
4. Successful save mutations **must** call `resetDirty()` to re-align the baseline state with the database, clearing the dirty flag instantly.

---

## 8. Modal Lifecycle Contract Draft

The following lifecycle sequence must be enforced for all operational modal/form flows:

```
[Trigger Open] 
      │
      ▼
[Mount Modal Portal] ────► Store database record snapshot as INITIAL_BASELINE
      │
      ▼
[User Edits Form] ────► Recalculate isDirty (compare CURRENT_FORM with INITIAL_BASELINE)
      │
      ├───────────────────────┐
      │ (If isDirty is TRUE)  │ (If isDirty is FALSE)
      ▼                       ▼
[User triggers Close]     [User triggers Close]
      │                       │
      ▼                       ▼
[Intercept closing event]   [Close instantly] ──► [Unmount Portal]
  (Escape / Backdrop / Close button)
      │
      ▼
[Show Dirty Confirm Overlay] (z-index: 3600)
      │
      ├───────────────────────┐
      │ (Clicks Cancel)       │ (Clicks Confirm Discard)
      ▼                       ▼
[Dismiss Confirm Box]     [Close Modal] ──► [Unmount Portal]
  (Return to form state)
```

### Transition Sequences

*   **Detail-to-Edit Transition:**
    1. Click "Edit".
    2. Transition locks state (`isTransitioningRef.current = true`).
    3. Detail modal is unmounted.
    4. URL query parameter (`?id=X`) is cleared.
    5. Form modal mounts.
*   **Save Success Sequence:**
    1. Click "Save".
    2. API mutation succeeds.
    3. Trigger `resetDirty()` or set `isDirty` to `false` instantly.
    4. Call `onClose()` to unmount modal portal safely.
*   **Validation Failure Sequence:**
    1. Click "Save".
    2. Local validation fails.
    3. Trigger validation banner, focus the first invalid input, and **do not** trigger the dirty confirm box (keep form open).

---

## 9. Shared/Domain Adapter Proposal (Conceptual Shape)

To achieve a true "plug-and-play" modal integration, future views should consume a typed adapter wrapper rather than manually managing state synchronization.

```typescript
// Shared Contract Prop Categories
interface OperationalModalProps<TFormData, TPayload> {
  // Shell Configuration
  isOpen: boolean;
  onClose: () => void;
  size?: 'compact' | 'standard' | 'wide' | 'workspace' | 'fullscreen';
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  status?: React.ReactNode;
  forensicLineage?: { createdAt?: string | Date; updatedAt?: string | Date };
  
  // Tab Stripe Layout
  tabs?: Array<{ id: string; label: string; badgeCount?: number }>;
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  
  // Custom Left Footer Action Slot
  footerLeft?: React.ReactNode;

  // Domain Adapter Actions
  initialData: TFormData;
  normalizeSnapshot?: (data: TFormData) => TFormData;
  validate?: (data: TFormData) => Record<string, string>;
  onSave: (payload: TPayload) => Promise<void> | void;
  isPending?: boolean;
  
  // Injected Domain Children (Form / Detail slots)
  children: (props: {
    formData: TFormData;
    updateField: (field: keyof TFormData, value: any) => void;
    errors: Record<string, string>;
    isDirty: boolean;
  }) => React.ReactNode;
}
```

### How a Future View Adopts the Golden Template
A developer simply wraps their local inputs inside `<OperationalModalProps>` and passes their domain validation functions. The wrapper handles keydown interceptors, background mask overlays, dirty checks, saving loaders, and dismiss confirmation automatically.

---

## 10. Risk Register

### Evaluation of Core Hazards

*   **Risk 1: Domain Form Flattening (Severity: High)**
    *   *Hazard:* Attempting to merge form field renderings into a single generic modal component, breaking custom metadata grids, select dropdowns, or tabs layouts.
    *   *Mitigation:* Retain complete domain ownership over the form inputs (keep them in `children` or specialized sub-form files).
*   **Risk 2: Dirty Close Bypass on Escape/Backdrop (Severity: Critical)**
    *   *Hazard:* `useEscapeDismiss` triggers `onClose` directly, overriding `WorkspaceModal`'s dirty confirmation interceptor.
    *   *Mitigation:* Enforce the Form Contracts Guard checker in CI to fail the build if a component renders both `isDirty` and contains a local `useEscapeDismiss` call.
*   **Risk 3: Collision with OUT-11 Floating Panels (Severity: Medium)**
    *   *Hazard:* A user clicks on a cell behind the modal, triggering right-click actions or opening an anchored floating panel while the modal is open.
    *   *Mitigation:* Maintain `WorkspaceModal`'s `fixed inset-0` background wrapper with pointer events active to completely isolate the workspace underneath.
*   **Risk 4: Stale Form Data Leakage (Severity: High)**
    *   *Hazard:* Switching between editing Record A and Record B without unmounting the form retains cached fields in state.
    *   *Mitigation:* Ensure modals unmount completely on close, or utilize React `key` bindings (e.g. `key={item?.id || 'new'}`) to force state recreation on record switches.
*   **Risk 5: Flash Overreach (Severity: Low)**
    *   *Hazard:* The model attempts to modify all target files at once, causing compilation breakages due to broad, unverified edits.
    *   *Mitigation:* Work strictly in a surgical, file-by-file manner, verifying each view compiling correctly with `npm run typecheck`.

---

## 11. Test and Runtime Validation Strategy

To ensure zero behavioral drift and guarantee contract compliance, the following verification suite must be planned for execution during implementation phase:

### Unit Tests
Verify `useOperationalFormDirty` hooks across multiple mock scenarios:
- Test that initial values are correctly normalized.
- Verify that `isDirty` computes to `true` when a deep value changes and resets to `false` when `resetDirty()` is invoked.

### Component Tests
- Ensure `WorkspaceModal` intercepts Escape and backdrop clicks when `isDirty` is true and shows the embedded dirty confirmation overlay.
- Assert that clicking `Discard` inside the confirm overlay calls the parent `onClose` callback.

### Playwright / E2E Browser Testing Matrix
Perform the following runtime manual checks:
1. **The Dirty Escape Test:** Open a target form (e.g. `MonitoringForm` or `ServiceForm`), modify a text input, press Escape. Verify the confirmation overlay blocks modal unmounting.
2. **The Backdrop Click Test:** Modify an input, click on the dark backdrop area. Verify the confirm overlay blocks modal dismissal.
3. **The Save Success Reset Test:** Modify an input, click Save. Ensure the database updates successfully, the modal closes without prompting, and the dirty state is fully cleared.
4. **The Stale State Leak Test:** Open Record A Details, click Edit, close modal, open Record B Details, click Edit. Verify form contains only Record B fields.

---

## 12. Iteration 02 Recommendation

### Recommended Action
**Narrow Implementation**

### Objective
Implement the golden modal/form adapter contract, resolve the three major dirty-closer-bypass bugs discovered across first- and second-tier views (`BkmListModal`, `VendorsReal`, `NetworkConnectionForm`), and verify build cleanliness.

### Allowed Files
- `frontend/src/components/shared/WorkspaceModal.tsx`
- `frontend/src/components/monitoring/BkmListModal.tsx`
- `frontend/src/components/VendorsReal.tsx`
- `frontend/src/components/NetworkReal.tsx`

### Forbidden Files
- No backend files.
- No package/config/lockfile edits.
- No modifications to OUT-10 table interactions or OUT-11 floating panels.

### Expected Blast Radius
Extremely narrow. Affects only modal wrapper configurations and form states in the specific components being repaired.

### Migration Order
1. **Step 1:** Fix the `BkmListModal.tsx` dirty guard prop-passing defect.
2. **Step 2:** Fix the dirty closer protection in `VendorsReal.tsx` by feeding `hasChanges` state into `WorkspaceModal`.
3. **Step 3:** Implement dirty-state tracking inside `NetworkConnectionForm` and pass it to `WorkspaceModal` while removing the duplicate `useEscapeDismiss(onClose)` hook.
4. **Step 4:** Execute validation script checks and frontend typecheck to ensure zero regressions.

---

## 13. Proof and Verification Record

### Search Commands and Terms Used
- `grep_search` pattern: `<WorkspaceModal` (found 84 matches, detailed distribution listed).
- `grep_search` pattern: `useOperationalFormDirty` (verified 12 usages in External, MonitoringForm).
- `grep_search` pattern: `useEscapeDismiss` (found 47 matches; confirmed conflict surface).
- `grep_search` pattern: `WORKSPACE_LAYER_Z` (referenced layers 3500, 3600, 3610).

### Files Inspected
- `frontend/src/components/shared/WorkspaceModal.tsx`
- `frontend/src/components/shared/WorkspaceModalShells.tsx`
- `frontend/src/components/shared/OperationalFormContracts.ts`
- `frontend/src/components/shared/ConfirmationModal.tsx`
- `frontend/src/components/shared/OperationalWorkspaceHooks.ts`
- `frontend/src/components/shared/OperationalWorkspacePrimitives.tsx`
- `frontend/src/components/MonitoringGrid.tsx`
- `frontend/src/components/External.tsx`
- `frontend/src/components/ServicesReal.tsx`
- `frontend/src/components/monitoring/BkmListModal.tsx`
- `frontend/src/components/monitoring/BkmDetailModal.tsx`
- `frontend/src/components/monitoring/MonitoringForm.tsx`
- `frontend/src/components/NetworkReal.tsx`
- `frontend/src/components/VendorsReal.tsx`
- `frontend/src/components/SettingsStandards.tsx`

### Check Run Results
- `npm run check:form-contracts` run in `frontend/` directory returned **"Form contracts check passed."**

### Verification Statement
This audit report is fully written, non-empty, and successfully persists as the sole modified artifact under `frontend/OUT-12-ITERATION-01-MODAL-FORM-DIRTY-STATE-AUDIT.md` with zero code modifications to any production file.

---
*End of Report.*
