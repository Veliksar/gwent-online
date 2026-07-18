import type { CardDefinition } from '../../api/cards'
import { cardAbilityIconUrl, cardLargeImageUrl } from '../../utils/cardAssets'

function normalizeAbilityIcon(ability: string): string {
  if (ability === 'cerys') return 'muster'
  if (ability.startsWith('avenger')) return 'avenger'
  if (ability === 'scorch_c' || ability === 'scorch_r' || ability === 'scorch_s') return 'scorch'
  return ability
}

function previewAbility(card: CardDefinition): string | null {
  const abilities = card.abilities.filter((ability) => ability !== 'hero')
  if (abilities.length > 0) {
    return normalizeAbilityIcon(abilities[abilities.length - 1])
  }
  if (card.row === 'agile') {
    return 'agile'
  }
  return null
}

function previewTitle(card: CardDefinition): string {
  const abilities = card.abilities.filter((ability) => ability !== 'hero')
  const lastAbility = abilities[abilities.length - 1]

  if (card.row === 'leader') return 'Leader Ability'
  if (lastAbility && card.ability_descriptions[lastAbility]) {
    return card.ability_descriptions[lastAbility].name
  }
  if (card.row === 'agile') return 'agile'
  if (card.abilities.includes('hero') && card.ability_descriptions.hero) {
    return card.ability_descriptions.hero.name
  }
  return ''
}

function previewDescription(card: CardDefinition): string {
  const descriptions: string[] = []

  if (card.row === 'agile' && card.ability_descriptions.agile) {
    descriptions.push(card.ability_descriptions.agile.description)
  }

  for (const ability of [...card.abilities].reverse()) {
    const description = card.ability_descriptions[ability]?.description
    if (description) {
      descriptions.push(description)
    }
  }

  return descriptions.join(' ')
}

function previewBackground(url: string): string {
  return `url("${url}"), radial-gradient(circle at 50% 24%, rgba(201, 162, 39, 0.22), transparent 34%), linear-gradient(145deg, #3b2c20, #111013 68%)`
}

export function CardPreview({ card }: { card: CardDefinition }) {
  const ability = previewAbility(card)

  return (
    <section className="card-preview">
      <div
        className="card-lg"
        style={{ backgroundImage: previewBackground(cardLargeImageUrl(card)) }}
      >
        <span>{card.name}</span>
      </div>
      <div className="card-description">
        <div style={ability ? { backgroundImage: `url("${cardAbilityIconUrl(ability)}")` } : undefined} />
        <h1>{previewTitle(card)}</h1>
        <p>{previewDescription(card)}</p>
      </div>
    </section>
  )
}
