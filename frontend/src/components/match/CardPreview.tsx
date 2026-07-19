import type { CardDefinition } from '../../api/cards'
import { cardAbilityIconUrl, cardLargeImageUrl } from '../../utils/cardAssets'
import { translateAbilityDescription, translateAbilityName, translateCardName, useLanguage, useT } from '../../i18n'
import type { Language } from '../../stores/settingsStore'
import type { Locale } from '../../locales/en'

function normalizeAbilityIcon(ability: string): string {
  if (ability === 'cerys') return 'muster'
  if (ability.startsWith('avenger')) return 'avenger'
  if (ability === 'scorch_c' || ability === 'scorch_r' || ability === 'scorch_s') return 'scorch'
  return ability
}

function previewAbility(card: CardDefinition): string | null {
  // Для лидерских способностей отдельных иконок нет
  if (card.row === 'leader') {
    return null
  }
  const abilities = card.abilities.filter((ability) => ability !== 'hero')
  if (abilities.length > 0) {
    return normalizeAbilityIcon(abilities[abilities.length - 1])
  }
  if (card.row === 'agile') {
    return 'agile'
  }
  return null
}

function previewTitle(card: CardDefinition, t: Locale, language: Language): string {
  const abilities = card.abilities.filter((ability) => ability !== 'hero')
  const lastAbility = abilities[abilities.length - 1]

  if (card.row === 'leader') return t.match.leaderAbility
  if (lastAbility && card.ability_descriptions[lastAbility]) {
    return translateAbilityName(lastAbility, card.ability_descriptions[lastAbility].name, language)
  }
  if (card.row === 'agile') return translateAbilityName('agile', 'agile', language)
  if (card.abilities.includes('hero') && card.ability_descriptions.hero) {
    return translateAbilityName('hero', card.ability_descriptions.hero.name, language)
  }
  return ''
}

function previewDescription(card: CardDefinition, language: Language): string {
  const descriptions: string[] = []

  if (card.row === 'agile' && card.ability_descriptions.agile) {
    descriptions.push(translateAbilityDescription('agile', card.ability_descriptions.agile.description, language))
  }

  for (const ability of [...card.abilities].reverse()) {
    const description = card.ability_descriptions[ability]?.description
    if (description) {
      descriptions.push(translateAbilityDescription(ability, description, language))
    }
  }

  return descriptions.join(' ')
}

function previewBackground(url: string): string {
  return `url("${url}"), radial-gradient(circle at 50% 24%, rgba(201, 162, 39, 0.22), transparent 34%), linear-gradient(145deg, #3b2c20, #111013 68%)`
}

export function CardPreview({ card }: { card: CardDefinition }) {
  const ability = previewAbility(card)
  const t = useT()
  const language = useLanguage()

  return (
    <section className="card-preview">
      <div
        className="card-lg"
        style={{ backgroundImage: previewBackground(cardLargeImageUrl(card)) }}
      >
        <span>{translateCardName(card.name, language)}</span>
      </div>
      <div className="card-description">
        <div style={ability ? { backgroundImage: `url("${cardAbilityIconUrl(ability)}")` } : undefined} />
        <h1>{previewTitle(card, t, language)}</h1>
        <p>{previewDescription(card, language)}</p>
      </div>
    </section>
  )
}
