import re
import sys

patterns = [
    (
        re.compile(
            r'(?i)(token|secret|password|passwd|api[_-]?key|'
            r'access[_-]?key|private[_-]?key|client[_-]?secret|'
            r'authorization|cookie|credential)'
        ),
        None,
    ),
]

def redact(line):
    # KEY=value / YAML-ish assignments
    m = re.match(
        r'^(\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_.-]*)\s*[:=]\s*)(.*)$',
        line,
    )
    if m and patterns[0][0].search(m.group(2)):
        return m.group(1) + "[REDACTED]\n"

    # JSON/YAML quoted secret fields
    line = re.sub(
        r'''(?ix)
        (
          ["']?
          (?:token|secret|password|passwd|api[_-]?key|
             access[_-]?key|private[_-]?key|client[_-]?secret|
             authorization|cookie|credential)
          ["']?\s*:\s*
        )
        (["'])
        .*?
        \2
        ''',
        r'\1"[REDACTED]"',
        line,
    )

    # Authorization / bearer
    line = re.sub(
        r'(?i)(authorization\s*[:=]\s*(?:bearer\s+)?)([^\s,"\']+)',
        r'\1[REDACTED]',
        line,
    )
    line = re.sub(
        r'(?i)(bearer\s+)([A-Za-z0-9._~+/=-]{8,})',
        r'\1[REDACTED]',
        line,
    )

    # Common GitHub token forms
    line = re.sub(
        r'\b(?:gh[pousr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,})\b',
        '[REDACTED_GITHUB_TOKEN]',
        line,
    )

    # JWT-like tokens
    line = re.sub(
        r'\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b',
        '[REDACTED_JWT]',
        line,
    )

    # credentials embedded in URLs
    line = re.sub(
        r'(https?://[^:/@\s]+:)([^@\s]+)(@)',
        r'\1[REDACTED]\3',
        line,
    )

    return line

for ln in sys.stdin:
    sys.stdout.write(redact(ln))
