import apiClient from './client'

export interface LobbyMember {
  user_id: number
  nickname: string
  avatar_url: string | null
  ready: boolean
  has_deck: boolean
  deck_faction: string | null
  deck_leader_id: number | null
}

export interface LobbyRoom {
  id: number
  status: 'waiting' | 'ready' | 'started' | 'cancelled'
  is_private: boolean
  host_user_id: number | null
  max_players: number
  members: LobbyMember[]
  created_at: string
}

export interface DeckData {
  faction: string
  leader_id: number
  cards: Array<[number, number]>
}

export const FACTIONS = [
  { id: 'realms',    name: 'Северные королевства', color: '#4a90d9' },
  { id: 'nilfgaard', name: 'Нильфгаард',           color: '#c9a227' },
  { id: 'monsters',  name: 'Чудовища',             color: '#8b3a3a' },
  { id: 'scoiatael', name: "Скоя'таэли",           color: '#2d6b3a' },
  { id: 'skellige',  name: 'Скеллиге',             color: '#3a6b8b' },
]

export const FACTION_LEADERS: Record<string, Array<{ index: number; name: string }>> = {
  realms: [
    { index: 22, name: 'Фольтест - Король Темерии' },
    { index: 23, name: 'Фольтест - Повелитель Севера' },
    { index: 24, name: 'Фольтест - Повелитель осады' },
    { index: 25, name: 'Фольтест - Стальная кузница' },
    { index: 26, name: 'Фольтест - Сын Медела' },
  ],
  nilfgaard: [
    { index: 56, name: 'Эмгыр - Его Величество' },
    { index: 57, name: 'Эмгыр - Император Нильфгаарда' },
    { index: 58, name: 'Эмгыр - Белое Пламя' },
    { index: 59, name: 'Эмгыр - Неумолимый' },
    { index: 60, name: 'Эмгыр - Завоеватель Севера' },
  ],
  monsters: [
    { index: 93, name: 'Эредин - Командир' },
    { index: 94, name: 'Эредин - Предвестник смерти' },
    { index: 95, name: 'Эредин - Разрушитель миров' },
    { index: 96, name: 'Эредин - Король Дикой Охоты' },
    { index: 97, name: 'Эредин - Предатель' },
  ],
  scoiatael: [
    { index: 139, name: 'Франческа - Королева' },
    { index: 140, name: 'Франческа - Прекрасная' },
    { index: 141, name: 'Франческа - Маргаритка' },
    { index: 142, name: 'Франческа - Чистокровная эльфийка' },
    { index: 143, name: 'Франческа - Надежда Аэн Шейде' },
  ],
  skellige: [
    { index: 211, name: 'Крах ан Крайт' },
    { index: 212, name: 'Король Бран' },
  ],
}

export const FACTION_DEFAULT_DECKS: Record<string, { leader_id: number; cards: Array<[number, number]> }> = {
  realms: {
    leader_id: 24,
    cards: [[5,1],[1,3],[2,1],[3,1],[8,1],[33,1],[34,1],[39,1],[51,1],[29,2],[12,1],[14,1],[15,1],[27,1],[17,1],[45,1],[54,1],[55,1],[30,3],[32,1],[41,1],[28,3],[19,3],[47,1],[6,1],[18,1],[49,1],[0,1]],
  },
  nilfgaard: {
    leader_id: 59,
    cards: [[5,1],[1,3],[10,1],[2,1],[4,1],[9,1],[11,1],[3,1],[8,1],[63,1],[64,1],[70,1],[73,1],[75,1],[84,1],[81,1],[14,1],[15,1],[17,1],[90,1],[91,1],[19,3],[88,1],[71,4],[6,1],[18,1],[67,1],[68,1],[0,1],[83,1]],
  },
  monsters: {
    leader_id: 93,
    cards: [[5,1],[1,3],[10,1],[4,1],[9,1],[11,1],[3,1],[8,1],[124,1],[125,1],[138,1],[14,1],[15,1],[101,1],[105,1],[106,1],[107,1],[17,1],[135,1],[98,1],[99,1],[100,1],[102,1],[19,3],[131,1],[132,1],[133,1],[134,1],[6,1],[18,1],[127,1],[128,1],[129,1],[0,1]],
  },
  scoiatael: {
    leader_id: 141,
    cards: [[5,1],[1,3],[10,1],[2,1],[4,1],[9,1],[11,1],[3,1],[8,1],[167,1],[173,1],[213,1],[14,1],[15,1],[148,1],[17,1],[162,1],[163,1],[164,1],[19,3],[144,1],[151,1],[152,1],[153,1],[6,1],[18,1],[159,1],[160,1],[0,1]],
  },
  skellige: {
    leader_id: 211,
    cards: [[5,1],[202,1],[10,1],[2,1],[204,1],[11,1],[3,1],[8,1],[203,1],[184,1],[195,1],[14,1],[15,1],[192,3],[186,1],[17,1],[187,1],[188,1],[189,1],[200,3],[182,1],[6,1],[210,3],[199,1],[0,1]],
  },
}

export const lobbyApi = {
  join: async (): Promise<{ room: LobbyRoom }> => {
    const response = await apiClient.post('/lobby/join')
    return response.data
  },

  joinByCode: async (roomCode: string): Promise<{ room: LobbyRoom }> => {
    const response = await apiClient.post('/lobby/join-by-code', { room_code: roomCode })
    return response.data
  },

  create: async (): Promise<{ room: LobbyRoom; room_code: string }> => {
    const response = await apiClient.post('/lobby/create')
    return response.data
  },

  leave: async (): Promise<void> => {
    await apiClient.post('/lobby/leave')
  },

  setReady: async (ready: boolean): Promise<{ room: LobbyRoom }> => {
    const response = await apiClient.post('/lobby/ready', { ready })
    return response.data
  },

  setDeck: async (deck: DeckData): Promise<{ room: LobbyRoom }> => {
    const response = await apiClient.post('/lobby/set-deck', deck)
    return response.data
  },

  getCurrent: async (): Promise<{ room: LobbyRoom | null; room_code: string | null }> => {
    const response = await apiClient.get('/lobby/current')
    return response.data
  },
}
