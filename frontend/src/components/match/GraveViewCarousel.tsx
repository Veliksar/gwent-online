import { useEffect, useMemo, useState } from 'react'
import type { CardDefinition } from '../../api/cards'
import { cardAbilityIconUrl, cardLargeImageUrl } from '../../utils/cardAssets'
import { useCarouselKeys, useWheelStep } from '../../utils/carouselControls'
import { translateAbilityDescription, translateAbilityName, translateCardName, useLanguage, useT } from '../../i18n'
import type { Language } from '../../stores/settingsStore'

function abilityTitle(card: CardDefinition | undefined, language: Language): string {
  const ability = card?.abilities.find((item) => item !== 'hero')
  if (!ability) return ''
  return translateAbilityName(ability, card?.ability_descriptions[ability]?.name ?? ability, language)
}

function abilityDescription(card: CardDefinition | undefined, language: Language): string {
  const ability = card?.abilities.find((item) => item !== 'hero')
  if (!ability) return card ? translateCardName(card.name, language) : ''
  const fallback = card?.ability_descriptions[ability]?.description
  if (fallback) return translateAbilityDescription(ability, fallback, language)
  return card ? translateCardName(card.name, language) : ''
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
  const t = useT()
  const language = useLanguage()

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

  // Перебор колесом и стрелками, Escape/Enter — закрыть (пункт 7 UPDATES_PLAN)
  const step = (direction: 1 | -1) =>
    setCenter((prev) => Math.min(grave.length - 1, Math.max(0, prev + direction)))
  useCarouselKeys({
    onPrev: () => step(-1),
    onNext: () => step(1),
    onConfirm: onClose,
    onClose,
  })
  const handleWheel = useWheelStep(step)

  if (grave.length === 0) return null

  return (
    <div
      id="carousel"
      className="grave-carousel grave-view-carousel"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      onWheel={handleWheel}
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
        <h1>{currentCard ? translateCardName(currentCard.name, language) : t.match.cardFallback}</h1>
        <p>
          {abilityTitle(currentCard, language)
            ? `${abilityTitle(currentCard, language)}: ${abilityDescription(currentCard, language)}`
            : abilityDescription(currentCard, language)}
        </p>
      </div>

      <div className="grave-carousel-title">
        {t.match.graveTitle(ownerLabel, center + 1, grave.length)}
      </div>
    </div>
  )
}
