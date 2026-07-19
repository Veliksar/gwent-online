import { useSettingsStore, type Language } from './stores/settingsStore'
import { en, type Locale } from './locales/en'
import { ru } from './locales/ru'
import { ABILITIES_RU, CARD_NAMES_RU } from './locales/cards.ru'

const locales: Record<Language, Locale> = { en, ru }

// Словарь активного языка; компонент перерисуется при смене языка
export function useT(): Locale {
  const language = useSettingsStore((state) => state.language)
  return locales[language]
}

export function useLanguage(): Language {
  return useSettingsStore((state) => state.language)
}

// Тексты карт приходят из API на английском; переводим по имени карты.
// trim() — в данных встречаются имена с хвостовым пробелом ('Arachas ')
export function translateCardName(name: string, language: Language): string {
  if (language !== 'ru') return name
  return CARD_NAMES_RU[name.trim()] ?? name
}

export function translateAbilityName(key: string, fallback: string, language: Language): string {
  if (language !== 'ru') return fallback
  return ABILITIES_RU[key]?.name ?? fallback
}

export function translateAbilityDescription(key: string, fallback: string, language: Language): string {
  if (language !== 'ru') return fallback
  return ABILITIES_RU[key]?.description ?? fallback
}
