import apiClient from './client'

export interface ProfileData {
  user: {
    id: number
    email: string
    created_at: string
  }
  profile: {
    nickname: string
    avatar_url: string | null
    favorite_faction: string | null
    wins: number
    losses: number
    draws: number
    total_games: number
    win_rate: number
  }
}

export interface MatchHistory {
  id: number
  match_id: number
  result: 'win' | 'loss' | 'draw'
  rounds_won: number
  rounds_lost: number
  opponent: {
    nickname: string
    avatar_url: string | null
  }
  duration_seconds: number
  played_at: string
}

export interface ProfileStats {
  total_games: number
  wins: number
  losses: number
  draws: number
  win_rate: number
  current_streak: {
    type: 'win' | 'loss'
    count: number
  }
  favorite_faction: string | null
}

export const profileApi = {
  get: async (): Promise<ProfileData> => {
    const response = await apiClient.get('/profile')
    return response.data
  },

  update: async (data: { nickname?: string; avatar_url?: string; favorite_faction?: string }): Promise<void> => {
    await apiClient.put('/profile', data)
  },

  getMatches: async (): Promise<{ matches: MatchHistory[] }> => {
    const response = await apiClient.get('/profile/matches')
    return response.data
  },

  getStats: async (): Promise<ProfileStats> => {
    const response = await apiClient.get('/profile/stats')
    return response.data
  },
}
