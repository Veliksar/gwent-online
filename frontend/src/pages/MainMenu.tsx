import { Link, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../stores/authStore'
import { authApi } from '../api/auth'
import { profileApi } from '../api/profile'
import { isDeveloperModeVisible } from '../utils/devMode'

export default function MainMenu() {
  const navigate = useNavigate()
  const { profile: cachedProfile, updateProfile, logout } = useAuthStore()

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
      <div className="panel max-w-lg w-full text-center">
        <h1 className="text-4xl font-bold text-gwent-gold mb-2">Gwent Classic</h1>
        <p className="text-gray-400 mb-8">
          Добро пожаловать, <span className="text-white">{profile?.nickname}</span>!
        </p>

        <div className="space-y-4">
          <button
            onClick={handlePlayBot}
            className="btn-gold w-full py-4 text-lg"
          >
            Играть с ботом
          </button>

          <Link
            to="/lobby"
            className="btn-gold w-full py-4 text-lg block"
          >
            Играть онлайн
          </Link>

          {isDeveloperModeVisible() && (
            <Link
              to="/developer"
              className="btn-secondary w-full py-4 text-lg block border border-amber-700/60 text-amber-200"
            >
              Режим разработчика
            </Link>
          )}

          <Link
            to="/profile"
            className="btn-secondary w-full py-3 block"
          >
            Профиль и статистика
          </Link>

          <button
            onClick={handleLogout}
            className="btn-secondary w-full py-3"
          >
            Exit
          </button>
        </div>

        <div className="mt-8 pt-6 border-t border-gwent-border">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-green-400">{profile?.wins ?? 0}</div>
              <div className="text-sm text-gray-400">Побед</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-400">{profile?.losses ?? 0}</div>
              <div className="text-sm text-gray-400">Поражений</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-400">{profile?.draws ?? 0}</div>
              <div className="text-sm text-gray-400">Ничьих</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
