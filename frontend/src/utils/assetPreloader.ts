import type { CardDefinition } from '../api/cards'
import { cardBackImageUrl, cardLargeImageUrl, cardSmallImageUrl, deckShieldImageUrl, iconUrl } from './cardAssets'

/**
 * Постепенная подгрузка ресурсов (пункт 8 UPDATES_PLAN): картинки греются
 * заранее через Image() с ограниченной параллельностью, чтобы полёты карт,
 * превью, карусели и уведомления не ждали загрузку графики.
 *
 * priority 'front' - в начало очереди (нужно вот-вот),
 * priority 'back'  - в конец (фоновая догрузка).
 */

const CONCURRENCY = 5

const started = new Set<string>()
let queue: string[] = []
let active = 0

function pump(): void {
  while (active < CONCURRENCY && queue.length > 0) {
    const url = queue.shift()!
    if (started.has(url)) continue

    started.add(url)
    active++
    const img = new Image()
    img.onload = img.onerror = () => {
      active--
      pump()
    }
    img.src = url
  }
}

export function preloadImages(urls: string[], priority: 'front' | 'back' = 'back'): void {
  const queued = new Set(queue)
  const fresh = urls.filter((url) => !started.has(url) && !queued.has(url))
  if (fresh.length === 0) return

  queue = priority === 'front' ? [...fresh, ...queue] : [...queue, ...fresh]
  pump()
}

export const FACTION_IDS = ['realms', 'nilfgaard', 'monsters', 'scoiatael', 'skellige']

/** Иконки и фоны, используемые UI матча (уведомления, анимации, бейджи, стопки) */
export function matchUiUrls(): string[] {
  const names = [
    // анимации способностей (FlightLayer/оверлеи карт)
    'anim_bond', 'anim_horn', 'anim_medic', 'anim_morale', 'anim_muster', 'anim_scorch', 'anim_spy',
    // уведомления (#notification-bar)
    'notif_me_coin', 'notif_op_coin', 'notif_round_start', 'notif_round_passed',
    'notif_win_round', 'notif_lose_round', 'notif_draw_round', 'notif_me_turn', 'notif_op_turn',
    'notif_north', 'notif_monsters', 'notif_scoiatael', 'notif_skellige',
    // бейджи силы
    'power_normal', 'power_hero', 'power_frost', 'power_fog', 'power_rain', 'power_storm',
    'power_clear', 'power_scorch', 'power_decoy', 'power_horn', 'power_mardroeme',
    // ряды и способности на карте
    'card_row_close', 'card_row_ranged', 'card_row_siege', 'card_row_agile',
    'card_ability_agile', 'card_ability_avenger', 'card_ability_berserker', 'card_ability_bond',
    'card_ability_clear', 'card_ability_decoy', 'card_ability_fog', 'card_ability_frost',
    'card_ability_horn', 'card_ability_mardroeme', 'card_ability_medic', 'card_ability_morale',
    'card_ability_muster', 'card_ability_rain', 'card_ability_scorch', 'card_ability_spy',
    'card_ability_storm',
    // панели, погода, конец игры
    'icon_gem_on', 'icon_gem_off', 'icon_card_count', 'icon_leader_active',
    'icon_player_border', 'profile', 'score_total_me', 'score_total_op',
    'overlay_frost', 'overlay_fog', 'overlay_rain',
    'end_win', 'end_lose', 'end_draw',
  ]

  return [
    '/img/board.jpg',
    ...names.map((name) => iconUrl(name)),
    ...FACTION_IDS.map((faction) => cardBackImageUrl(faction)),
    ...FACTION_IDS.map((faction) => deckShieldImageUrl(faction)),
  ]
}

/** Пул карт, которые могут появиться в матче двух фракций */
export function cardPool(cards: CardDefinition[], factions: string[]): CardDefinition[] {
  const allowed = new Set([...factions, 'neutral', 'special', 'weather'])
  return cards.filter((card) => allowed.has(card.deck))
}

export function poolSmallUrls(cards: CardDefinition[], factions: string[]): string[] {
  return cardPool(cards, factions).map((card) => cardSmallImageUrl(card))
}

export function poolLargeUrls(cards: CardDefinition[], factions: string[]): string[] {
  return cardPool(cards, factions).map((card) => cardLargeImageUrl(card))
}

/** Ассеты deck builder: пул текущей фракции вперёд, остальные фракции фоном */
export function deckBuilderUrls(cards: CardDefinition[], currentFaction: string): {
  front: string[]
  back: string[]
} {
  const front = [
    ...FACTION_IDS.map((faction) => `/img/lg/faction_${faction}.jpg`),
    ...FACTION_IDS.map((faction) => deckShieldImageUrl(faction)),
    iconUrl('preview_count'),
    ...['count', 'unit', 'special', 'strength', 'hero'].map((name) => iconUrl(`deck_stats_${name}`)),
    ...poolLargeUrls(cards, [currentFaction]),
  ]

  const others = FACTION_IDS.filter((faction) => faction !== currentFaction)
  const back = others.flatMap((faction) =>
    cards
      .filter((card) => card.deck === faction)
      .map((card) => cardLargeImageUrl(card))
  )

  return { front, back }
}
