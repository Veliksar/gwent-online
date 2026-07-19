import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { cardsApi, type CardDefinition } from '../api/cards'
import { decksApi, type UserDeck } from '../api/decks'
import { lobbyApi, FACTIONS, FACTION_DEFAULT_DECKS } from '../api/lobby'
import { cardLargeImageUrl, deckShieldImageUrl } from '../utils/cardAssets'
import { deckBuilderUrls, preloadImages } from '../utils/assetPreloader'
import { useCarouselKeys, useWheelStep } from '../utils/carouselControls'
import { useT, useLanguage, translateAbilityDescription, translateCardName } from '../i18n'
import type { Language } from '../stores/settingsStore'
import '../styles/deck-builder.css'

// Канон DeckMaker: минимум 22 юнита, максимум 10 спецкарт
const MIN_UNITS = 22
const MAX_SPECIALS = 10

interface CarouselItem {
  key: string
  image: string
  name: string
  description?: string
}

// Способность лидера для подписи в карусели (у лидера ровно одна способность)
function leaderAbilityText(card: CardDefinition, language: Language): string {
  const ability = card.abilities[0]
  const info = ability ? card.ability_descriptions[ability] : undefined
  if (!ability || !info) return ''
  return translateAbilityDescription(ability, info.description, language)
}

/**
 * Карусель по канону легаси Carousel: клик по боковой карте (или колесо,
 * стрелки) листает подсветку, клик по центральной (или Enter) подтверждает.
 * Подпись показывает имя и описание просматриваемого варианта.
 */
function DbCarousel({
  title,
  items,
  currentKey,
  onPick,
  onClose,
}: {
  title: string
  items: CarouselItem[]
  currentKey: string
  onPick: (key: string) => void
  onClose: () => void
}) {
  const [browsedKey, setBrowsedKey] = useState(currentKey)
  const browsed = items.find((item) => item.key === browsedKey) ?? items[0]

  const browsedIndex = items.findIndex((item) => item.key === browsed?.key)
  const step = (direction: 1 | -1) => {
    const next = items[browsedIndex + direction]
    if (next) setBrowsedKey(next.key)
  }

  useCarouselKeys({
    onPrev: () => step(-1),
    onNext: () => step(1),
    onConfirm: () => browsed && onPick(browsed.key),
    onClose,
  })
  const handleWheel = useWheelStep(step)

  return (
    <div
      className="db-carousel"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
      onWheel={handleWheel}
    >
      <div className="db-carousel-title">{title}</div>
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          className={`db-carousel-item ${item.key === browsed?.key ? 'db-carousel-item-current' : ''}`}
          style={{ backgroundImage: `url("${item.image}")` }}
          onClick={() => {
            if (item.key === browsed?.key) {
              onPick(item.key)
            } else {
              setBrowsedKey(item.key)
            }
          }}
          aria-label={item.name}
        />
      ))}
      {browsed && (
        <div className="db-carousel-caption">
          <h3>{browsed.name}</h3>
          {browsed.description && <p>{browsed.description}</p>}
        </div>
      )}
    </div>
  )
}

export default function DeckBuilderPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const t = useT()
  const language = useLanguage()

  const fromLobby = new URLSearchParams(location.search).get('from') === 'lobby'

  const [faction, setFaction] = useState('realms')
  const [leaderId, setLeaderId] = useState<number | null>(null)
  const [counts, setCounts] = useState<Map<number, number>>(() => new Map())
  const [carousel, setCarousel] = useState<'faction' | 'leader' | null>(null)
  const [confirmFaction, setConfirmFaction] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')
  const initializedRef = useRef(false)

  const { data: cardsData } = useQuery({
    queryKey: ['cards'],
    queryFn: cardsApi.fetchAll,
    staleTime: Infinity,
  })

  const { data: decksData } = useQuery({
    queryKey: ['myDecks'],
    queryFn: decksApi.getAll,
  })

  const cards = cardsData?.cards
  const savedDecks = decksData?.decks

  const cardsByIndex = useMemo(
    () => new Map((cards ?? []).map((card) => [card.index, card])),
    [cards]
  )

  // Сохранённая колода фракции или дефолтный пресет
  const deckForFaction = (factionId: string): { leader_id: number; cards: Array<[number, number]> } => {
    const savedDeck = savedDecks?.find((d: UserDeck) => d.faction === factionId)
    if (savedDeck) {
      return { leader_id: savedDeck.leader_id, cards: savedDeck.cards }
    }
    const preset = FACTION_DEFAULT_DECKS[factionId]
    return { leader_id: preset.leader_id, cards: preset.cards }
  }

  const applyDeck = (factionId: string) => {
    const deck = deckForFaction(factionId)
    setFaction(factionId)
    setLeaderId(deck.leader_id)
    setCounts(new Map(deck.cards))
    setSaved(false)
    setSaveError('')
  }

  useEffect(() => {
    if (initializedRef.current || !cards || !savedDecks) return
    initializedRef.current = true

    const active = savedDecks.find((d: UserDeck) => d.is_active) ?? savedDecks[0]
    applyDeck(active?.faction ?? 'realms')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards, savedDecks])

  // Постепенная подгрузка lg-графики (п.8): текущая фракция вперёд,
  // остальные фракции догружаются фоном — смена фракции без задержек
  useEffect(() => {
    if (!cards) return
    const { front, back } = deckBuilderUrls(cards, faction)
    preloadImages(front, 'front')
    preloadImages(back, 'back')
  }, [cards, faction])

  // Пул карт фракции (канон makeBank): faction + neutral + weather + special, без лидеров.
  // Сортировка Card.compare: special, weather, затем юниты по силе (убыв.) и имени.
  const bankPool = useMemo(() => {
    if (!cards) return []
    const rank = (card: CardDefinition) =>
      card.deck === 'special' ? -2 : card.deck === 'weather' ? -1 : 0

    return cards
      .filter(
        (card) =>
          [faction, 'neutral', 'weather', 'special'].includes(card.deck) &&
          card.row !== 'leader'
      )
      .sort((a, b) => {
        const rankDiff = rank(a) - rank(b)
        if (rankDiff !== 0) return rankDiff
        const powerDiff = b.strength - a.strength
        if (powerDiff !== 0) return powerDiff
        return a.name.localeCompare(b.name)
      })
  }, [cards, faction])

  const leaders = useMemo(
    () =>
      (cards ?? []).filter((card) => card.deck === faction && card.row === 'leader'),
    [cards, faction]
  )

  const stats = useMemo(() => {
    let total = 0
    let units = 0
    let special = 0
    let strength = 0
    let heroes = 0

    counts.forEach((count, index) => {
      const card = cardsByIndex.get(index)
      if (!card || count <= 0) return
      total += count
      if (card.deck === 'special' || card.deck === 'weather') {
        special += count
        return
      }
      units += count
      strength += card.strength * count
      if (card.abilities.includes('hero')) heroes += count
    })

    return { total, units, special, strength, heroes }
  }, [counts, cardsByIndex])

  const deckValid = stats.units >= MIN_UNITS && stats.special <= MAX_SPECIALS && leaderId !== null

  const addToDeck = (card: CardDefinition) => {
    const inDeck = counts.get(card.index) ?? 0
    if (inDeck >= card.count) return
    const next = new Map(counts)
    next.set(card.index, inDeck + 1)
    setCounts(next)
    setSaved(false)
  }

  const removeFromDeck = (card: CardDefinition) => {
    const inDeck = counts.get(card.index) ?? 0
    if (inDeck <= 0) return
    const next = new Map(counts)
    if (inDeck === 1) {
      next.delete(card.index)
    } else {
      next.set(card.index, inDeck - 1)
    }
    setCounts(next)
    setSaved(false)
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const cardEntries: Array<[number, number]> = Array.from(counts.entries()).filter(
        ([, count]) => count > 0
      )
      await decksApi.save({ faction, leader_id: leaderId!, cards: cardEntries })

      if (fromLobby) {
        await lobbyApi.setDeck({ faction, leader_id: leaderId!, cards: cardEntries })
      }
    },
    onSuccess: () => {
      setSaved(true)
      setSaveError('')
      if (fromLobby) {
        navigate('/lobby')
      }
    },
    onError: (err: unknown) => {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : null
      setSaveError(msg || t.deckBuilder.saveError)
    },
  })

  const leaderCard = leaderId !== null ? cardsByIndex.get(leaderId) : undefined

  const cardName = (card: CardDefinition) => translateCardName(card.name, language)

  if (!cards) {
    return (
      <div className="deck-builder">
        <div className="db-faction-description">{t.deckBuilder.loading}</div>
      </div>
    )
  }

  return (
    <div className="deck-builder">
      <button
        type="button"
        className="db-back-btn"
        onClick={() => navigate(fromLobby ? '/lobby' : '/')}
      >
        {t.deckBuilder.back}
      </button>

      <div className="db-faction-title">
        <div
          className="db-faction-shield"
          style={{ backgroundImage: `url("${deckShieldImageUrl(faction)}")` }}
        />
        <h1>{t.factions[faction] ?? faction}</h1>
      </div>

      <div className="db-faction-description">
        {t.deckBuilder.factionDescriptions[faction] ?? ''}
      </div>

      <div className="db-options">
        <button type="button" className="db-option-btn" onClick={() => setCarousel('faction')}>
          {t.deckBuilder.changeFaction}
        </button>
      </div>

      <div className="db-column-title db-column-title-bank">{t.deckBuilder.cardCollection}</div>
      <div className="db-column-title db-column-title-deck">{t.deckBuilder.cardsInDeck}</div>

      <div className="db-card-array db-bank">
        {bankPool.map((card) => {
          const available = card.count - (counts.get(card.index) ?? 0)
          if (available <= 0) return null
          return (
            <button
              key={card.index}
              type="button"
              className="db-card"
              style={{ backgroundImage: `url("${cardLargeImageUrl(card)}")` }}
              onClick={() => addToDeck(card)}
              title={cardName(card)}
            >
              <div className="db-card-count">{available}</div>
            </button>
          )
        })}
      </div>

      <div className="db-card-array db-deck">
        {bankPool.map((card) => {
          const inDeck = counts.get(card.index) ?? 0
          if (inDeck <= 0) return null
          return (
            <button
              key={card.index}
              type="button"
              className="db-card"
              style={{ backgroundImage: `url("${cardLargeImageUrl(card)}")` }}
              onClick={() => removeFromDeck(card)}
              title={cardName(card)}
            >
              <div className="db-card-count">{inDeck}</div>
            </button>
          )
        })}
      </div>

      <div className="db-leader">
        <p>{t.deckBuilder.leader}</p>
        <button
          type="button"
          className="db-leader-card"
          style={leaderCard ? { backgroundImage: `url("${cardLargeImageUrl(leaderCard)}")` } : undefined}
          onClick={() => setCarousel('leader')}
          aria-label={t.deckBuilder.chooseLeader}
          title={leaderCard ? leaderAbilityText(leaderCard, language) : undefined}
        />
      </div>

      <div className="db-stats">
        <p className="db-stat-label">{t.deckBuilder.statTotal}</p>
        <p className="db-stat-value db-stat-count">{stats.total}</p>

        <p className="db-stat-label">{t.deckBuilder.statUnits}</p>
        <p
          className={`db-stat-value db-stat-unit ${stats.units < MIN_UNITS ? 'db-stat-value-invalid' : ''}`}
        >
          {stats.units}
          {stats.units < MIN_UNITS ? `/${MIN_UNITS}` : ''}
        </p>

        <p className="db-stat-label">{t.deckBuilder.statSpecial}</p>
        <p
          className={`db-stat-value db-stat-special ${stats.special > MAX_SPECIALS ? 'db-stat-value-invalid' : ''}`}
        >
          {stats.special}/{MAX_SPECIALS}
        </p>

        <p className="db-stat-label">{t.deckBuilder.statStrength}</p>
        <p className="db-stat-value db-stat-strength">{stats.strength}</p>

        <p className="db-stat-label">{t.deckBuilder.statHeroes}</p>
        <p className="db-stat-value db-stat-hero">{stats.heroes}</p>
      </div>

      <div className="db-actions">
        <button
          type="button"
          className="db-action-btn"
          disabled={!deckValid || saveMutation.isPending}
          onClick={() => saveMutation.mutate()}
        >
          {saveMutation.isPending
            ? t.deckBuilder.saving
            : fromLobby
              ? t.deckBuilder.saveAndReturn
              : t.deckBuilder.save}
        </button>
        {saved && !fromLobby && <div className="db-save-status">{t.deckBuilder.saved}</div>}
        {saveError && <div className="db-save-error">{saveError}</div>}
      </div>

      {carousel === 'faction' && (
        <DbCarousel
          title={t.deckBuilder.chooseFaction}
          items={FACTIONS.map((f) => ({
            key: f.id,
            image: `/img/lg/faction_${f.id}.jpg`,
            name: t.factions[f.id] ?? f.name,
            description: t.deckBuilder.factionDescriptions[f.id] ?? '',
          }))}
          currentKey={faction}
          onPick={(key) => {
            if (key === faction) {
              setCarousel(null)
              return
            }
            setConfirmFaction(key)
          }}
          onClose={() => setCarousel(null)}
        />
      )}

      {carousel === 'leader' && (
        <DbCarousel
          title={t.deckBuilder.chooseLeader}
          items={leaders.map((leader) => ({
            key: String(leader.index),
            image: cardLargeImageUrl(leader),
            name: t.leaders[leader.index] ?? cardName(leader),
            description: leaderAbilityText(leader, language),
          }))}
          currentKey={String(leaderId ?? '')}
          onPick={(key) => {
            setLeaderId(Number(key))
            setSaved(false)
            setCarousel(null)
          }}
          onClose={() => setCarousel(null)}
        />
      )}

      {confirmFaction && (
        <div className="db-confirm-overlay">
          <div className="db-confirm-box">
            <h2>{t.deckBuilder.confirmFactionTitle}</h2>
            <p>{t.deckBuilder.confirmFactionText}</p>
            <div className="db-confirm-actions">
              <button
                type="button"
                onClick={() => {
                  applyDeck(confirmFaction)
                  setConfirmFaction(null)
                  setCarousel(null)
                }}
              >
                {t.deckBuilder.confirm}
              </button>
              <button type="button" onClick={() => setConfirmFaction(null)}>
                {t.deckBuilder.cancel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
