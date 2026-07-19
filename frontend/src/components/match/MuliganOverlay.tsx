import type { CardDefinition } from '../../api/cards'
import type { MatchPlayer } from '../../api/match'
import { GwentCard } from './GwentCard'
import { useT } from '../../i18n'

export function MuliganOverlay({
  player,
  cardsByIndex,
  remaining,
  pending,
  onSwap,
  onSkip,
}: {
  player: MatchPlayer
  cardsByIndex: Map<number, CardDefinition>
  remaining: number
  pending: boolean
  onSwap: (handPos: number) => void
  onSkip: () => void
}) {
  const t = useT()

  return (
    <div className="match-muligan-overlay">
      <div className="match-muligan-title">{t.match.muliganTitle}</div>
      <div className="match-muligan-hint">
        {t.match.muliganHint}
      </div>
      <div className="match-muligan-remaining">
        {t.match.muliganRemaining} <strong>{remaining}</strong>
      </div>

      <div className="match-muligan-hand">
        {player.hand.map((cardIndex, pos) => {
          if (cardIndex === null) return null
          const card = cardsByIndex.get(cardIndex)
          if (!card) return null
          return (
            <GwentCard
              key={`muligan_${pos}_${cardIndex}`}
              card={card}
              onClick={pending ? undefined : () => onSwap(pos)}
            />
          )
        })}
      </div>

      <div className="match-muligan-actions">
        <button
          type="button"
          className="match-muligan-skip"
          onClick={onSkip}
          disabled={pending}
        >
          {pending ? '...' : t.match.muliganSkip}
        </button>
      </div>
    </div>
  )
}
