import { useSettingsStore, type Language } from '../stores/settingsStore'

const LANGUAGES: Language[] = ['en', 'ru']

export default function LanguageSwitcher({ compact }: { compact?: boolean }) {
  const { language, setLanguage } = useSettingsStore()

  return (
    <div
      className={`inline-flex rounded border border-gwent-border overflow-hidden ${compact ? '' : 'shadow'}`}
      role="group"
      aria-label="Language"
    >
      {LANGUAGES.map((lang) => (
        <button
          key={lang}
          type="button"
          onClick={() => setLanguage(lang)}
          className={`font-bold uppercase transition-colors ${compact ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs'} ${
            language === lang
              ? 'bg-gwent-gold text-black'
              : 'bg-gwent-dark text-gray-400 hover:text-white'
          }`}
        >
          {lang}
        </button>
      ))}
    </div>
  )
}
