import { useEffect, useRef, useState } from 'react'
import type { CardDefinition } from '../../api/cards'
import type { MatchPlayer } from '../../api/match'
import { iconUrl } from '../../utils/cardAssets'
import { GwentCard } from './GwentCard'
import { GwentCardBack } from './GwentCardBack'

function HandCard({
  index,
  card,
  selected,
  onClick,
}: {
  index: number | null
  card?: CardDefinition
  selected: boolean
  onClick: () => void
}) {
  if (index === null) {
    return <GwentCardBack />
  }

  if (card) {
    return (
      <GwentCard
        card={card}
        selected={selected}
        onClick={onClick}
      />
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`match-hand-card ${selected ? 'match-hand-card-selected' : ''}`}
    >
      {index}
    </button>
  )
}

export function OpponentHand({
  count,
  faction,
  revealedCards,
  cardsByIndex,
}: {
  count: number
  faction?: string
  revealedCards?: (number | null)[]
  cardsByIndex?: Map<number, CardDefinition>
}) {
  if (revealedCards && cardsByIndex) {
    return (
      <div className="match-opponent-hand match-opponent-hand-revealed" aria-label="Рука бота (debug)">
        {revealedCards.map((cardIndex, index) => {
          const card = cardIndex !== null ? cardsByIndex.get(cardIndex) : undefined
          if (card) {
            return <GwentCard key={`${cardIndex}-${index}`} card={card} />
          }
          return <GwentCardBack key={index} faction={faction} />
        })}
      </div>
    )
  }

  return (
    <div className="match-opponent-hand" aria-label={`Карт у соперника: ${count}`}>
      {Array.from({ length: count }).map((_, index) => (
        <GwentCardBack key={index} faction={faction} />
      ))}
    </div>
  )
}

export function MatchHandActions({
  isMyTurn,
  passPending,
  onPass,
}: {
  isMyTurn: boolean
  passPending: boolean
  onPass: () => void
}) {
  if (!isMyTurn) return null

  return (
    <div className="match-hand-actions">
      <button
        type="button"
        id="pass-button"
        onClick={onPass}
        disabled={passPending}
        className="match-pass-button"
        aria-label="Pass"
      >
        {passPending ? (
          <span className="match-pass-button-pending">...</span>
        ) : (
          <img
            className="match-pass-button-icon"
            src={iconUrl('notif_round_passed')}
            alt=""
            draggable={false}
          />
        )}
      </button>
    </div>
  )
}

export function MatchHand({
  player,
  cardsByIndex,
  selectedHandPos,
  onCardClick,
}: {
  player: MatchPlayer
  cardsByIndex: Map<number, CardDefinition>
  selectedHandPos: number | null
  onCardClick: (handPos: number, cardIndex: number) => void
}) {
  const prevHandRef = useRef<(number | null)[] | null>(null)
  const [enteringPositions, setEnteringPositions] = useState<Set<number>>(new Set())

  useEffect(() => {
    if (prevHandRef.current === null) {
      prevHandRef.current = [...player.hand]
      return
    }

    const prevHand = prevHandRef.current
    const entering = new Set<number>()

    player.hand.forEach((cardIdx, pos) => {
      if (cardIdx !== null && cardIdx !== prevHand[pos]) {
        entering.add(pos)
      }
    })

    prevHandRef.current = [...player.hand]

    if (entering.size === 0) return

    setEnteringPositions(entering)
    const timer = setTimeout(() => setEnteringPositions(new Set()), 500)
    return () => clearTimeout(timer)
  }, [player.hand])

  return (
    <section className="match-hand-panel">
      <div className="match-hand-row">
        {player.hand.map((cardIndex, index) => (
          <div key={index} className={enteringPositions.has(index) ? 'gwent-card-entering' : ''}>
            <HandCard
              index={cardIndex}
              card={cardIndex !== null ? cardsByIndex.get(cardIndex) : undefined}
              selected={selectedHandPos === index}
              onClick={() => cardIndex !== null && onCardClick(index, cardIndex)}
            />
          </div>
        ))}
      </div>
    </section>
  )
}
