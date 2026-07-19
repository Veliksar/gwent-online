import { useEffect, useMemo, useState } from 'react'
import type { CardDefinition } from '../../api/cards'
import type { GraveChoice } from '../../api/match'
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
  const t = useT()
  const language = useLanguage()

  // Сбрасываем выбор только при реальном изменении набора карт:
  // сам массив пересоздаётся при каждом обновлении матча (poll/Echo)
  const choicesKey = choices.map((choice) => `${choice.pos}:${choice.index}`).join(',')

  useEffect(() => {
    setCenter(0)
  }, [choicesKey])

  const current = choices[center]
  const currentCard = current ? cardsByIndex.get(current.index) : undefined
  const slots = useMemo(() => [-2, -1, 0, 1, 2].map((offset) => center + offset), [center])
  const icon = abilityIcon(currentCard)

  // Перебор колесом и стрелками, Enter — подтверждение (пункт 7 UPDATES_PLAN)
  const step = (direction: 1 | -1) =>
    setCenter((prev) => Math.min(choices.length - 1, Math.max(0, prev + direction)))
  useCarouselKeys({
    onPrev: () => step(-1),
    onNext: () => step(1),
    onConfirm: () => {
      if (current && !pending) onSelect(current.pos)
    },
  })
  const handleWheel = useWheelStep(step)

  if (choices.length === 0) return null

  return (
    <div id="carousel" className="grave-carousel" role="dialog" aria-modal="true" onWheel={handleWheel}>
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
              {!card && choice && <span>{translateCardName(choice.card.name, language)}</span>}
            </button>
          )
        })}
      </div>

      <div className="card-description grave-carousel-description">
        {icon && <div style={{ backgroundImage: `url("${cardAbilityIconUrl(icon)}")` }} />}
        <h1>{currentCard ? translateCardName(currentCard.name, language) : current?.card.name ?? t.match.cardFallback}</h1>
        <p>{abilityTitle(currentCard, language) ? `${abilityTitle(currentCard, language)}: ${abilityDescription(currentCard, language)}` : abilityDescription(currentCard, language)}</p>
      </div>

      <div className="grave-carousel-title">
        {pending ? t.match.medicPending : t.match.medicChoose}
      </div>
    </div>
  )
}
