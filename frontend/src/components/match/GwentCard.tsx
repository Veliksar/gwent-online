import type { CardDefinition } from '../../api/cards'
import {
  cardAbilityIconUrl,
  cardRowIconUrl,
  cardSmallImageUrl,
  iconUrl,
  powerBadgeIconUrl,
} from '../../utils/cardAssets'
import { CardPreview } from './CardPreview'

function isHero(card: CardDefinition): boolean {
  return card.abilities.includes('hero')
}

function isSpecial(card: CardDefinition): boolean {
  return card.deck === 'special' || card.deck === 'weather'
}

function normalizeAbilityIcon(ability: string): string {
  if (ability === 'cerys') return 'muster'
  if (ability.startsWith('avenger')) return 'avenger'
  if (ability === 'scorch_c' || ability === 'scorch_r' || ability === 'scorch_s') return 'scorch'
  return ability
}

function visibleAbilities(card: CardDefinition): string[] {
  return card.abilities.filter((ability) => ability !== 'hero')
}

function abilityIcon(card: CardDefinition): string | null {
  const abilities = visibleAbilities(card)
  if (!isSpecial(card) && abilities.length > 0) {
    return normalizeAbilityIcon(abilities[abilities.length - 1])
  }
  if (card.row === 'agile') {
    return 'agile'
  }
  return null
}

function powerIcon(card: CardDefinition): string {
  if (isHero(card)) return powerBadgeIconUrl(card)
  if (card.deck === 'weather' && card.abilities[0]) return iconUrl(`power_${card.abilities[0]}`)
  if (card.deck === 'special' && card.abilities[0]) return iconUrl(`power_${card.abilities[0]}`)
  return powerBadgeIconUrl(card)
}

function showsPower(card: CardDefinition): boolean {
  return card.row === 'close' || card.row === 'ranged' || card.row === 'siege' || card.row === 'agile'
}

function cardBackground(url: string): string {
  return `url("${url}"), radial-gradient(circle at 50% 22%, rgba(201, 162, 39, 0.22), transparent 34%), linear-gradient(145deg, #3b2c20, #111013 68%)`
}

export function GwentCard({
  card,
  power,
  selected,
  weathered,
  animation,
  onClick,
}: {
  card: CardDefinition
  power?: number
  selected?: boolean
  weathered?: boolean
  animation?: string | null
  onClick?: () => void
}) {
  const ability = abilityIcon(card)

  return (
    <div className="gwent-card-wrap">
      <button
        type="button"
        className={[
          'card',
          isHero(card) ? 'hero' : '',
          isSpecial(card) ? 'special' : '',
          selected ? 'gwent-card-selected' : '',
          weathered ? 'gwent-card-weathered' : '',
          animation ? `gwent-card-anim-${animation}` : '',
        ].filter(Boolean).join(' ')}
        style={{ backgroundImage: cardBackground(cardSmallImageUrl(card)) }}
        onClick={(event) => {
          event.stopPropagation()
          onClick?.()
        }}
        disabled={!onClick}
      >
        {card.row !== 'leader' && (
          <>
            <div style={{ backgroundImage: `url("${powerIcon(card)}")` }}>
              {showsPower(card) && <div>{power ?? card.strength}</div>}
            </div>
            <div style={showsPower(card) ? { backgroundImage: `url("${cardRowIconUrl(card.row)}")` } : undefined} />
            <div style={ability ? { backgroundImage: `url("${cardAbilityIconUrl(ability)}")` } : undefined} />
            <div className="gwent-card-animation" />
          </>
        )}
      </button>
      <CardPreview card={card} />
    </div>
  )
}
