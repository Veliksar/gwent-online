import { create } from 'zustand'
import type { GameMatch } from '../api/match'

interface MatchState {
  match: GameMatch | null
  setMatch: (match: GameMatch | null) => void
  clearMatch: () => void
}

export const useMatchStore = create<MatchState>((set) => ({
  match: null,
  setMatch: (match) => set({ match }),
  clearMatch: () => set({ match: null }),
}))
