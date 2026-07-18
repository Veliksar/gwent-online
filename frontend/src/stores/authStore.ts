import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface Profile {
  nickname: string
  avatar_url: string | null
  favorite_faction: string | null
  wins: number
  losses: number
  draws: number
}

interface User {
  id: number
  email: string
}

interface AuthState {
  user: User | null
  profile: Profile | null
  token: string | null
  isAuthenticated: boolean
  setAuth: (user: User, profile: Profile, token: string) => void
  logout: () => void
  updateProfile: (profile: Partial<Profile>) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      profile: null,
      token: null,
      isAuthenticated: false,
      setAuth: (user, profile, token) => set({ 
        user, 
        profile, 
        token, 
        isAuthenticated: true 
      }),
      logout: () => set({ 
        user: null, 
        profile: null, 
        token: null, 
        isAuthenticated: false 
      }),
      updateProfile: (profileData) => set((state) => ({
        profile: state.profile ? { ...state.profile, ...profileData } : null
      })),
    }),
    {
      name: 'gwent-auth',
    }
  )
)
