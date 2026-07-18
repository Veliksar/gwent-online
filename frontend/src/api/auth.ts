import apiClient from './client'

export interface RegisterData {
  email: string
  password: string
  password_confirmation: string
  nickname: string
}

export interface LoginData {
  email: string
  password: string
}

export interface AuthResponse {
  user: {
    id: number
    email: string
  }
  profile: {
    nickname: string
    avatar_url: string | null
    favorite_faction: string | null
    wins: number
    losses: number
    draws: number
  }
  token: string
}

export const authApi = {
  register: async (data: RegisterData): Promise<AuthResponse> => {
    const response = await apiClient.post('/register', data)
    return response.data
  },

  login: async (data: LoginData): Promise<AuthResponse> => {
    const response = await apiClient.post('/login', data)
    return response.data
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/logout')
  },
}
