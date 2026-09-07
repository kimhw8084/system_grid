#!/usr/bin/env python3
from pathlib import Path
import os
import shutil
import sys
import tempfile
from datetime import datetime, timezone

ROOT = Path(sys.argv[1] if len(sys.argv) > 1 else '.').resolve()
PKG = Path(__file__).resolve().parent
GOLDEN = ROOT / 'frontend/src/components/ProjectsGolden.tsx'
COMPLETION = ROOT / 'frontend/src/components/ProjectsSchedulingCompletion.tsx'
REPLACEMENT_PATH = PKG / 'ProjectTimeline.worldclass.tsx'

for p in (GOLDEN, COMPLETION, REPLACEMENT_PATH):
    if not p.exists():
        raise SystemExit(f'FAIL_CLOSED missing required file: {p}')

golden_source = GOLDEN.read_text(encoding='utf-8')
completion_source = COMPLETION.read_text(encoding='utf-8')
replacement = REPLACEMENT_PATH.read_text(encoding='utf-8').rstrip() + '\n'

start_marker = 'function ProjectTimeline('
end_marker = '\nfunction MyWorkExecution('
if golden_source.count(start_marker) != 1 or golden_source.count(end_marker) != 1:
    raise SystemExit('FAIL_CLOSED ProjectsGolden.tsx timeline boundaries are not unique')
start = golden_source.index(start_marker)
end = golden_source.index(end_marker, start)
installed_timeline = golden_source[start:end].rstrip() + '\n'

old_wrapper = '''      const relations = dependencyRelations(project)
      const paths = Array.from(root.querySelectorAll<SVGPathElement>('svg path.pointer-events-auto'))
      paths.forEach((path, index) => {
        const relation = relations[index]
        if (!relation) return
        path.setAttribute('role', 'button')
        path.setAttribute('tabindex', '0')
        path.setAttribute('aria-label', `Remove dependency ${relation.sourceName} → ${relation.targetName}`)
        path.setAttribute('data-project-timeline-dependency-connector', 'true')
        path.setAttribute('data-project-timeline-dependency-source', relation.sourceId)
        path.setAttribute('data-project-timeline-dependency-target', relation.targetId)
      })'''
new_wrapper = '''      const paths = Array.from(root.querySelectorAll<SVGPathElement>('[data-project-timeline-dependency-connector="true"]'))
      paths.forEach((path) => {
        const sourceId = String(path.getAttribute('data-project-timeline-dependency-source') || '')
        const targetId = String(path.getAttribute('data-project-timeline-dependency-target') || '')
        const sourceTask = taskFor(project, sourceId)
        const targetTask = taskFor(project, targetId)
        if (!sourceId || !targetId || !sourceTask || !targetTask) return
        path.setAttribute('role', 'button')
        path.setAttribute('tabindex', '0')
        path.setAttribute('aria-label', `Remove dependency ${String(sourceTask.name || `Task ${sourceId}`)} → ${String(targetTask.name || `Task ${targetId}`)}`)
      })'''

explicit_selector = '[data-project-timeline-dependency-connector="true"]'
legacy_index_token = 'const relation = relations[index]'

# Work out both target files completely before any write.
next_golden = golden_source
if installed_timeline != replacement:
    next_golden = golden_source[:start] + replacement + golden_source[end:]

next_completion = completion_source
if legacy_index_token in completion_source:
    if completion_source.count(old_wrapper) != 1:
        raise SystemExit('FAIL_CLOSED legacy connector mapping exists but does not match the reviewed block exactly once')
    next_completion = completion_source.replace(old_wrapper, new_wrapper, 1)
elif explicit_selector in completion_source:
    # Already on explicit identity mapping: keep it.
    pass
else:
    raise SystemExit('FAIL_CLOSED connector decoration is neither the reviewed legacy mapping nor the explicit-identity mapping')

# Validate the complete target state before any write.
ns = next_golden.index(start_marker)
ne = next_golden.index(end_marker, ns)
target_timeline = next_golden[ns:ne].rstrip() + '\n'
if target_timeline != replacement:
    raise SystemExit('FAIL_CLOSED target ProjectTimeline does not exactly match packaged renderer')
if next_golden.count('data-project-flagship-gantt="true"') != 1:
    raise SystemExit('FAIL_CLOSED flagship Gantt marker count is not exactly one in target state')
if explicit_selector not in next_completion:
    raise SystemExit('FAIL_CLOSED explicit connector identity selector missing in target state')
if legacy_index_token in next_completion:
    raise SystemExit('FAIL_CLOSED legacy index-based connector identity remains in target state')

changes = []
if next_golden != golden_source:
    changes.append((GOLDEN, next_golden))
if next_completion != completion_source:
    changes.append((COMPLETION, next_completion))

if not changes:
    print('PASS exact world-class Gantt renderer already installed; no files changed')
    raise SystemExit(0)

# Back up every repo file that may change.
stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
backup_dir = ROOT / f'.out40-gantt-backup-{stamp}'
backup_dir.mkdir(parents=False, exist_ok=False)
shutil.copy2(GOLDEN, backup_dir / 'ProjectsGolden.tsx')
shutil.copy2(COMPLETION, backup_dir / 'ProjectsSchedulingCompletion.tsx')

# Stage all changed outputs on the same filesystem before the first replacement.
def stage(path: Path, text: str) -> Path:
    fd, tmp_name = tempfile.mkstemp(prefix=path.name + '.', suffix='.out40.tmp', dir=str(path.parent))
    with os.fdopen(fd, 'w', encoding='utf-8', newline='') as f:
        f.write(text)
        f.flush()
        os.fsync(f.fileno())
    return Path(tmp_name)

staged = [(path, stage(path, text)) for path, text in changes]
try:
    for path, temp_path in staged:
        os.replace(temp_path, path)
except Exception:
    shutil.copy2(backup_dir / 'ProjectsGolden.tsx', GOLDEN)
    shutil.copy2(backup_dir / 'ProjectsSchedulingCompletion.tsx', COMPLETION)
    for _, temp_path in staged:
        try:
            temp_path.unlink(missing_ok=True)
        except Exception:
            pass
    raise

print('PASS repaired/applied exact world-class Gantt renderer')
print(f'BACKUP {backup_dir}')
for path, _ in changes:
    print(f'UPDATED {path}')
