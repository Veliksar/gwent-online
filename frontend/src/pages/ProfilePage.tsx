import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { profileApi } from '../api/profile'
import { useAuthStore } from '../stores/authStore'

const factionNames: Record<string, string> = {
  realms: 'Северные королевства',
  nilfgaard: 'Нильфгаард',
  monsters: 'Монстры',
  scoiatael: "Скоя'таэли",
  skellige: 'Скеллиге',
}

export default function ProfilePage() {
  const { profile: authProfile } = useAuthStore()

  const { data: profileData, isLoading: profileLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: profileApi.get,
  })

  const { data: matchesData, isLoading: matchesLoading } = useQuery({
    queryKey: ['matches'],
    queryFn: profileApi.getMatches,
  })

  const profile = profileData?.profile

  if (profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gwent-gold text-xl">Загрузка...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gwent-gold">Профиль</h1>
          <Link to="/" className="btn-secondary">
            Назад
          </Link>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="panel">
            <h2 className="text-xl font-bold text-gwent-gold mb-4">Информация</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Никнейм:</span>
                <span>{authProfile?.nickname}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Любимая фракция:</span>
                <span>{profile?.favorite_faction ? factionNames[profile.favorite_faction] : 'Не выбрана'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Всего игр:</span>
                <span>{profile?.total_games || 0}</span>
              </div>
            </div>
          </div>

          <div className="panel">
            <h2 className="text-xl font-bold text-gwent-gold mb-4">Статистика</h2>
            <div className="grid grid-cols-3 gap-4 text-center mb-4">
              <div>
                <div className="text-3xl font-bold text-green-400">{profile?.wins || 0}</div>
                <div className="text-sm text-gray-400">Побед</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-red-400">{profile?.losses || 0}</div>
                <div className="text-sm text-gray-400">Поражений</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-yellow-400">{profile?.draws || 0}</div>
                <div className="text-sm text-gray-400">Ничьих</div>
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gwent-gold">{profile?.win_rate || 0}%</div>
              <div className="text-sm text-gray-400">Винрейт</div>
            </div>
          </div>
        </div>

        <div className="panel mt-6">
          <h2 className="text-xl font-bold text-gwent-gold mb-4">История матчей</h2>
          {matchesLoading ? (
            <div className="text-center text-gray-400">Загрузка...</div>
          ) : matchesData?.matches.length === 0 ? (
            <div className="text-center text-gray-400">Нет сыгранных матчей</div>
          ) : (
            <div className="space-y-2">
              {matchesData?.matches.slice(0, 10).map((match) => (
                <div
                  key={match.id}
                  className={`flex items-center justify-between p-3 rounded ${
                    match.result === 'win'
                      ? 'bg-green-900/20 border border-green-800'
                      : match.result === 'loss'
                      ? 'bg-red-900/20 border border-red-800'
                      : 'bg-yellow-900/20 border border-yellow-800'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <span
                      className={`font-bold ${
                        match.result === 'win'
                          ? 'text-green-400'
                          : match.result === 'loss'
                          ? 'text-red-400'
                          : 'text-yellow-400'
                      }`}
                    >
                      {match.result === 'win' ? 'Победа' : match.result === 'loss' ? 'Поражение' : 'Ничья'}
                    </span>
                    <span className="text-gray-400">vs {match.opponent.nickname}</span>
                  </div>
                  <div className="text-right">
                    <div>
                      {match.rounds_won}:{match.rounds_lost}
                    </div>
                    <div className="text-sm text-gray-400">
                      {new Date(match.played_at).toLocaleDateString('ru-RU')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
