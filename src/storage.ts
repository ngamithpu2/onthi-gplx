import { get, set } from 'idb-keyval'
import type { LocalState } from './types'

const BASE_STATE_KEY = 'on-thi-xe-may-state'

export const INITIAL_STATE: LocalState = {
  version: 1,
  progress: {},
  attempts: [],
  sessionProgress: {},
  lastUpdatedAt: new Date(0).toISOString(),
}

export async function loadLocalState(moduleId = 'gplx-a1'): Promise<LocalState> {
  try {
    const key = `${BASE_STATE_KEY}-${moduleId}-v1`
    return (await get<LocalState>(key)) ?? INITIAL_STATE
  } catch {
    return INITIAL_STATE
  }
}

export async function saveLocalState(state: LocalState, moduleId = 'gplx-a1'): Promise<void> {
  const key = `${BASE_STATE_KEY}-${moduleId}-v1`
  await set(key, state)
}
