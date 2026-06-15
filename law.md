# SysGrid Development Law

## UI Standardization (Golden Template)
- All entity detail windows MUST use the `WorkspaceModal` shell.
- All entity detail windows MUST include the `WorkspaceShareHeader` component.
- All detail views MUST be deep-linked using the `?id=...` URL parameter pattern.

## Test Architecture (Golden POM)
- **NO RAW SELECTORS:** Test suites MUST NOT use `page.getBy...` or `page.locator(...)` directly.
- **USE POM:** All UI interactions MUST be encapsulated in Page Object Model (POM) classes located in `frontend/tests/pom/`.
- **SELF-HEALING:** If a UI element changes, update the POM method once. Do NOT update individual test files.
- **PRE-VALIDATION:** All seed data MUST be validated against Pydantic schemas in `seed.py` before bootstrapping the environment.
