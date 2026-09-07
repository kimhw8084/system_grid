export const RETAINED_CHECKS = [
  { check_id: 'retained:root-diff-check', cwd: 'repository root', command: 'git diff --check' },
  { check_id: 'retained:projects-visual-repair', cwd: 'frontend', command: 'node scripts/run-projects-visual-repair.mjs' },
  { check_id: 'retained:projects-out40-slice-h-browser', cwd: 'frontend', command: 'node scripts/run-projects-out40-slice-h-browser.mjs --mode regression' },
]

export function discoverRetainedChecks(gateContract) {
  const expected = gateContract.required_retained_checks || []
  const actual = RETAINED_CHECKS.map(({ cwd, command }) => ({ cwd, command }))
  const expectedKeys = expected.map(({ cwd, command }) => `${cwd}\0${command}`).sort()
  const actualKeys = actual.map(({ cwd, command }) => `${cwd}\0${command}`).sort()
  if (expectedKeys.length !== actualKeys.length || expectedKeys.some((key, index) => key !== actualKeys[index])) {
    throw new Error('Retained Project command registry does not exactly match production-gate-contract.json')
  }
  return RETAINED_CHECKS.map((check) => ({
    ...check,
    registered: true,
    status: 'NOT_EVALUATED',
    execution: 'SKELETON_NOT_RUN',
  }))
}
