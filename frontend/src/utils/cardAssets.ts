import type { CardDefinition } from '../api/cards'

const IMG_BASE = '/img'

export function cardSmallImageUrl(card: Pick<CardDefinition, 'deck' | 'filename'>): string {
  return `${IMG_BASE}/sm/${card.deck}_${card.filename}.jpg`
}

export function cardLargeImageUrl(card: Pick<CardDefinition, 'deck' | 'filename'>): string {
  return `${IMG_BASE}/lg/${card.deck}_${card.filename}.jpg`
}

export function iconUrl(name: string, ext = 'png'): string {
  return `${IMG_BASE}/icons/${name}.${ext}`
}

export function cardBackImageUrl(faction: string): string {
  return iconUrl(`deck_back_${faction}`, 'jpg')
}

export function deckShieldImageUrl(faction: string): string {
  return iconUrl(`deck_shield_${faction}`)
}

export function cardRowIconUrl(row: string): string {
  return iconUrl(`card_row_${row}`)
}

export function cardAbilityIconUrl(ability: string): string {
  return iconUrl(`card_ability_${ability}`)
}

export function powerBadgeIconUrl(card: CardDefinition): string {
  if (isHeroCard(card)) {
    return iconUrl('power_hero')
  }
  if (card.deck === 'weather' && card.abilities[0]) {
    return iconUrl(`power_${card.abilities[0]}`)
  }
  if (card.deck === 'special' && card.abilities[0]) {
    return iconUrl(`power_${card.abilities[0]}`)
  }
  return iconUrl('power_normal')
}

function isHeroCard(card: CardDefinition): boolean {
  return card.abilities.includes('hero')
}
