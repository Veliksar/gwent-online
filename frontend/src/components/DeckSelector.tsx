import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { lobbyApi, FACTIONS, FACTION_LEADERS, FACTION_DEFAULT_DECKS, type LobbyRoom } from '../api/lobby'

interface Props {
  onSaved?: (room?: LobbyRoom) => void
}

export default function DeckSelector({ onSaved }: Props) {
  const [selectedFaction, setSelectedFaction] = useState<string>('realms')
  const [selectedLeader, setSelectedLeader] = useState<number>(FACTION_LEADERS['realms'][0].index)
  const [saved, setSaved] = useState(false)

  const saveMutation = useMutation({
    mutationFn: () => {
      const preset = FACTION_DEFAULT_DECKS[selectedFaction]
      return lobbyApi.setDeck({
        faction:   selectedFaction,
        leader_id: selectedLeader,
        cards:     preset.cards,
      })
    },
    onSuccess: (data) => {
      setSaved(true)
      onSaved?.(data.room)
    },
  })

  const handleFactionChange = (factionId: string) => {
    setSelectedFaction(factionId)
    const leaders = FACTION_LEADERS[factionId]
    if (leaders && leaders.length > 0) {
      setSelectedLeader(leaders[0].index)
    }
    setSaved(false)
  }

  const leaders = FACTION_LEADERS[selectedFaction] ?? []

  return (
    <div className="border border-gwent-border rounded p-4 bg-gwent-card">
      <h3 className="text-sm font-bold text-gwent-gold mb-3">Выбор колоды</h3>

      <div className="mb-3">
        <div className="text-xs text-gray-400 mb-2">Фракция</div>
        <div className="grid grid-cols-2 gap-2">
          {FACTIONS.map((f) => (
            <button
              key={f.id}
              onClick={() => handleFactionChange(f.id)}
              className={`text-xs py-2 px-3 rounded border transition-all text-left ${
                selectedFaction === f.id
                  ? 'border-gwent-gold bg-gwent-dark text-gwent-gold'
                  : 'border-gwent-border bg-gwent-dark text-gray-300 hover:border-gray-500'
              }`}
            >
              {f.name}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <div className="text-xs text-gray-400 mb-2">Лидер</div>
        <div className="space-y-1">
          {leaders.map((l) => (
            <label key={l.index} className="flex items-center gap-2 cursor-pointer group">
              <input
                type="radio"
                name="leader"
                value={l.index}
                checked={selectedLeader === l.index}
                onChange={() => { setSelectedLeader(l.index); setSaved(false) }}
                className="accent-gwent-gold"
              />
              <span className={`text-xs ${selectedLeader === l.index ? 'text-gwent-gold' : 'text-gray-300 group-hover:text-white'}`}>
                {l.name}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="text-xs text-gray-500 mb-3">
        Используется стандартная колода для выбранной фракции
      </div>

      <button
        onClick={() => saveMutation.mutate()}
        disabled={saveMutation.isPending}
        className={`w-full py-2 text-sm rounded font-bold transition-all ${
          saved
            ? 'bg-green-800 text-green-300 border border-green-600'
            : 'btn-gold'
        }`}
      >
        {saveMutation.isPending ? 'Сохранение...' : saved ? 'Колода сохранена' : 'Выбрать колоду'}
      </button>

      {saveMutation.isError && (
        <div className="text-xs text-red-400 mt-2">Ошибка сохранения колоды</div>
      )}
    </div>
  )
}
