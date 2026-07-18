import { useEffect, useMemo, useState } from 'react'
import type { CardDefinition } from '../../api/cards'
import { cardAbilityIconUrl, cardLargeImageUrl } from '../../utils/cardAssets'

function abilityTitle(card: CardDefinition | undefined): string {
  const ability = card?.abilities.find((item) => item !== 'hero')
  if (!ability) return ''
  return card?.ability_descriptions[ability]?.name ?? ability
}

function abilityDescription(card: CardDefinition | undefined): string {
  const ability = card?.abilities.find((item) => item !== 'hero')
  if (!ability) return card?.name ?? ''
  return card?.ability_descriptions[ability]?.description ?? card?.name ?? ''
}

function abilityIcon(card: CardDefinition | undefined): string | null {
  const ability = card?.abilities.find((item) => item !== 'hero')
  if (!ability) return null
  if (ability.startsWith('scorch_')) return 'scorch'
  if (ability.startsWith('avenger')) return 'avenger'
  return ability
}

export function GraveViewCarousel({
  grave,
  cardsByIndex,
  ownerLabel,
  onClose,
}: {
  grave: number[]
  cardsByIndex: Map<number, CardDefinition>
  ownerLabel: string
  onClose: () => void
}) {
  const [center, setCenter] = useState(Math.max(0, grave.length - 1))

  // Сбрасываем выбор только при реальном изменении содержимого кладбища:
  // сам массив пересоздаётся при каждом обновлении матча (poll/Echo)
  const graveKey = grave.join(',')

  useEffect(() => {
    setCenter(Math.max(0, grave.length - 1))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graveKey])

  const currentIndex = grave[center]
  const currentCard = currentIndex !== undefined ? cardsByIndex.get(currentIndex) : undefined
  const slots = useMemo(() => [-2, -1, 0, 1, 2].map((offset) => center + offset), [center])
  const icon = abilityIcon(currentCard)

  if (grave.length === 0) return null

  return (
    <div
      id="carousel"
      className="grave-carousel grave-view-carousel"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div className="grave-carousel-cards" onClick={(event) => event.stopPropagation()}>
        {slots.map((gravePos, slotIndex) => {
          const cardIndex = gravePos >= 0 && gravePos < grave.length ? grave[gravePos] : undefined
          const card = cardIndex !== undefined ? cardsByIndex.get(cardIndex) : undefined
          const isCenter = slotIndex === 2

          return (
            <button
              key={`${slotIndex}_${gravePos}_${cardIndex ?? 'empty'}`}
              type="button"
              className={`card-lg grave-carousel-card ${isCenter ? 'grave-carousel-card-current' : ''} ${card ? '' : 'hide'}`}
              style={card ? { backgroundImage: `url("${cardLargeImageUrl(card)}")` } : undefined}
              onClick={() => {
                if (gravePos < 0 || gravePos >= grave.length) return
                if (isCenter) {
                  onClose()
                } else {
                  setCenter(gravePos)
                }
              }}
            >
              {!card && cardIndex !== undefined && <span>{cardIndex}</span>}
            </button>
          )
        })}
      </div>

      <div className="card-description grave-carousel-description">
        {icon && <div style={{ backgroundImage: `url("${cardAbilityIconUrl(icon)}")` }} />}
        <h1>{currentCard?.name ?? 'Карта'}</h1>
        <p>
          {abilityTitle(currentCard)
            ? `${abilityTitle(currentCard)}: ${abilityDescription(currentCard)}`
            : abilityDescription(currentCard)}
        </p>
      </div>

      <div className="grave-carousel-title">
        {ownerLabel} - кладбище ({center + 1}/{grave.length})
      </div>
    </div>
  )
}
