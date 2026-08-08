import { get, set } from 'idb-keyval'
import type { LocalState } from './types'

const STATE_KEY = 'on-thi-xe-may-state-v1'

export const INITIAL_STATE: LocalState = {
  version: 1,
  progress: {},
  attempts: [],
  lastUpdatedAt: new Date(0).toISOString(),
}

export async function loadLocalState(): Promise<LocalState> {
  try {
    return (await get<LocalState>(STATE_KEY)) ?? INITIAL_STATE
  } catch {
    return INITIAL_STATE
  }
}

export async function saveLocalState(state: LocalState): Promise<void> {
  await set(STATE_KEY, state)
}
