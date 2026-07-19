import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Language = 'en' | 'ru'

// Первый запуск: берём язык браузера, дальше значение живёт в localStorage
function detectLanguage(): Language {
  if (typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('ru')) {
    return 'ru'
  }
  return 'en'
}

interface SettingsState {
  language: Language
  setLanguage: (language: Language) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      language: detectLanguage(),
      setLanguage: (language) => set({ language }),
    }),
    { name: 'gwent-settings' }
  )
)
