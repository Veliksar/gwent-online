import { useEffect, useMemo, useState } from 'react'
import type { CardDefinition } from '../../api/cards'
import type { GraveChoice } from '../../api/match'
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

export function GraveCarousel({
  choices,
  cardsByIndex,
  pending,
  onSelect,
}: {
  choices: GraveChoice[]
  cardsByIndex: Map<number, CardDefinition>
  pending: boolean
  onSelect: (gravePos: number) => void
}) {
  const [center, setCenter] = useState(0)

  useEffect(() => {
    setCenter(0)
  }, [choices])

  const current = choices[center]
  const currentCard = current ? cardsByIndex.get(current.index) : undefined
  const slots = useMemo(() => [-2, -1, 0, 1, 2].map((offset) => center + offset), [center])
  const icon = abilityIcon(currentCard)

  if (choices.length === 0) return null

  return (
    <div id="carousel" className="grave-carousel" role="dialog" aria-modal="true">
      <div className="grave-carousel-cards">
        {slots.map((choiceIndex, slotIndex) => {
          const choice = choices[choiceIndex]
          const card = choice ? cardsByIndex.get(choice.index) : undefined
          const isCenter = slotIndex === 2

          return (
            <button
              key={`${slotIndex}_${choice?.pos ?? 'empty'}`}
              type="button"
              className={`card-lg grave-carousel-card ${isCenter ? 'grave-carousel-card-current' : ''} ${choice ? '' : 'hide'}`}
              style={card ? { backgroundImage: `url("${cardLargeImageUrl(card)}")` } : undefined}
              disabled={!choice || pending}
              onClick={() => {
                if (!choice) return
                if (isCenter) {
                  onSelect(choice.pos)
                } else {
                  setCenter(choiceIndex)
                }
              }}
            >
              {!card && choice && <span>{choice.card.name}</span>}
            </button>
          )
        })}
      </div>

      <div className="card-description grave-carousel-description">
        {icon && <div style={{ backgroundImage: `url("${cardAbilityIconUrl(icon)}")` }} />}
        <h1>{currentCard?.name ?? current?.card.name ?? 'Карта'}</h1>
        <p>{abilityTitle(currentCard) ? `${abilityTitle(currentCard)}: ${abilityDescription(currentCard)}` : abilityDescription(currentCard)}</p>
      </div>

      <div className="grave-carousel-title">
        {pending ? 'Медик выбирает карту...' : 'Выберите карту из кладбища'}
      </div>
    </div>
  )
}
