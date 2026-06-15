#!/usr/bin/env bash
set -euo pipefail

echo "--- [1/3] Structural Integrity: Type Checking & Linting ---"
cd frontend && npm run validate-file
cd ..
echo "--- [2/3] Backend Integrity: Contract & Logic Validation ---"
cd backend && pytest
cd ..
echo "--- [3/3] Functional Integrity: All Functional & Sentinel Tests ---"
# Run all tests in the frontend/tests directory automatically
cd frontend && npx playwright test

echo "--- VALIDATION COMPLETE ---"
