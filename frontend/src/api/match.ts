import apiClient from './client'

export interface BoardState {
  close: number[]
  ranged: number[]
  siege: number[]
}

export interface RowScores {
  close: number
  ranged: number
  siege: number
}

export interface BoardDisplayCard {
  index: number
  power: number
}

export interface BoardDisplay {
  close: BoardDisplayCard[]
  ranged: BoardDisplayCard[]
  siege: BoardDisplayCard[]
}

export interface WeatherState {
  close: boolean
  ranged: boolean
  siege: boolean
}

export interface GraveChoice {
  pos: number
  index: number
  card: {
    name: string
    id: string
    deck: string
    row: string
    strength: number
    abilities: string[]
    filename: string
    count: number
  }
}

export interface FactionPassivesPending {
  scoiatael_first: boolean
  emhyr_reveal: boolean
}

export interface RoundHistoryEntry {
  round: number
  winner_id: number | null
  scores: Record<string, number>
}

export interface MatchPlayer {
  user_id: number | null
  nickname: string
  deck_faction: string
  leader_index: number | null
  leader_used: boolean
  leader_disabled: boolean
  leader_activatable: boolean
  health: number
  passed: boolean
  round_score: number
  row_scores: RowScores
  hand: (number | null)[]
  hand_count: number
  board: BoardState
  board_display: BoardDisplay
  grave: number[]
  deck_count: number
  redraw_remaining: number
}

export interface SandboxMeta {
  reveal_opponent_hand: boolean
  bot_user_id: number
}

export interface WeatherCardEntry {
  index: number
  owner: number
}

export interface GameMatch {
  id: number
  mode: 'bot' | 'pvp' | 'sandbox'
  status: 'lobby' | 'in_progress' | 'finished' | 'cancelled'
  current_round: number
  current_player_id: number | null
  players: MatchPlayer[]
  weather: WeatherState
  weather_cards: WeatherCardEntry[]
  round_ending_seconds: number | null
  horns: Record<string, boolean>
  leader_horns: Record<string, boolean>
  mardroeme_rows: Record<string, boolean>
  round_history: RoundHistoryEntry[]
  leader_result: unknown | null
  scoiatael_first_choice_user_id: number | null
  pending_medic: boolean
  grave_choices: GraveChoice[]
  pending_decoy: boolean
  faction_passives_pending: FactionPassivesPending
  started_at: string
  turn_started_at: string | null
  turn_timeout_seconds: number
  turn_seconds_remaining: number | null
  sandbox?: SandboxMeta | null
}

export interface PlayCardData {
  card_index: number
  row: 'close' | 'ranged' | 'siege'
  target_index?: number
}

export interface LeaderResult {
  type?: string
  cards?: number[]
}

export interface EndMatchData {
  match_id: number
  winner_user_id: number | null
  is_draw: boolean
  winner_rounds: number
  loser_rounds: number
  duration_seconds: number
}

export interface ReconnectData {
  lobby: {
    room: {
      id: number
      status: string
      members: Array<{ user_id: number; nickname: string; ready: boolean }>
    }
    room_code: string | null
  } | null
  match: GameMatch | null
}

export const matchApi = {
  start: async (): Promise<{ match: GameMatch }> => {
    const response = await apiClient.post('/match/start')
    return response.data
  },

  playCard: async (data: PlayCardData): Promise<{ message: string; match: GameMatch; pending_medic?: boolean; grave_choices?: GraveChoice[] }> => {
    const response = await apiClient.post('/match/play-card', data)
    return response.data
  },

  medicResolve: async (gravePos: number): Promise<{ message: string; match?: GameMatch; round_ended?: boolean; round_winner_id?: number | null; game_ended?: boolean; winner_id?: number | null; is_draw?: boolean }> => {
    const response = await apiClient.post('/match/medic-resolve', { grave_pos: gravePos })
    return response.data
  },

  useLeader: async (choices?: Record<string, unknown>): Promise<{ message: string; match: GameMatch; leader_result?: LeaderResult | null }> => {
    const response = await apiClient.post('/match/use-leader', { choices: choices ?? {} })
    return response.data
  },

  chooseFirst: async (preferFirst: boolean): Promise<{ message: string; match: GameMatch }> => {
    const response = await apiClient.post('/match/choose-first', { prefer_first: preferFirst })
    return response.data
  },

  pass: async (): Promise<{ message: string; match?: GameMatch; round_ended?: boolean; game_ended?: boolean; winner_id?: number | null; is_draw?: boolean }> => {
    const response = await apiClient.post('/match/pass')
    return response.data
  },

  getState: async (knownMatchId?: number): Promise<{ match: GameMatch | null; game_ended?: boolean; winner_id?: number | null; is_draw?: boolean; cancelled?: boolean }> => {
    const response = await apiClient.get('/match/state', {
      params: knownMatchId ? { match_id: knownMatchId } : undefined,
    })
    return response.data
  },

  syncTurn: async (knownMatchId?: number): Promise<{ match: GameMatch | null; game_ended?: boolean; winner_id?: number | null; is_draw?: boolean; cancelled?: boolean }> => {
    const response = await apiClient.post('/match/sync-turn', knownMatchId ? { match_id: knownMatchId } : {})
    return response.data
  },

  redraw: async (handPos: number): Promise<{ match: GameMatch }> => {
    const response = await apiClient.post('/match/redraw', { hand_pos: handPos })
    return response.data
  },

  redrawSkip: async (): Promise<{ match: GameMatch }> => {
    const response = await apiClient.post('/match/redraw-skip')
    return response.data
  },

  end: async (data: EndMatchData): Promise<void> => {
    await apiClient.post('/match/end', data)
  },

  reconnect: async (): Promise<ReconnectData> => {
    const response = await apiClient.get('/reconnect')
    return response.data
  },
}
