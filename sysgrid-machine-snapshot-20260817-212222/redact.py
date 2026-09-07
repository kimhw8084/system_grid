import re
import sys

SECRET = re.compile(
    r"(token|secret|password|passwd|api[_-]?key|access[_-]?key|"
    r"private[_-]?key|client[_-]?secret|authorization|cookie|"
    r"credential|bearer)",
    re.I,
)

def redact(line):
    # shell/env/YAML-ish assignments
    m = re.match(
        r'^(\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_.-]*)\s*[:=]\s*)(.*)$',
        line,
    )
    if m and SECRET.search(m.group(2)):
        return m.group(1) + "[REDACTED]\n"

    # JSON / quoted keys
    line = re.sub(
        r'(?i)(["\']?(?:token|secret|password|passwd|api[_-]?key|'
        r'access[_-]?key|private[_-]?key|client[_-]?secret|'
        r'authorization|cookie|credential)["\']?\s*:\s*)'
        r'(["\'])(.*?)\2',
        r'\1\2[REDACTED]\2',
        line,
    )

    # CLI arguments such as --token VALUE
    line = re.sub(
        r'(?i)(--?(?:token|secret|password|passwd|api[_-]?key|'
        r'access[_-]?key|client[_-]?secret|authorization|credential)'
        r'(?:=|\s+))([^\s]+)',
        r'\1[REDACTED]',
        line,
    )

    # Authorization/Bearer material
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

    # credentials embedded in URLs
    line = re.sub(
        r'(https?://[^:/@\s]+:)([^@\s]+)(@)',
        r'\1[REDACTED]\3',
        line,
    )

    return line

for ln in sys.stdin:
    sys.stdout.write(redact(ln))
