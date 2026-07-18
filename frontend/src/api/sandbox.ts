import apiClient from './client'
import type { GameMatch } from './match'

export interface SandboxStatus {
  enabled: boolean
  reveal_bot_hand: boolean
}

export interface SandboxStartPayload {
  faction: string
  leader_id: number
  cards: Array<[number, number]>
  bot_faction?: string
  bot_leader_id?: number
  bot_cards?: Array<[number, number]>
  prefer_first?: boolean
}

export const sandboxApi = {
  status: async (): Promise<SandboxStatus> => {
    const response = await apiClient.get('/sandbox/status')
    return response.data
  },

  start: async (payload: SandboxStartPayload): Promise<{ message: string; match: GameMatch }> => {
    const response = await apiClient.post('/sandbox/start', payload)
    return response.data
  },

  leave: async (): Promise<void> => {
    await apiClient.post('/sandbox/leave')
  },
}
