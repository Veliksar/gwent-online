import type { CardDefinition } from '../../api/cards'
import type { MatchPlayer } from '../../api/match'
import { cardBackImageUrl } from '../../utils/cardAssets'
import { GravePile } from './GravePile'

function DeckPile({
  count,
  faction,
  stackStepPx,
}: {
  count: number
  faction: string
  stackStepPx: number
}) {
  const backUrl = cardBackImageUrl(faction)

  return (
    <div className="match-card-pile match-card-pile-stacked">
      <div className="match-deck-pile-stack">
        {Array.from({ length: count }, (_, index) => (
          <div
            key={index}
            className="match-deck-pile-card"
            style={{
              transform: `translateY(-${index * stackStepPx}px)`,
              zIndex: index,
              backgroundImage: `url('${backUrl}')`,
            }}
          />
        ))}
      </div>
      <div className="match-card-pile-count">{count}</div>
    </div>
  )
}

export function MatchSidePanel({
  opponent,
  me,
  cardsByIndex,
  graveViewDisabled,
  onViewGrave,
}: {
  opponent: MatchPlayer
  me: MatchPlayer
  cardsByIndex: Map<number, CardDefinition>
  graveViewDisabled?: boolean
  onViewGrave: (owner: 'me' | 'op') => void
}) {
  return (
    <aside className="match-panel-right">
      <div className="match-grave-op" data-flyzone="grave_op">
        <GravePile
          grave={opponent.grave}
          cardsByIndex={cardsByIndex}
          disabled={graveViewDisabled}
          onClick={() => onViewGrave('op')}
        />
      </div>
      <div className="match-deck-op" data-flyzone="deck_op">
        <DeckPile count={opponent.deck_count} faction={opponent.deck_faction} stackStepPx={1} />
      </div>
      <div className="match-grave-me" data-flyzone="grave_me">
        <GravePile
          grave={me.grave}
          cardsByIndex={cardsByIndex}
          disabled={graveViewDisabled}
          onClick={() => onViewGrave('me')}
        />
      </div>
      <div className="match-deck-me" data-flyzone="deck_me">
        <DeckPile count={me.deck_count} faction={me.deck_faction} stackStepPx={2} />
      </div>
    </aside>
  )
}
