import apiClient from './client'

export interface UserDeck {
  faction: string
  leader_id: number
  cards: Array<[number, number]>
  is_active: boolean
  updated_at: string
}

export interface SaveDeckData {
  faction: string
  leader_id: number
  cards: Array<[number, number]>
}

export const decksApi = {
  getAll: async (): Promise<{ decks: UserDeck[] }> => {
    const response = await apiClient.get('/decks')
    return response.data
  },

  save: async (deck: SaveDeckData): Promise<{ message: string; deck: UserDeck }> => {
    const response = await apiClient.post('/decks', deck)
    return response.data
  },
}
