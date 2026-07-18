import type { CardDefinition } from '../../api/cards'
import { GwentCard } from './GwentCard'

export function GravePile({
  grave,
  cardsByIndex,
  disabled,
  onClick,
}: {
  grave: number[]
  cardsByIndex: Map<number, CardDefinition>
  disabled?: boolean
  onClick?: () => void
}) {
  const canOpen = !disabled && grave.length > 0 && onClick

  return (
    <button
      type="button"
      className={[
        'match-grave-pile',
        grave.length === 0 ? 'match-grave-pile-empty' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={canOpen ? onClick : undefined}
      disabled={!canOpen}
      aria-label={grave.length > 0 ? `Кладбище: ${grave.length} карт` : 'Кладбище пусто'}
    >
      <div className="match-grave-pile-stack">
        {grave.map((cardIndex, index) => {
          const card = cardsByIndex.get(cardIndex)
          if (!card) return null

          return (
            <div
              key={`${index}_${cardIndex}`}
              className="match-grave-pile-card"
              style={{
                transform: `translateY(-${index * 3}px)`,
                zIndex: index,
              }}
            >
              <GwentCard card={card} />
            </div>
          )
        })}
      </div>
      <div className="match-grave-pile-counter">{grave.length}</div>
    </button>
  )
}
