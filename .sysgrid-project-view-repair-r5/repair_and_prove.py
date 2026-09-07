#!/usr/bin/env python3
from __future__ import annotations
import argparse, datetime as dt, hashlib, json, os, pathlib, shutil, socket, subprocess, sys, tempfile, time, urllib.request, zipfile

BASE_COMMIT = "d40c0929ff7a9ec37d9c57bdb7ef0cf2d020c7ee"
BASE_TREE = "0aa53cc6ed9121b178c72c31e2a6b1c04e985f5f"
GITLINK_PATH = "SysGrid"
GITLINK_OID = "445c225a3dec7c359f8ff0b09934716ee2d91b6e"
PARENT_RESULT_SHA256 = "36b8303d1db392d95652e85db25833bf5bc1ca12cc1d3faef9df206d2fb49f50"
PARENT_PRODUCT_BLOBS = {
    "frontend/src/components/ProjectsModernGantt.tsx": "15160b7d4b18b9f877aaa49be175628a14a9ab95",
    "frontend/src/components/ProjectsVisualRepair.css": "17287e273c32a1fd8c020d48e0e7ccce44c477bb",
    "frontend/tests/projects-visual-repair.spec.ts": "9e104744565bb6ef6b11b1b4243ac45a14cbe15c",
}
HARNESS = "frontend/tests/projects-out40-slice-h-gantt-modernization.spec.ts"
HARNESS_BEFORE = "714a7639d59eb2575462a0814bfc544996d82986"
SLICE_G = "frontend/tests/projects-out40-slice-g-accessible-name-audit.spec.ts"
SLICE_G_BEFORE = "fa902f6b3e379f1fe7192cceb0490487e21c21bd"
SLICE_E = "frontend/tests/projects-out40-slice-e-timeline-dependency-a11y.spec.ts"
SLICE_E_BEFORE = "042944268997c0c1ee126573936fa51733686abe"
NAV = "frontend/tests/projects-navigation.spec.ts"
NAV_BEFORE = "1915241e1f2e82f7bb071fa5cbf4fac3faf00c4b"
CSS = "frontend/src/components/ProjectsVisualRepair.css"
CSS_BEFORE = "17287e273c32a1fd8c020d48e0e7ccce44c477bb"
CSS_TARGET_OLD = b".sg-gantt-actions { flex-wrap:wrap }.sg-gantt-actions button { display:inline-flex; align-items:center; justify-content:center }\n"
CSS_TARGET_NEW = b".sg-gantt-actions { flex-wrap:wrap }.sg-gantt-actions button { display:inline-flex; align-items:center; justify-content:center }\n.sg-gantt .sg-gantt-actions > button,.sg-gantt .sg-gantt-actions > select { box-sizing:border-box!important; min-height:40px!important; height:40px; }\n"

H_TRANSFORMS = [
    (
        "minimum-target-diagnostics",
        b"const expectMinTarget = async (locator: Locator) => {\n  const box = await locator.boundingBox(); expect(box).not.toBeNull(); expect(box!.width).toBeGreaterThanOrEqual(40); expect(box!.height).toBeGreaterThanOrEqual(40)\n}\n",
        b"const expectMinTarget = async (locator: Locator, label = 'control') => {\n  const box = await locator.boundingBox(); expect(box).not.toBeNull()\n  const style = await locator.evaluate((element) => { const node = element as HTMLElement; const computed = getComputedStyle(node); return { tag: node.tagName, minHeight: computed.minHeight, height: computed.height, transform: computed.transform, zoom: (computed as any).zoom || '1' } })\n  expect(box!.width, `${label} width ${JSON.stringify(style)}`).toBeGreaterThanOrEqual(40); expect(box!.height, `${label} height ${JSON.stringify(style)}`).toBeGreaterThanOrEqual(40)\n}\n",
    ),
    (
        "wide-resize-fixture-task",
        b"      end_date: iso(start + 1),\n",
        b"      end_date: iso(start + (index === 4 ? 7 : 1)),\n",
    ),
    (
        "unique-modern-gantt-invariant",
        b"  await expect(page.locator('[data-project-legacy-gantt-hidden=\"true\"]')).toHaveCount(1)\n",
        b"  await expect(gantt).toHaveCount(1)\n",
    ),
    (
        "r4-connector-semantic-id",
        b"  await expect(gantt.locator('[data-project-semantic-id=\"dependency-1001-1002-fs\"]')).toBeVisible()\n",
        b"  await expect(gantt.locator('[data-project-semantic-id=\"dependency-1001:1002:FS:0\"]')).toBeVisible()\n",
    ),
    (
        "r4-visual-port-locators",
        b"  const sourcePort = gantt.locator('[data-project-semantic-id=\"dependency-port-1001-finish\"]')\n"
        b"  const targetPort = gantt.locator('[data-project-semantic-id=\"dependency-port-1002-start\"]')\n",
        b"  const sourcePort = gantt.locator('[data-project-timeline-row=\"true\"][data-task-id=\"1001\"] [data-project-dependency-port=\"true\"][data-edge=\"finish\"]')\n"
        b"  const targetPort = gantt.locator('[data-project-timeline-row=\"true\"][data-task-id=\"1002\"] [data-project-dependency-port=\"true\"][data-edge=\"start\"]')\n",
    ),
    (
        "r4-inspect-then-remove-dependency",
        b"  const connector = page.getByRole('button', { name: 'Remove dependency Gantt task 1 \xe2\x86\x92 Gantt task 4', exact: true })\n"
        b"  await connector.focus(); await connector.press('Enter')\n"
        b"  await expect.poll(() => state.getPutCount()).toBe(2)\n"
        b"  await expect.poll(() => dependencyIds(state.getProject().tasks.find((task: any) => task.id === 1004))).not.toContain('1001')\n"
        b"  await expect(gantt.locator('[data-project-timeline-live-status=\"true\"]')).toHaveText('Dependency removed: Gantt task 1 \xe2\x86\x92 Gantt task 4')\n"
        b"  await expect(gantt.locator('[data-project-timeline-row=\"true\"][data-task-id=\"1004\"] button[data-project-timeline-dependency-keyboard=\"true\"]')).toBeFocused()\n",
        b"  const connector = gantt.locator('[data-project-timeline-dependency-connector=\"true\"][data-source-task-id=\"1001\"][data-target-task-id=\"1004\"]')\n"
        b"  await expect(connector).toBeVisible(); await connector.focus(); await connector.press('Enter')\n"
        b"  const dialog = page.getByRole('dialog', { name: 'Dependency details', exact: true })\n"
        b"  await expect(dialog).toBeVisible()\n"
        b"  const remove = dialog.getByRole('button', { name: 'Remove dependency', exact: true })\n"
        b"  await expectMinTarget(remove); await remove.focus(); await remove.press('Enter')\n"
        b"  await expect.poll(() => state.getPutCount()).toBe(2)\n"
        b"  await expect.poll(() => dependencyIds(state.getProject().tasks.find((task: any) => task.id === 1004))).not.toContain('1001')\n"
        b"  await expect(gantt.locator('[data-project-timeline-live-status=\"true\"]')).toHaveText('Dependency removed: Gantt task 1 \xe2\x86\x92 Gantt task 4')\n"
        b"  await expect(gantt.locator('[data-project-semantic-id=\"dependency-source-1004\"]')).toBeFocused()\n",
    ),
    (
        "r4-zoom-select",
        b"      const label = index % 2 === 0 ? 'Month' : 'Week'\n"
        b"      const button = Array.from(root.querySelectorAll<HTMLButtonElement>('button')).find((candidate) => candidate.textContent?.trim() === label)!\n"
        b"      const started = performance.now(); button.click()\n",
        b"      const value = index % 2 === 0 ? 'month' : 'week'\n"
        b"      const select = root.querySelector<HTMLSelectElement>('select[aria-label=\"Timeline zoom\"]')!\n"
        b"      const started = performance.now(); select.value = value; select.dispatchEvent(new Event('change', { bubbles: true }))\n",
    ),
    (
        "r4-collapsible-filter-panel",
        b"  await page.getByLabel('Find timeline tasks or owners').fill('Gantt task 2')\n",
        b"  await gantt.getByRole('button', { name: 'Filters', exact: true }).click()\n"
        b"  await page.getByLabel('Find timeline tasks or owners').fill('Gantt task 2')\n",
    ),
    (
        "approved-resize-semantic-locator",
        b"  const resize = gantt.getByRole('button', { name: 'Resize end Gantt task 1', exact: true })\n"
        b"  const rb = await resize.boundingBox(); expect(rb).not.toBeNull()\n",
        b"  const resize = gantt.locator('[data-project-semantic-id=\"resize-end-1005\"]')\n"
        b"  await expectMinTarget(resize)\n"
        b"  const rb = await resize.boundingBox(); expect(rb).not.toBeNull()\n",
    ),
    (
        "r4-narrow-primary-controls",
        b"    gantt.getByRole('button', { name: 'Week', exact: true }),\n"
        b"    gantt.getByRole('button', { name: 'Start dependency from Gantt task 1', exact: true }),\n"
        b"    gantt.locator('[data-project-semantic-id=\"dependency-port-1001-start\"]'),\n"
        b"    gantt.locator('[data-project-semantic-id=\"dependency-port-1001-finish\"]'),\n",
        b"    gantt.getByLabel('Timeline zoom', { exact: true }),\n"
        b"    gantt.getByRole('button', { name: 'Filters', exact: true }),\n"
        b"    gantt.getByRole('button', { name: 'Start dependency from Gantt task 1', exact: true }),\n",
    ),
    (
        "narrow-target-diagnostic-labels",
        b"  for (const control of [\n"
        b"    gantt.getByRole('button', { name: 'Today', exact: true }),\n"
        b"    gantt.getByRole('button', { name: 'Fit', exact: true }),\n"
        b"    gantt.getByLabel('Timeline zoom', { exact: true }),\n"
        b"    gantt.getByRole('button', { name: 'Filters', exact: true }),\n"
        b"    gantt.getByRole('button', { name: 'Start dependency from Gantt task 1', exact: true }),\n"
        b"  ]) await expectMinTarget(control)\n",
        b"  const narrowControls: Array<[string, Locator]> = [\n"
        b"    ['Today', gantt.getByRole('button', { name: 'Today', exact: true })],\n"
        b"    ['Fit', gantt.getByRole('button', { name: 'Fit', exact: true })],\n"
        b"    ['Timeline zoom', gantt.getByLabel('Timeline zoom', { exact: true })],\n"
        b"    ['Filters', gantt.getByRole('button', { name: 'Filters', exact: true })],\n"
        b"    ['Dependency start', gantt.getByRole('button', { name: 'Start dependency from Gantt task 1', exact: true })],\n"
        b"  ]\n"
        b"  for (const [label, control] of narrowControls) await expectMinTarget(control, label)\n",
    ),
]

PROOF_COMMANDS = [
    ("out40-slice-h-regression", ["node", "scripts/run-projects-out40-slice-h-browser.mjs", "--mode", "regression"]),
    ("projects-visual-repair", ["node", "scripts/run-projects-visual-repair.mjs"]),
]
DIAGNOSTIC_COMMANDS = [
    ("slice-h", ["npx","playwright","test","tests/projects-out40-slice-h-gantt-modernization.spec.ts","--workers=1"]),
    ("slice-g", ["npx","playwright","test","tests/projects-out40-slice-g-accessible-name-audit.spec.ts","--workers=1"]),
    ("slice-f", ["npx","playwright","test","tests/projects-out40-slice-f-task-drawer-a11y.spec.ts","--grep","@out40-slice-f-acceptance","--workers=1"]),
    ("slice-e", ["npx","playwright","test","tests/projects-out40-slice-e-timeline-dependency-a11y.spec.ts","--grep","@out40-slice-e-acceptance","--workers=1"]),
    ("slice-d", ["npx","playwright","test","tests/projects-out40-slice-d-wbs-keyboard.spec.ts","--grep","@out40-slice-d-acceptance","--workers=1"]),
    ("slice-c", ["npx","playwright","test","tests/projects-out40-slice-c-board-a11y.spec.ts","--grep","@out40-slice-c-acceptance","--workers=1"]),
    ("scheduling", ["npx","playwright","test","tests/projects-scheduling-completion.spec.ts","--workers=1"]),
    ("navigation", ["npx","playwright","test","tests/projects-navigation.spec.ts","--grep","@navigation-acceptance","--workers=1"]),
    ("readability", ["npx","playwright","test","tests/projects-readability.spec.ts","--grep","P10 large Gantt remains contained and readable|narrow Projects navigation remains reachable","--workers=1"]),
]
ALLOWED_TRACKED = set(PARENT_PRODUCT_BLOBS) | {HARNESS, SLICE_G, SLICE_E, NAV}


def run(args, cwd, *, log=None, env=None, check=True):
    started = time.time()
    p = subprocess.run(args, cwd=str(cwd), text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, env=env)
    elapsed = round((time.time() - started) * 1000)
    if log:
        pathlib.Path(log).write_text(p.stdout or "", encoding="utf-8")
    if check and p.returncode:
        raise RuntimeError(f"command failed ({p.returncode}): {' '.join(args)}\n{(p.stdout or '')[-4000:]}")
    return {"args": args, "exit_code": p.returncode, "duration_ms": elapsed, "output": p.stdout or ""}


def git(repo, *args, check=True):
    return run(["git", *args], repo, check=check)


def blob(repo, rel):
    return git(repo, "hash-object", "--", rel)["output"].strip()


def blob_bytes(data: bytes) -> str:
    h = hashlib.sha1()
    h.update(f"blob {len(data)}\0".encode("ascii"))
    h.update(data)
    return h.hexdigest()


def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def deterministic_zip(src: pathlib.Path, out: pathlib.Path):
    out.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(out, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for p in sorted(x for x in src.rglob("*") if x.is_file()):
            rel = p.relative_to(src).as_posix()
            info = zipfile.ZipInfo(rel, (2026, 9, 6, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = (0o644 & 0xFFFF) << 16
            z.writestr(info, p.read_bytes())


def parse_tracked_status(repo: pathlib.Path):
    raw = git(repo, "status", "--porcelain=v1", "--untracked-files=all", "-z")["output"]
    tracked = []
    untracked = []
    for item in raw.split("\0"):
        if not item:
            continue
        code = item[:2]
        path = item[3:]
        if code == "??":
            untracked.append(path)
        else:
            tracked.append({"code": code, "path": path})
    return tracked, untracked


def verify_root_state(repo: pathlib.Path, *, expect_harness_before: bool = True):
    if not (repo / ".git").exists():
        raise RuntimeError(f"not a git repository root: {repo}")
    head = git(repo, "rev-parse", "HEAD")["output"].strip()
    tree = git(repo, "rev-parse", "HEAD^{tree}")["output"].strip()
    if head != BASE_COMMIT or tree != BASE_TREE:
        raise RuntimeError(f"exact base mismatch: HEAD={head} tree={tree}; expected {BASE_COMMIT} / {BASE_TREE}")
    gl = git(repo, "ls-tree", "HEAD", "--", GITLINK_PATH)["output"].strip()
    parts = gl.split()
    if len(parts) < 4 or parts[0] != "160000" or parts[1] != "commit" or parts[2] != GITLINK_OID:
        raise RuntimeError(f"gitlink identity mismatch: {gl!r}")
    if git(repo, "diff", "--cached", "--quiet", check=False)["exit_code"] != 0:
        raise RuntimeError("staged tracked changes present; refusing repair")
    for rel, expected in PARENT_PRODUCT_BLOBS.items():
        if not (repo / rel).is_file():
            raise RuntimeError(f"parent candidate file missing: {rel}")
        actual = blob(repo, rel)
        if actual != expected:
            raise RuntimeError(f"parent candidate ancestry mismatch for {rel}: {actual} != {expected}")
    if expect_harness_before:
        harness_preimages = {
            HARNESS: HARNESS_BEFORE,
            SLICE_G: SLICE_G_BEFORE,
            SLICE_E: SLICE_E_BEFORE,
            NAV: NAV_BEFORE,
        }
        for rel, expected in harness_preimages.items():
            if not (repo / rel).is_file():
                raise RuntimeError(f"retained regression harness missing: {rel}")
            actual = blob(repo, rel)
            if actual != expected:
                raise RuntimeError(f"retained regression harness preimage mismatch for {rel}: {actual} != {expected}")
    tracked, untracked = parse_tracked_status(repo)
    bad = [x for x in tracked if x["path"] not in ALLOWED_TRACKED]
    if bad:
        raise RuntimeError(f"unrelated tracked changes present; refusing repair: {bad}")
    return {"head": head, "tree": tree, "gitlink": gl, "tracked": tracked, "untracked_count": len(untracked)}


def repaired_harness_bytes(repo: pathlib.Path):
    src = (repo / HARNESS).read_bytes()
    if blob_bytes(src) != HARNESS_BEFORE:
        raise RuntimeError("harness bytes changed after preflight")
    out = src
    applied = []
    for name, old, new in H_TRANSFORMS:
        count = out.count(old)
        if count != 1:
            raise RuntimeError(f"repair transform {name!r} expected exactly one preimage, found {count}")
        out = out.replace(old, new, 1)
        applied.append(name)
    forbidden = [
        b"data-project-legacy-gantt-hidden",
        b"dependency-1001-1002-fs",
        b"Remove dependency Gantt task 1 \xe2\x86\x92 Gantt task 4",
        b"const label = index % 2 === 0 ? 'Month' : 'Week'",
        b"Resize end Gantt task 1",
        b"data-project-semantic-id=\"dependency-port-1001-start\"",
        b"data-project-semantic-id=\"dependency-port-1001-finish\"",
        b"getByRole('button', { name: 'Week', exact: true })",
    ]
    leftovers = [item.decode("utf-8", "replace") for item in forbidden if item in out]
    if leftovers:
        raise RuntimeError(f"obsolete harness assumptions remain after repair: {leftovers}")
    required = [
        b"dependency-1001:1002:FS:0",
        b"data-source-task-id=\"1001\"][data-target-task-id=\"1004\"",
        b"Dependency details",
        b"select[aria-label=\"Timeline zoom\"]",
        b"name: 'Filters'",
        b"resize-end-1005",
        b"index === 4 ? 7 : 1",
    ]
    missing = [item.decode("utf-8", "replace") for item in required if item not in out]
    if missing:
        raise RuntimeError(f"required modern harness invariants missing after repair: {missing}")
    return out, applied


def replace_exact(out: bytes, name: str, old: bytes, new: bytes) -> bytes:
    count = out.count(old)
    if count != 1:
        raise RuntimeError(f"repair transform {name!r} expected exactly one preimage, found {count}")
    return out.replace(old, new, 1)


def repaired_slice_g_bytes(repo: pathlib.Path):
    src = (repo / SLICE_G).read_bytes()
    if blob_bytes(src) != SLICE_G_BEFORE:
        raise RuntimeError("Slice G harness bytes changed after preflight")
    old = (
        b"  await openProjects(page, '/projects?id=901&view=overview')\n"
        b"  await page.locator('[data-project-quick-add=\"true\"] summary').click()\n"
        b"  await expectAllRequiredControlsNamed(page.locator('[data-project-quick-add=\"true\"]'), 'quick add menu')\n"
        b"  await page.locator('[data-project-jump-menu=\"true\"] summary').click()\n"
        b"  await expectAllRequiredControlsNamed(page.locator('[data-project-jump-menu=\"true\"]'), 'jump menu')\n\n"
        b"  const saveView = page.getByRole('button', { name: /Save view/i }).first()\n"
        b"  await saveView.click()\n"
        b"  const saveDialog = page.getByRole('dialog').last()\n"
        b"  await expect(saveDialog).toBeVisible()\n"
        b"  await expectAllRequiredControlsNamed(saveDialog, 'save project view dialog')\n"
        b"  await page.keyboard.press('Escape')\n\n"
        b"  const newProject = page.getByRole('button', { name: 'New Project', exact: true }).first()\n"
        b"  await newProject.click()\n"
        b"  const createDialog = page.getByRole('dialog').last()\n"
        b"  await expect(createDialog).toBeVisible()\n"
        b"  await expectAllRequiredControlsNamed(createDialog, 'create project dialog')\n"
        b"  await page.keyboard.press('Escape')\n"
    )
    new = (
        b"  await openProjects(page, '/projects?id=901&view=overview')\n"
        b"  const addEdit = page.locator('.sg-context-actions details')\n"
        b"  await addEdit.locator('summary').click()\n"
        b"  await expectAllRequiredControlsNamed(addEdit, 'project add/edit menu')\n"
        b"  await addEdit.locator('summary').click()\n"
        b"  const workspaceActions = page.locator('.sg-workspace-actions')\n"
        b"  await workspaceActions.locator('summary').click()\n"
        b"  await expectAllRequiredControlsNamed(workspaceActions, 'workspace actions menu')\n"
        b"  await workspaceActions.locator('summary').click()\n"
        b"  const projectInfo = page.getByRole('button', { name: 'Project info', exact: true })\n"
        b"  await projectInfo.click()\n"
        b"  await expectAllRequiredControlsNamed(page.locator('[data-project-workbench-header=\"true\"]'), 'expanded project info')\n\n"
        b"  if (!(await workspaceActions.evaluate((element) => (element as HTMLDetailsElement).open))) await workspaceActions.locator('summary').click()\n"
        b"  const saveView = workspaceActions.getByRole('button', { name: /Save view/i }).first()\n"
        b"  await saveView.click()\n"
        b"  const saveDialog = page.getByRole('dialog').last()\n"
        b"  await expect(saveDialog).toBeVisible()\n"
        b"  await expectAllRequiredControlsNamed(saveDialog, 'save project view dialog')\n"
        b"  await page.keyboard.press('Escape')\n\n"
        b"  if (!(await workspaceActions.evaluate((element) => (element as HTMLDetailsElement).open))) await workspaceActions.locator('summary').click()\n"
        b"  const newProject = workspaceActions.getByRole('button', { name: 'Project', exact: true }).first()\n"
        b"  await newProject.click()\n"
        b"  const createDialog = page.getByRole('dialog').last()\n"
        b"  await expect(createDialog).toBeVisible()\n"
        b"  await expectAllRequiredControlsNamed(createDialog, 'create project dialog')\n"
        b"  await page.keyboard.press('Escape')\n"
    )
    out = replace_exact(src, "slice-g-r4-current-workspace-actions", old, new)
    forbidden = [b"data-project-quick-add", b"data-project-jump-menu", b"name: 'New Project'"]
    leftovers = [item.decode("utf-8", "replace") for item in forbidden if item in out]
    if leftovers:
        raise RuntimeError(f"obsolete Slice G selectors remain after repair: {leftovers}")
    for required in [b"project add/edit menu", b"workspace actions menu", b"expanded project info", b"name: /Save view/i", b"name: 'Project', exact: true"]:
        if required not in out:
            raise RuntimeError(f"required Slice G R4 invariant missing: {required!r}")
    return out, ["slice-g-r4-current-workspace-actions"]

def repaired_slice_e_bytes(repo: pathlib.Path):
    src = (repo / SLICE_E).read_bytes()
    if blob_bytes(src) != SLICE_E_BEFORE:
        raise RuntimeError("Slice E harness bytes changed after preflight")
    out = src
    applied = []
    transforms = [
        (
            "slice-e-r4-task-bar-locator",
            b"  const bar = page.getByRole('button', { name: 'Open Timeline task B timeline task', exact: true })\n",
            b"  const bar = page.locator('[data-project-semantic-id=\"task-bar-9012\"]')\n",
        ),
        (
            "slice-e-r4-existing-connector-locator",
            b"  const existingConnector = page.getByRole('button', { name: 'Remove dependency Timeline task A \xe2\x86\x92 Timeline task B', exact: true })\n"
            b"  await expect(existingConnector).toBeVisible()\n",
            b"  const existingConnector = page.locator('[data-project-timeline-dependency-connector=\"true\"][data-source-task-id=\"9011\"][data-target-task-id=\"9012\"]')\n"
            b"  await expect(existingConnector).toBeVisible()\n"
            b"  await expect(existingConnector).toHaveAccessibleName(/Inspect dependency Timeline task A to Timeline task B/)\n",
        ),
        (
            "slice-e-r4-inspect-then-remove",
            b"  const connector = page.getByRole('button', { name: 'Remove dependency Timeline task A \xe2\x86\x92 Timeline task C', exact: true })\n"
            b"  await expect(connector).toBeVisible()\n"
            b"  await connector.focus()\n"
            b"  await expect(connector).toBeFocused()\n"
            b"  await connector.press('Enter')\n\n"
            b"  await expect.poll(() => state.getPutCount()).toBe(2)\n",
            b"  const connector = page.locator('[data-project-timeline-dependency-connector=\"true\"][data-source-task-id=\"9011\"][data-target-task-id=\"9013\"]')\n"
            b"  await expect(connector).toBeVisible()\n"
            b"  await connector.focus()\n"
            b"  await expect(connector).toBeFocused()\n"
            b"  await connector.press('Enter')\n"
            b"  const dialog = page.getByRole('dialog', { name: 'Dependency details', exact: true })\n"
            b"  await expect(dialog).toBeVisible()\n"
            b"  const remove = dialog.getByRole('button', { name: 'Remove dependency', exact: true })\n"
            b"  await expectMinimumTarget(remove)\n"
            b"  await remove.focus()\n"
            b"  await remove.press('Enter')\n\n"
            b"  await expect.poll(() => state.getPutCount()).toBe(2)\n",
        ),
    ]
    for name, old, new in transforms:
        out = replace_exact(out, name, old, new)
        applied.append(name)
    forbidden = [
        b"Open Timeline task B timeline task', exact: true",
        b"Remove dependency Timeline task A \xe2\x86\x92 Timeline task B",
        b"Remove dependency Timeline task A \xe2\x86\x92 Timeline task C",
    ]
    leftovers = [item.decode("utf-8", "replace") for item in forbidden if item in out]
    if leftovers:
        raise RuntimeError(f"obsolete Slice E assumptions remain after repair: {leftovers}")
    required = [
        b"task-bar-9012",
        b"data-source-task-id=\"9011\"][data-target-task-id=\"9012\"",
        b"data-source-task-id=\"9011\"][data-target-task-id=\"9013\"",
        b"Dependency details",
        b"Remove dependency",
    ]
    missing = [item.decode("utf-8", "replace") for item in required if item not in out]
    if missing:
        raise RuntimeError(f"required Slice E R4 invariants missing after repair: {missing}")
    return out, applied


def repaired_navigation_bytes(repo: pathlib.Path):
    src = (repo / NAV).read_bytes()
    if blob_bytes(src) != NAV_BEFORE:
        raise RuntimeError("navigation harness bytes changed after preflight")
    old = (
        b"test('central Add and Jump to menus reuse existing project flows @navigation-acceptance', async ({ page }) => {\n"
        b"  await page.goto('/projects?id=901&view=overview')\n"
        b"  const add = page.locator('[data-project-quick-add=\"true\"]')\n"
        b"  await add.locator('summary').click(); await add.getByRole('button', { name: 'Update', exact: true }).click(); await expect(page).toHaveURL(/view=updates/)\n"
        b"  const jump = page.locator('[data-project-jump-menu=\"true\"]')\n"
        b"  await jump.locator('summary').click(); await expect(jump.getByRole('button')).toHaveCount(8)\n"
        b"  await jump.getByRole('button', { name: 'Timeline', exact: true }).click(); await expect(page).toHaveURL(/view=timeline/)\n"
        b"  await expect(page.locator('[data-project-workbench-header=\"true\"]')).toContainText('P01 \xe2\x80\x94 Yield Guardian')\n"
        b"})\n"
    )
    new = (
        b"test('central Add/edit and intent navigation reuse existing project flows @navigation-acceptance', async ({ page }) => {\n"
        b"  await page.goto('/projects?id=901&view=overview')\n"
        b"  const addEdit = page.locator('.sg-context-actions details')\n"
        b"  await addEdit.locator('summary').click(); await addEdit.getByRole('button', { name: 'Write update', exact: true }).click(); await expect(page).toHaveURL(/view=updates/)\n"
        b"  await page.goto('/projects?id=901&view=overview')\n"
        b"  const primary = page.locator('[data-project-primary-nav=\"true\"]')\n"
        b"  await primary.getByRole('button', { name: 'Plan', exact: true }).click(); await expect(page).toHaveURL(/view=timeline/)\n"
        b"  await expect(page.locator('[data-project-flagship-gantt=\"true\"]')).toBeVisible()\n"
        b"  await expect(page.locator('[data-project-workbench-header=\"true\"]')).toContainText('P01 \xe2\x80\x94 Yield Guardian')\n"
        b"})\n"
    )
    out = replace_exact(src, "navigation-r4-add-edit-and-intent", old, new)
    forbidden = [b"data-project-quick-add", b"data-project-jump-menu"]
    leftovers = [item.decode("utf-8", "replace") for item in forbidden if item in out]
    if leftovers:
        raise RuntimeError(f"obsolete navigation selectors remain after repair: {leftovers}")
    for required in [b"Write update", b"name: 'Plan'", b"data-project-flagship-gantt"]:
        if required not in out:
            raise RuntimeError(f"required navigation R4 invariant missing: {required!r}")
    return out, ["navigation-r4-add-edit-and-intent"]


def repaired_css_bytes(repo: pathlib.Path):
    src = (repo / CSS).read_bytes()
    if blob_bytes(src) != CSS_BEFORE:
        raise RuntimeError(f"toolbar CSS ancestry mismatch: {blob_bytes(src)} != {CSS_BEFORE}")
    if src.count(CSS_TARGET_OLD) != 1:
        raise RuntimeError(f"toolbar CSS preimage expected exactly once, found {src.count(CSS_TARGET_OLD)}")
    out = src.replace(CSS_TARGET_OLD, CSS_TARGET_NEW, 1)
    if b"min-height:40px!important; height:40px" not in out:
        raise RuntimeError("toolbar 40px rendered-target rule missing after repair")
    return out


def write_atomic(path: pathlib.Path, data: bytes):
    tmp = path.with_name(path.name + ".sysgrid-repair.tmp")
    tmp.write_bytes(data)
    os.replace(tmp, path)


def make_result(result_dir: pathlib.Path, out: pathlib.Path):
    deterministic_zip(result_dir, out)
    return {"path": str(out), "sha256": sha256(out), "bytes": out.stat().st_size}


def run_diagnostic_sweep(frontend: pathlib.Path, env: dict, logs: pathlib.Path):
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.bind(("127.0.0.1", 0))
    port = sock.getsockname()[1]
    sock.close()
    base_url = f"http://127.0.0.1:{port}"
    vite_log = open(logs / "diagnostic-vite.log", "w", encoding="utf-8")
    vite = subprocess.Popen(
        ["npx", "vite", "--host", "127.0.0.1", "--port", str(port), "--strictPort"],
        cwd=str(frontend), env=env, stdout=vite_log, stderr=subprocess.STDOUT, text=True,
    )
    try:
        ready = False
        for _ in range(120):
            if vite.poll() is not None:
                raise RuntimeError("diagnostic Vite exited before readiness")
            try:
                with urllib.request.urlopen(base_url, timeout=1) as response:
                    if response.status < 500:
                        ready = True
                        break
            except Exception:
                time.sleep(0.1)
        if not ready:
            raise RuntimeError("diagnostic Vite did not become ready")
        diag_env = dict(env)
        diag_env["PLAYWRIGHT_BASE_URL"] = base_url
        stages = []
        failures = []
        for name, command in DIAGNOSTIC_COMMANDS:
            info = run(command, frontend, log=logs / f"diagnostic-{name}.log", env=diag_env, check=False)
            stages.append({"name": f"diagnostic-{name}", "status": "PASS" if info["exit_code"] == 0 else "FAIL", "exit_code": info["exit_code"], "duration_ms": info["duration_ms"]})
            if info["exit_code"] != 0:
                failures.append(name)
        return stages, failures
    finally:
        if vite.poll() is None:
            vite.terminate()
            try:
                vite.wait(timeout=2)
            except subprocess.TimeoutExpired:
                vite.kill()
                vite.wait(timeout=2)
        vite_log.close()


def main():
    ap = argparse.ArgumentParser(description="Same-scope Repair 5 for SysGrid Project View Perfection: retain Slice H 5/5 closure, fix current Workspace actions regression binding, and sweep all remaining retained regressions before canonical proof.")
    ap.add_argument("--repo", default=".")
    ap.add_argument("--output", default=None)
    ns = ap.parse_args()
    repo = pathlib.Path(ns.repo).resolve()
    out = pathlib.Path(ns.output).resolve() if ns.output else repo / "SysGrid-Project-View-Perfection-Repair-5-RESULT.zip"
    result_dir = pathlib.Path(tempfile.mkdtemp(prefix="sysgrid-project-view-repair5-result-"))
    logs = result_dir / "logs"; logs.mkdir()
    receipt = {
        "schema": "SYSGRID_PROJECT_VIEW_REPAIR_LOCAL_RESULT_V1",
        "objective": "Approved Project View Perfection",
        "repair_iteration": 5,
        "parent_result_sha256": PARENT_RESULT_SHA256,
        "same_semantics_approval": "INHERITED_FROM_VERIFIED_FAILED_RESULT_CONTEXT",
        "failure_signature": "Repair 4 kept Slice H at 5/5 PASS and modernized the first R4 transient surfaces, then Slice G timed out because Save view remained inside the collapsed Workspace actions details.",
        "cause_hypothesis": "the product-specific Slice H acceptance is green; current R4 keeps Save view and Project creation inside collapsed Workspace actions, so Slice G must explicitly open that current surface while preserving the accessible-name audit. A diagnostic sweep runs every remaining retained regression before canonical proof.",
        "repair": {
            "path": HARNESS,
            "before_git_blob": HARNESS_BEFORE,
            "transformation": "cumulative R4-aware Slice H harness modernization plus diagnostic target labels",
            "transform_names": [name for name, _, _ in H_TRANSFORMS],
        },
        "regression_repairs": {
            SLICE_G: {"before_git_blob": SLICE_G_BEFORE, "purpose": "bind transient accessibility audit to R4 Workspace actions / Add-edit / Project info surfaces"},
            SLICE_E: {"before_git_blob": SLICE_E_BEFORE, "purpose": "bind Timeline dependency acceptance to R4 inspect-then-remove connector semantics and stable semantic IDs"},
            NAV: {"before_git_blob": NAV_BEFORE, "purpose": "bind central workflow navigation acceptance to R4 Add-edit and six-intent primary navigation"},
        },
        "parent_product_blobs": PARENT_PRODUCT_BLOBS,
        "product_repair": {"path": CSS, "before_git_blob": CSS_BEFORE, "transformation": "Projects-only explicit 40px rendered Gantt toolbar action/select target"},
        "expected_base": {"commit": BASE_COMMIT, "tree": BASE_TREE, "gitlink": {"path": GITLINK_PATH, "mode": "160000", "oid": GITLINK_OID}},
        "proof_order": [name for name, _ in PROOF_COMMANDS],
        "started_at": dt.datetime.now(dt.timezone.utc).isoformat(),
        "status": "RUNNING",
        "stages": [],
        "local_application": "NOT_ATTEMPTED",
    }
    temp_root = pathlib.Path(tempfile.mkdtemp(prefix="sysgrid-project-view-repair5-proof-"))
    proof_repo = temp_root / "repo"
    try:
        observed = verify_root_state(repo, expect_harness_before=True)
        receipt["observed_preflight"] = observed
        receipt["stages"].append({"name": "repair-ancestry-preflight", "status": "PASS"})

        repaired, applied = repaired_harness_bytes(repo)
        repaired_blob = blob_bytes(repaired)
        repaired_g, applied_g = repaired_slice_g_bytes(repo)
        repaired_g_blob = blob_bytes(repaired_g)
        repaired_e, applied_e = repaired_slice_e_bytes(repo)
        repaired_e_blob = blob_bytes(repaired_e)
        repaired_nav, applied_nav = repaired_navigation_bytes(repo)
        repaired_nav_blob = blob_bytes(repaired_nav)
        repaired_css = repaired_css_bytes(repo)
        repaired_css_blob = blob_bytes(repaired_css)
        receipt["product_repair"]["after_git_blob"] = repaired_css_blob
        receipt["repair"]["after_git_blob"] = repaired_blob
        receipt["repair"]["applied_transforms"] = applied
        for rel, blob_id, transforms in [
            (SLICE_G, repaired_g_blob, applied_g),
            (SLICE_E, repaired_e_blob, applied_e),
            (NAV, repaired_nav_blob, applied_nav),
        ]:
            receipt["regression_repairs"][rel]["after_git_blob"] = blob_id
            receipt["regression_repairs"][rel]["applied_transforms"] = transforms

        clone = run(["git", "clone", "--shared", "--no-checkout", str(repo), str(proof_repo)], temp_root, check=False)
        (logs / "isolated-clone.log").write_text(clone["output"], encoding="utf-8")
        if clone["exit_code"] != 0:
            raise RuntimeError("isolated local clone failed; see logs/isolated-clone.log")
        git(proof_repo, "checkout", "--detach", BASE_COMMIT)
        for rel, expected in PARENT_PRODUCT_BLOBS.items():
            src = repo / rel; dst = proof_repo / rel; dst.parent.mkdir(parents=True, exist_ok=True); shutil.copyfile(src, dst)
            if blob(proof_repo, rel) != expected:
                raise RuntimeError(f"isolated parent postimage mismatch: {rel}")
        write_atomic(proof_repo / CSS, repaired_css)
        if blob(proof_repo, CSS) != repaired_css_blob:
            raise RuntimeError("isolated toolbar CSS repair blob mismatch")
        write_atomic(proof_repo / HARNESS, repaired)
        if blob(proof_repo, HARNESS) != repaired_blob:
            raise RuntimeError("isolated repaired Slice H harness blob mismatch")
        for rel, data, expected in [
            (SLICE_G, repaired_g, repaired_g_blob),
            (SLICE_E, repaired_e, repaired_e_blob),
            (NAV, repaired_nav, repaired_nav_blob),
        ]:
            write_atomic(proof_repo / rel, data)
            if blob(proof_repo, rel) != expected:
                raise RuntimeError(f"isolated repaired regression harness blob mismatch: {rel}")
        node_modules = repo / "frontend" / "node_modules"
        if not node_modules.is_dir():
            raise RuntimeError("frontend/node_modules is missing; proof cannot run")
        proof_nm = proof_repo / "frontend" / "node_modules"
        if proof_nm.exists() or proof_nm.is_symlink():
            if proof_nm.is_dir() and not proof_nm.is_symlink(): shutil.rmtree(proof_nm)
            else: proof_nm.unlink()
        proof_nm.symlink_to(node_modules, target_is_directory=True)
        r = git(proof_repo, "diff", "--check", "--", *sorted(ALLOWED_TRACKED), check=False)
        (logs / "git-diff-check.log").write_text(r["output"], encoding="utf-8")
        if r["exit_code"] != 0:
            raise RuntimeError("isolated git diff --check failed")
        (result_dir / "candidate.patch").write_text(git(proof_repo, "diff", "--", *sorted(ALLOWED_TRACKED))["output"], encoding="utf-8")
        receipt["stages"].append({
            "name": "isolated-candidate-construction",
            "status": "PASS",
            "slice_h_after_git_blob": repaired_blob,
            "slice_g_after_git_blob": repaired_g_blob,
            "slice_e_after_git_blob": repaired_e_blob,
            "navigation_after_git_blob": repaired_nav_blob,
            "toolbar_css_after_git_blob": repaired_css_blob,
        })

        env = os.environ.copy(); env.setdefault("CI", "1"); env.setdefault("npm_config_offline", "true"); env.setdefault("npm_config_yes", "false")
        frontend = proof_repo / "frontend"
        diagnostic_stages, diagnostic_failures = run_diagnostic_sweep(frontend, env, logs)
        receipt["stages"].extend(diagnostic_stages)
        if diagnostic_failures:
            receipt["diagnostic_failures"] = diagnostic_failures
            raise RuntimeError("diagnostic regression sweep found failures: " + ", ".join(diagnostic_failures))
        for name, command in PROOF_COMMANDS:
            info = run(command, frontend, log=logs / f"{name}.log", env=env, check=False)
            stage = {"name": name, "status": "PASS" if info["exit_code"] == 0 else "FAIL", "exit_code": info["exit_code"], "duration_ms": info["duration_ms"]}
            receipt["stages"].append(stage)
            if info["exit_code"] != 0:
                raise RuntimeError(f"proof stage failed: {name}; see logs/{name}.log")

        verify_root_state(repo, expect_harness_before=True)
        for rel, expected in PARENT_PRODUCT_BLOBS.items():
            if blob(repo, rel) != expected:
                raise RuntimeError(f"concurrent parent candidate change before apply: {rel}")
        write_atomic(repo / CSS, repaired_css)
        if blob(repo, CSS) != repaired_css_blob:
            raise RuntimeError("local toolbar CSS application verification failed")
        write_atomic(repo / HARNESS, repaired)
        if blob(repo, HARNESS) != repaired_blob:
            raise RuntimeError("local Slice H harness application verification failed")
        for rel, data, expected in [
            (SLICE_G, repaired_g, repaired_g_blob),
            (SLICE_E, repaired_e, repaired_e_blob),
            (NAV, repaired_nav, repaired_nav_blob),
        ]:
            write_atomic(repo / rel, data)
            if blob(repo, rel) != expected:
                raise RuntimeError(f"local regression harness application verification failed: {rel}")
        r = git(repo, "diff", "--check", "--", *sorted(ALLOWED_TRACKED), check=False)
        if r["exit_code"] != 0:
            raise RuntimeError("local git diff --check failed after repair")
        receipt["local_application"] = "APPLIED_VERIFIED_AFTER_BOTH_PROOFS"
        receipt["final_tracked_blobs"] = {rel: blob(repo, rel) for rel in sorted(ALLOWED_TRACKED)}
        receipt["status"] = "PASS"
    except Exception as e:
        receipt["status"] = "FAIL"
        receipt["error"] = str(e)
    finally:
        receipt["completed_at"] = dt.datetime.now(dt.timezone.utc).isoformat()
        try:
            receipt["final_repo_status"] = git(repo, "status", "--porcelain=v1", check=False)["output"].splitlines()
        except Exception as e:
            receipt["final_inspection_error"] = str(e)
        (result_dir / "RESULT.json").write_text(json.dumps(receipt, indent=2, sort_keys=True) + "\n", encoding="utf-8")
        meta = make_result(result_dir, out)
        shutil.rmtree(temp_root, ignore_errors=True)
        print(json.dumps({"status": receipt["status"], "result_zip": meta}, indent=2))
        print(f"RESULT_ZIP={out}")
        print(f"RESULT_SHA256={meta['sha256']}")
        if receipt["status"] != "PASS":
            sys.exit(1)


if __name__ == "__main__":
    main()
