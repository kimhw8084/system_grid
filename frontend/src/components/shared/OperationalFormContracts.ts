import React from 'react'

export interface OperationalFormProps {
  isDirty: boolean
  resolveIsDirty?: () => boolean
  onDirtyChange?: (isDirty: boolean) => void
  dirtyConfirmTitle?: string
  dirtyConfirmMessage?: string
  dirtyConfirmText?: string
}
