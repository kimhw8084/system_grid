import React from 'react'

/**
 * Transitional compatibility adapter.
 *
 * The former implementation owned a second FAR fetch/state/grid runtime and
 * caused the shared shell to discard the feature-complete FAR.tsx children.
 * It now only forwards children and exposes a guard marker for regression
 * tests. New code must render FAR.tsx through OperationalWorkspaceShell.
 */
export function FARGoldenWorkspace({ children }: { children?: React.ReactNode }) {
  return (
    <React.Fragment>
      <span hidden data-far-compatibility-adapter="true" />
      {children ?? null}
    </React.Fragment>
  )
}

export default FARGoldenWorkspace
