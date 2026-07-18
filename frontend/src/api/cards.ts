import apiClient from './client'

export interface CardDefinition {
  index: number
  name: string
  id: string
  deck: string
  row: string
  strength: number
  abilities: string[]
  ability_descriptions: Record<string, AbilityDefinition>
  filename: string
  count: number
}

export interface AbilityDefinition {
  name: string
  description: string
}

export interface CardsResponse {
  count: number
  cards: CardDefinition[]
  abilities: Record<string, AbilityDefinition>
}

let cachedCards: CardDefinition[] | null = null
let cachedAbilities: Record<string, AbilityDefinition> | null = null
const cardsByIndex = new Map<number, CardDefinition>()

function indexCards(cards: CardDefinition[]): void {
  cardsByIndex.clear()
  for (const card of cards) {
    cardsByIndex.set(card.index, card)
  }
}

export const cardsApi = {
  async fetchAll(): Promise<CardsResponse> {
    const { data } = await apiClient.get<CardsResponse>('/cards')
    cachedCards = data.cards
    cachedAbilities = data.abilities
    indexCards(data.cards)
    return data
  },

  getCardByIndex(index: number): CardDefinition | undefined {
    return cardsByIndex.get(index)
  },

  getCachedCards(): CardDefinition[] {
    return cachedCards ?? []
  },

  getCachedAbilities(): Record<string, AbilityDefinition> {
    return cachedAbilities ?? {}
  },
}

export function isHeroCard(card: CardDefinition): boolean {
  return card.abilities.includes('hero')
}
