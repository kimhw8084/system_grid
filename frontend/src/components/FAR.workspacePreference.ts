import { useEffect, useMemo, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'

import { apiFetch } from '../api/apiClient'
import {
  FAR_WORKSPACE_PREFERENCE_ENDPOINT,
  FAR_WORKSPACE_PREFERENCE_KEY,
  buildFarWorkspacePreference,
  buildFarWorkspacePreferencePatch,
  normalizeFarWorkspacePreference,
  type FarWorkspaceViewConfig,
} from './FAR.workspaceState'

const FAR_WORKSPACE_PREFERENCE_DEBOUNCE_MS = 400

export function useFarWorkspacePreference(
  currentDefinition: FarWorkspaceViewConfig,
  workingStateReady: boolean,
) {
  const preferenceSyncRef = useRef<string | null>(null)
  const preferenceSyncTimeoutRef = useRef<number | null>(null)
  const { data: userSettings, isSuccess: hasUserSettings, isError: userSettingsFailed } = useQuery({
    queryKey: ['user-settings'],
    queryFn: async () => {
      const response = await apiFetch(FAR_WORKSPACE_PREFERENCE_ENDPOINT)
      if (!response.ok) throw new Error(await response.text())
      return response.json()
    },
  })
  const remotePreference = useMemo(
    () => normalizeFarWorkspacePreference(userSettings?.[FAR_WORKSPACE_PREFERENCE_KEY]),
    [userSettings],
  )
  const remoteWorkingDefinition = remotePreference?.workingDefinition ?? null

  useEffect(() => {
    if (!remotePreference) return
    preferenceSyncRef.current = JSON.stringify(remotePreference)
  }, [remotePreference])

  useEffect(() => {
    if (!workingStateReady || !hasUserSettings || typeof window === 'undefined') return
    const payload = buildFarWorkspacePreference(currentDefinition)
    const serialized = JSON.stringify(payload)
    if (preferenceSyncRef.current === serialized) return

    if (preferenceSyncTimeoutRef.current !== null) {
      window.clearTimeout(preferenceSyncTimeoutRef.current)
    }
    preferenceSyncTimeoutRef.current = window.setTimeout(() => {
      preferenceSyncTimeoutRef.current = null
      apiFetch(FAR_WORKSPACE_PREFERENCE_ENDPOINT, {
        method: 'PATCH',
        body: JSON.stringify(buildFarWorkspacePreferencePatch(currentDefinition)),
      })
        .then(async (response) => {
          if (!response.ok) throw new Error(await response.text())
          preferenceSyncRef.current = serialized
        })
        .catch(() => {})
    }, FAR_WORKSPACE_PREFERENCE_DEBOUNCE_MS)

    return () => {
      if (preferenceSyncTimeoutRef.current !== null) {
        window.clearTimeout(preferenceSyncTimeoutRef.current)
        preferenceSyncTimeoutRef.current = null
      }
    }
  }, [currentDefinition, hasUserSettings, workingStateReady])

  useEffect(() => () => {
    if (typeof window !== 'undefined' && preferenceSyncTimeoutRef.current !== null) {
      window.clearTimeout(preferenceSyncTimeoutRef.current)
      preferenceSyncTimeoutRef.current = null
    }
  }, [])

  return {
    remoteWorkingDefinition,
    userSettingsReady: hasUserSettings || userSettingsFailed,
  }
}
