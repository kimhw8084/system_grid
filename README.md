# SysGrid Infrastructure

SysGrid is a multi-tenant, high-performance monitoring and orchestration platform designed for complex infrastructure.

## Core Architecture
- **Golden Template:** All UI modules utilize a standardized shell (Dossier shell, integrated share headers, and deep-linking) to ensure a consistent, reliable user experience.
- **Sentinel CI:** A zero-tolerance automated test suite that validates structural integrity, deep-linking, and console-error-free performance across all views.
- **Contract-Based Validation:** Backend seed data and API responses are pre-validated against Pydantic schemas, eliminating runtime type mismatches.

## Development & Testing
### Automated Safety Gate
Before any deployment or PR, the Sentinel suite must pass:
```bash
npx playwright test tests/sentinel_comprehensive.spec.ts
```

### Adding New Features
1. **Model:** Define Pydantic schema in `backend/app/schemas/`.
2. **Standardize:** Inject `WorkspaceShareHeader` and deep-linking using `useSearchParams`.
3. **Verify:** Encapsulate UI interactions in a Page Object Model (`frontend/tests/pom/`).
4. **Sentinel:** Add the new view to the `sentinel_comprehensive` test suite.

## Operational Standards (law.md)
- **Zero Raw Selectors:** Never use `page.locator()` directly in tests; use the POM registry.
- **Unique Keys:** All React lists must use unique, deterministic identifiers (`item.id`).
- **Validated Seeding:** All data bootstrapping must pass schema validation.
