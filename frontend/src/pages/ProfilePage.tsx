import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { profileApi } from '../api/profile'
import { useAuthStore } from '../stores/authStore'
import { useT } from '../i18n'

export default function ProfilePage() {
  const { profile: authProfile } = useAuthStore()
  const t = useT()

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
        <div className="text-gwent-gold text-xl">{t.common.loading}</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gwent-gold">{t.profile.title}</h1>
          <Link to="/" className="btn-secondary">
            {t.common.back}
          </Link>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="panel">
            <h2 className="text-xl font-bold text-gwent-gold mb-4">{t.profile.infoTitle}</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">{t.profile.nickname}</span>
                <span>{authProfile?.nickname}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">{t.profile.favoriteFaction}</span>
                <span>{profile?.favorite_faction ? t.factions[profile.favorite_faction] ?? profile.favorite_faction : t.profile.notChosen}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">{t.profile.totalGames}</span>
                <span>{profile?.total_games || 0}</span>
              </div>
            </div>
          </div>

          <div className="panel">
            <h2 className="text-xl font-bold text-gwent-gold mb-4">{t.profile.statsTitle}</h2>
            <div className="grid grid-cols-3 gap-4 text-center mb-4">
              <div>
                <div className="text-3xl font-bold text-green-400">{profile?.wins || 0}</div>
                <div className="text-sm text-gray-400">{t.profile.wins}</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-red-400">{profile?.losses || 0}</div>
                <div className="text-sm text-gray-400">{t.profile.losses}</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-yellow-400">{profile?.draws || 0}</div>
                <div className="text-sm text-gray-400">{t.profile.draws}</div>
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gwent-gold">{profile?.win_rate || 0}%</div>
              <div className="text-sm text-gray-400">{t.profile.winRate}</div>
            </div>
          </div>
        </div>

        <div className="panel mt-6">
          <h2 className="text-xl font-bold text-gwent-gold mb-4">{t.profile.matchHistory}</h2>
          {matchesLoading ? (
            <div className="text-center text-gray-400">{t.common.loading}</div>
          ) : matchesData?.matches.length === 0 ? (
            <div className="text-center text-gray-400">{t.profile.noMatches}</div>
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
                      {match.result === 'win' ? t.profile.win : match.result === 'loss' ? t.profile.loss : t.profile.draw}
                    </span>
                    <span className="text-gray-400">vs {match.opponent.nickname}</span>
                  </div>
                  <div className="text-right">
                    <div>
                      {match.rounds_won}:{match.rounds_lost}
                    </div>
                    <div className="text-sm text-gray-400">
                      {new Date(match.played_at).toLocaleDateString(t.profile.dateLocale)}
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
