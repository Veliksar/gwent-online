import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { FACTIONS, FACTION_LEADERS, FACTION_DEFAULT_DECKS } from '../api/lobby'
import { sandboxApi } from '../api/sandbox'
import { useMatchStore } from '../stores/matchStore'
import { isDeveloperModeVisible } from '../utils/devMode'

export default function DeveloperModePage() {
  const navigate = useNavigate()
  const setMatch = useMatchStore((state) => state.setMatch)

  const [playerFaction, setPlayerFaction] = useState('realms')
  const [playerLeader, setPlayerLeader] = useState(FACTION_LEADERS.realms[0].index)
  const [botFaction, setBotFaction] = useState('nilfgaard')
  const [botLeader, setBotLeader] = useState(FACTION_LEADERS.nilfgaard[0].index)
  const [customBotDeck, setCustomBotDeck] = useState(false)

  const { data: status, isLoading } = useQuery({
    queryKey: ['sandbox-status'],
    queryFn: sandboxApi.status,
    enabled: isDeveloperModeVisible(),
  })

  const startMutation = useMutation({
    mutationFn: () => {
      const playerPreset = FACTION_DEFAULT_DECKS[playerFaction]
      const botPreset = FACTION_DEFAULT_DECKS[botFaction]
      return sandboxApi.start({
        faction: playerFaction,
        leader_id: playerLeader,
        cards: playerPreset.cards,
        bot_faction: botFaction,
        bot_leader_id: customBotDeck ? botLeader : botPreset.leader_id,
        bot_cards: botPreset.cards,
        prefer_first: true,
      })
    },
    onSuccess: (data) => {
      setMatch(data.match)
      navigate('/match')
    },
  })

  if (!isDeveloperModeVisible()) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="panel max-w-lg w-full text-center">
          <p className="text-gray-300 mb-4">Режим разработчика доступен только в dev-сборке.</p>
          <Link to="/" className="btn-secondary inline-block px-6 py-3">В главное меню</Link>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gwent-gold">Загрузка...</div>
      </div>
    )
  }

  if (!status?.enabled) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="panel max-w-lg w-full text-center">
          <p className="text-gray-300 mb-2">Sandbox отключён на сервере.</p>
          <p className="text-xs text-gray-500 mb-4">Установите GWENT_DEVELOPER_MODE=true или APP_ENV=local</p>
          <Link to="/" className="btn-secondary inline-block px-6 py-3">В главное меню</Link>
        </div>
      </div>
    )
  }

  const playerLeaders = FACTION_LEADERS[playerFaction] ?? []
  const botLeaders = FACTION_LEADERS[botFaction] ?? []

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="panel max-w-2xl w-full">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gwent-gold">Режим разработчика</h1>
            <p className="text-sm text-gray-400 mt-1">
              Локальный PvP против legacy-ИИ без второго клиента
            </p>
          </div>
          <Link to="/" className="btn-secondary px-4 py-2 text-sm">Назад</Link>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <DeckBlock
            title="Ваша колода"
            factions={FACTIONS}
            selectedFaction={playerFaction}
            leaders={playerLeaders}
            selectedLeader={playerLeader}
            onFactionChange={(id) => {
              setPlayerFaction(id)
              const leaders = FACTION_LEADERS[id]
              if (leaders?.[0]) setPlayerLeader(leaders[0].index)
            }}
            onLeaderChange={setPlayerLeader}
          />

          <DeckBlock
            title="Колода бота"
            factions={FACTIONS}
            selectedFaction={botFaction}
            leaders={botLeaders}
            selectedLeader={botLeader}
            disabled={!customBotDeck}
            onFactionChange={(id) => {
              setBotFaction(id)
              const leaders = FACTION_LEADERS[id]
              if (leaders?.[0]) setBotLeader(leaders[0].index)
            }}
            onLeaderChange={setBotLeader}
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-300 mb-4 cursor-pointer">
          <input
            type="checkbox"
            checked={customBotDeck}
            onChange={(e) => setCustomBotDeck(e.target.checked)}
            className="accent-gwent-gold"
          />
          Настроить фракцию/лидера бота вручную
        </label>

        {status.reveal_bot_hand && (
          <div className="text-xs text-green-400 mb-4 border border-green-900 rounded p-3 bg-green-950/30">
            Отладка: карты бота будут видны на экране (GWENT_SANDBOX_REVEAL_BOT_HAND)
          </div>
        )}

        <button
          onClick={() => startMutation.mutate()}
          disabled={startMutation.isPending}
          className="btn-gold w-full py-4 text-lg"
        >
          {startMutation.isPending ? 'Запуск матча...' : 'Начать sandbox-матч'}
        </button>

        {startMutation.isError && (
          <div className="text-sm text-red-400 mt-3">
            {(startMutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message
              || 'Не удалось запустить sandbox-сессию'}
          </div>
        )}
      </div>
    </div>
  )
}

function DeckBlock({
  title,
  factions,
  selectedFaction,
  leaders,
  selectedLeader,
  disabled,
  onFactionChange,
  onLeaderChange,
}: {
  title: string
  factions: typeof FACTIONS
  selectedFaction: string
  leaders: Array<{ index: number; name: string }>
  selectedLeader: number
  disabled?: boolean
  onFactionChange: (id: string) => void
  onLeaderChange: (index: number) => void
}) {
  return (
    <div className={`border border-gwent-border rounded p-4 bg-gwent-card ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      <h3 className="text-sm font-bold text-gwent-gold mb-3">{title}</h3>
      <div className="grid grid-cols-2 gap-2 mb-3">
        {factions.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => onFactionChange(f.id)}
            className={`text-xs py-2 px-2 rounded border ${
              selectedFaction === f.id
                ? 'border-gwent-gold text-gwent-gold'
                : 'border-gwent-border text-gray-300'
            }`}
          >
            {f.name}
          </button>
        ))}
      </div>
      <div className="space-y-1 max-h-40 overflow-y-auto">
        {leaders.map((l) => (
          <label key={l.index} className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name={`leader-${title}`}
              checked={selectedLeader === l.index}
              onChange={() => onLeaderChange(l.index)}
              className="accent-gwent-gold"
            />
            <span className="text-xs text-gray-300">{l.name}</span>
          </label>
        ))}
      </div>
    </div>
  )
}
