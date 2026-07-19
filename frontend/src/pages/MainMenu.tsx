import { Link, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../stores/authStore'
import { authApi } from '../api/auth'
import { profileApi } from '../api/profile'
import { isDeveloperModeVisible } from '../utils/devMode'
import { useT } from '../i18n'
import LanguageSwitcher from '../components/LanguageSwitcher'

export default function MainMenu() {
  const navigate = useNavigate()
  const { profile: cachedProfile, updateProfile, logout } = useAuthStore()
  const t = useT()

  const { data: profileData } = useQuery({
    queryKey: ['profile'],
    queryFn: profileApi.get,
  })

  useEffect(() => {
    const fresh = profileData?.profile
    if (!fresh) return

    updateProfile({
      nickname: fresh.nickname,
      avatar_url: fresh.avatar_url,
      favorite_faction: fresh.favorite_faction,
      wins: fresh.wins,
      losses: fresh.losses,
      draws: fresh.draws,
    })
  }, [profileData, updateProfile])

  const profile = profileData?.profile ?? cachedProfile

  const handleLogout = async () => {
    try {
      await authApi.logout()
    } catch {
    } finally {
      logout()
      navigate('/login')
    }
  }

  const handlePlayBot = () => {
    const apiBase = import.meta.env.VITE_DEV_API_TARGET || window.location.origin
    const botUrl = apiBase.replace(/\/$/, '') + '/index.html'
    window.open(botUrl, '_blank')
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="panel max-w-lg w-full text-center relative">
        <div className="absolute top-4 right-4">
          <LanguageSwitcher />
        </div>

        <h1 className="text-4xl font-bold text-gwent-gold mb-2">Gwent Classic</h1>
        <p className="text-gray-400 mb-8">
          {t.mainMenu.welcomePrefix}
          <span className="text-white">{profile?.nickname}</span>
          {t.mainMenu.welcomeSuffix}
        </p>

        <div className="space-y-4">
          <button
            onClick={handlePlayBot}
            className="btn-gold w-full py-4 text-lg"
          >
            {t.mainMenu.playBot}
          </button>

          <Link
            to="/lobby"
            className="btn-gold w-full py-4 text-lg block"
          >
            {t.mainMenu.playOnline}
          </Link>

          <Link
            to="/deck"
            className="btn-secondary w-full py-3 block"
          >
            {t.mainMenu.decks}
          </Link>

          {isDeveloperModeVisible() && (
            <Link
              to="/developer"
              className="btn-secondary w-full py-4 text-lg block border border-amber-700/60 text-amber-200"
            >
              {t.mainMenu.developerMode}
            </Link>
          )}

          <Link
            to="/profile"
            className="btn-secondary w-full py-3 block"
          >
            {t.mainMenu.profileStats}
          </Link>

          <button
            onClick={handleLogout}
            className="btn-secondary w-full py-3"
          >
            {t.mainMenu.exit}
          </button>
        </div>

        <div className="mt-8 pt-6 border-t border-gwent-border">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-green-400">{profile?.wins ?? 0}</div>
              <div className="text-sm text-gray-400">{t.mainMenu.wins}</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-400">{profile?.losses ?? 0}</div>
              <div className="text-sm text-gray-400">{t.mainMenu.losses}</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-400">{profile?.draws ?? 0}</div>
              <div className="text-sm text-gray-400">{t.mainMenu.draws}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
