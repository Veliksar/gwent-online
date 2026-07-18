import { create } from 'zustand'

interface LobbyMember {
  user_id: number
  nickname: string
  avatar_url: string | null
  ready: boolean
  has_deck: boolean
}

interface LobbyRoom {
  id: number
  status: 'waiting' | 'ready' | 'started' | 'cancelled'
  is_private: boolean
  host_user_id: number | null
  max_players: number
  members: LobbyMember[]
  created_at: string
}

interface LobbyState {
  room: LobbyRoom | null
  roomCode: string | null
  setRoom: (room: LobbyRoom | null, roomCode?: string | null) => void
  updateMember: (userId: number, data: Partial<LobbyMember>) => void
  addMember: (member: LobbyMember) => void
  removeMember: (userId: number) => void
  clearLobby: () => void
}

export const useLobbyStore = create<LobbyState>((set) => ({
  room: null,
  roomCode: null,
  setRoom: (room, roomCode = null) => set({ room, roomCode }),
  updateMember: (userId, data) => set((state) => ({
    room: state.room ? {
      ...state.room,
      members: state.room.members.map((m) =>
        m.user_id === userId ? { ...m, ...data } : m
      ),
    } : null,
  })),
  addMember: (member) => set((state) => {
    if (!state.room) return state
    if (state.room.members.some((m) => m.user_id === member.user_id)) return state
    return {
      room: {
        ...state.room,
        members: [...state.room.members, member],
      },
    }
  }),
  removeMember: (userId) => set((state) => ({
    room: state.room ? {
      ...state.room,
      members: state.room.members.filter((m) => m.user_id !== userId),
    } : null,
  })),
  clearLobby: () => set({ room: null, roomCode: null }),
}))
