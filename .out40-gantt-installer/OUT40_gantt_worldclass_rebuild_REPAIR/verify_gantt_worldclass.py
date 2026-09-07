#!/usr/bin/env python3
from pathlib import Path
import hashlib
import sys

ROOT = Path(sys.argv[1] if len(sys.argv) > 1 else '.').resolve()
PKG = Path(__file__).resolve().parent
GOLDEN = ROOT / 'frontend/src/components/ProjectsGolden.tsx'
COMPLETION = ROOT / 'frontend/src/components/ProjectsSchedulingCompletion.tsx'
REPLACEMENT = PKG / 'ProjectTimeline.worldclass.tsx'
for p in (GOLDEN, COMPLETION, REPLACEMENT):
    if not p.exists():
        raise SystemExit(f'FAIL missing required file: {p}')

g = GOLDEN.read_text(encoding='utf-8')
c = COMPLETION.read_text(encoding='utf-8')
r = REPLACEMENT.read_text(encoding='utf-8').rstrip() + '\n'
start_marker = 'function ProjectTimeline('
end_marker = '\nfunction MyWorkExecution('
if g.count(start_marker) != 1 or g.count(end_marker) != 1:
    raise SystemExit('FAIL ProjectTimeline boundaries are not unique')
s = g.index(start_marker)
e = g.index(end_marker, s)
installed = g[s:e].rstrip() + '\n'
if installed != r:
    raise SystemExit('FAIL installed ProjectTimeline does not exactly match packaged renderer')
if g.count('data-project-flagship-gantt="true"') != 1:
    raise SystemExit('FAIL flagship marker count is not exactly one')
required_completion = (
    'querySelectorAll<SVGPathElement>(\'[data-project-timeline-dependency-connector="true"]\')',
    "path.getAttribute('data-project-timeline-dependency-source')",
    "path.getAttribute('data-project-timeline-dependency-target')",
)
missing = [x for x in required_completion if x not in c]
if missing:
    raise SystemExit('FAIL ProjectsSchedulingCompletion.tsx missing identity contracts: ' + ', '.join(missing))
if 'const relation = relations[index]' in c:
    raise SystemExit('FAIL legacy index-based dependency identity remains')
required_renderer = (
    'data-project-timeline-dependency-source={link.sourceId}',
    'data-project-timeline-dependency-target={link.targetId}',
    'renderedRows = visibleRows.slice(renderStart, renderEnd)',
    'nonWorkingBands',
    'markerEnd="url(#project-gantt-arrow)"',
    'H ${elbow} V ${targetY} H ${targetX}',
)
missing = [x for x in required_renderer if x not in installed]
if missing:
    raise SystemExit('FAIL packaged renderer itself is missing expected contracts: ' + ', '.join(missing))
print('PASS exact renderer match')
print('PASS explicit dependency identity')
print('PASS virtualized row window')
print('PASS global grid / orthogonal connector contracts')
print('RENDERER_SHA256 ' + hashlib.sha256(r.encode('utf-8')).hexdigest())
