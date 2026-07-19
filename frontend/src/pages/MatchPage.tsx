import { useEffect, useLayoutEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { useMatchStore } from '../stores/matchStore'
import { useAuthStore } from '../stores/authStore'
import { useLobbyStore } from '../stores/lobbyStore'
import { matchApi, type GameMatch, type LeaderResult, type MatchPlayer } from '../api/match'
import { sandboxApi } from '../api/sandbox'
import { cardsApi, type CardDefinition } from '../api/cards'
import { lobbyApi } from '../api/lobby'
import { getEcho } from '../services/echo'
import { useT } from '../i18n'
import { GameEndScreen } from '../components/match/GameEndScreen'
import { MatchBoard } from '../components/match/MatchBoard'
import type { CardFlight, FlightRect } from '../components/match/FlightLayer'
import type { GhostCard } from '../components/match/MatchField'
import '../styles/match.css'

interface GameEndInfo {
  winnerId: number | null
  isDraw: boolean
  me: MatchPlayer | null
  opponent: MatchPlayer | null
  roundHistory: GameMatch['round_history']
}

type RowKey = 'close' | 'ranged' | 'siege'

type MatchFsm =
  | { mode: 'idle' }
  | { mode: 'card_selected'; handPos: number; cardIndex: number }
  | { mode: 'medic_select' }
  | { mode: 'decoy_select'; handPos: number; cardIndex: number }
  | { mode: 'leader_confirm' }
  | { mode: 'scoia_first_choice' }
  | { mode: 'emhyr_reveal' }

const ROWS: RowKey[] = ['close', 'ranged', 'siege']

// Канон: translateTo ~499ms; scorch-оверлей на призраке 1.9s (gwent-card-scorch)
const FLIGHT_MS = 500
const GHOST_SCORCH_MS = 1900

// Контекст последнего розыгрыша — для выбора зоны вылета (рука/колода/ряд)
interface PlayContext {
  side: 'me' | 'op'
  cardIndex: number
  ability: 'muster' | null
  decoyRow: RowKey | null
}

interface PendingBoardArrival {
  owner: 'me' | 'op'
  row: RowKey
  cardIndex: number
  count: number
  source: string
}

interface PendingHandArrival {
  pos: number
  source: string
}

function countByIndex(list: number[]): Map<number, number> {
  const counts = new Map<number, number>()
  list.forEach((index) => counts.set(index, (counts.get(index) ?? 0) + 1))
  return counts
}

// Позиции новых карт руки: только реально добавленные копии (мультимножество),
// чтобы сдвиг руки после розыгрыша не давал ложных «прилётов»
function diffHandArrivals(prev: (number | null)[], next: (number | null)[]): number[] {
  const remaining = new Map<number, number>()
  prev.forEach((c) => {
    if (c !== null) remaining.set(c, (remaining.get(c) ?? 0) + 1)
  })

  const added = new Map<number, number>()
  next.forEach((c) => {
    if (c === null) return
    const left = remaining.get(c) ?? 0
    if (left > 0) {
      remaining.set(c, left - 1)
    } else {
      added.set(c, (added.get(c) ?? 0) + 1)
    }
  })

  if (added.size === 0) return []

  const positions: number[] = []
  for (let i = next.length - 1; i >= 0; i--) {
    const c = next[i]
    if (c === null) continue
    const need = added.get(c) ?? 0
    if (need > 0 && prev[i] !== c) {
      positions.push(i)
      added.set(c, need - 1)
    }
  }
  added.forEach((need, c) => {
    for (let i = next.length - 1; i >= 0 && need > 0; i--) {
      if (next[i] === c && !positions.includes(i)) {
        positions.push(i)
        need--
      }
    }
  })
  return positions
}

function getAbilityAnimName(card: CardDefinition): string | null {
  if (card.abilities.includes('scorch') || card.abilities.some((a) => a.startsWith('scorch_'))) return 'scorch'
  if (card.abilities.includes('spy')) return 'spy'
  if (card.abilities.includes('medic')) return 'medic'
  if (card.abilities.includes('bond')) return 'bond'
  if (card.abilities.includes('horn')) return 'horn'
  if (card.abilities.includes('morale')) return 'morale'
  if (card.abilities.includes('muster') || card.abilities.includes('cerys')) return 'muster'
  return null
}

export default function MatchPage() {
  const navigate = useNavigate()
  const { match, setMatch, clearMatch } = useMatchStore()
  const { user } = useAuthStore()
  const { clearLobby } = useLobbyStore()
  const t = useT()
  // Echo-слушатели регистрируются один раз на матч — берут актуальный словарь через ref
  const tRef = useRef(t)
  tRef.current = t

  const [fsm, setFsm] = useState<MatchFsm>({ mode: 'idle' })
  const [statusMsg, setStatusMsg] = useState('')
  const [notificationName, setNotificationName] = useState<string | null>(null)
  const [gameEnd, setGameEnd] = useState<GameEndInfo | null>(null)
  const [loading, setLoading] = useState(!match)
  const [turnSecondsLeft, setTurnSecondsLeft] = useState<number | null>(null)
  const [localRoundEndingSeconds, setLocalRoundEndingSeconds] = useState<number | null>(null)
  const [cardsByIndex, setCardsByIndex] = useState<Map<number, CardDefinition>>(() => new Map())
  const [revealCards, setRevealCards] = useState<number[]>([])
  // Ключ - "{сторона}_{индекс карты}": одинаковые карты на обоих полях не должны
  // подхватывать чужую анимацию (баг: рог соперника анимировал мою копию карты)
  const [animatingCards, setAnimatingCards] = useState<Map<string, string>>(() => new Map())
  const [ghostCards, setGhostCards] = useState<GhostCard[]>([])
  const [opponentPlayedCard, setOpponentPlayedCard] = useState<CardDefinition | null>(null)
  const [flights, setFlights] = useState<CardFlight[]>([])
  const [arrivingBoard, setArrivingBoard] = useState<Map<string, number>>(() => new Map())
  const [arrivingHand, setArrivingHand] = useState<Set<number>>(() => new Set())

  const syncTurnCalledRef = useRef(false)
  const latestMatchRef = useRef<GameMatch | null>(match)
  const cardsByIndexRef = useRef<Map<number, CardDefinition>>(new Map())
  const notifTimerRef = useRef<number | null>(null)
  const notifQueueRef = useRef<string[]>([])
  const playContextRef = useRef<PlayContext | null>(null)
  const pendingArrivalsRef = useRef<{ board: PendingBoardArrival[]; hand: PendingHandArrival[] } | null>(null)
  const flightSeqRef = useRef(0)
  // -1 = не инициализировано (первый state после загрузки не должен реиграть события)
  const lastFactionSeqRef = useRef(-1)

  const removeFlightsLater = useCallback((ids: Set<string>, clearArrivals: boolean) => {
    window.setTimeout(() => {
      setFlights((prev) => prev.filter((f) => !ids.has(f.id)))
      if (clearArrivals) {
        setArrivingBoard((prev) => (prev.size ? new Map() : prev))
        setArrivingHand((prev) => (prev.size ? new Set() : prev))
      }
    }, FLIGHT_MS + 30)
  }, [])

  // Очередь уведомлений как в legacy UI.notification (последовательный показ по ~1.2s)
  const showNotification = useCallback((name: string) => {
    if (notifTimerRef.current !== null) {
      notifQueueRef.current.push(name)
      return
    }

    const advance = () => {
      const next = notifQueueRef.current.shift()
      if (next !== undefined) {
        setNotificationName(next)
        notifTimerRef.current = window.setTimeout(advance, 1250)
      } else {
        notifTimerRef.current = null
        setNotificationName(null)
      }
    }

    setNotificationName(name)
    notifTimerRef.current = window.setTimeout(advance, 1250)
  }, [])

  useEffect(() => {
    return () => {
      // Сброс ref обязателен: StrictMode/HMR вызывают cleanup с повторным mount,
      // и «висящий» id таймера навсегда блокировал очередь уведомлений
      if (notifTimerRef.current !== null) {
        window.clearTimeout(notifTimerRef.current)
        notifTimerRef.current = null
        notifQueueRef.current = []
      }
    }
  }, [])

  const handleGameEnded = useCallback((winnerId: number | null, isDraw: boolean) => {
    const latestMatch = latestMatchRef.current
    const me = latestMatch?.players.find((p) => p.user_id === user?.id) ?? null
    const opponent = latestMatch?.players.find((p) => p.user_id !== user?.id) ?? null
    setGameEnd({ winnerId, isDraw, me, opponent, roundHistory: latestMatch?.round_history ?? [] })
    clearMatch()
    clearLobby()
  }, [clearMatch, clearLobby, user?.id])

  const triggerCardAnimation = useCallback((side: 'me' | 'op', cardIndex: number, animName: string, durationMs: number) => {
    const key = `${side}_${cardIndex}`
    setAnimatingCards((prev) => {
      const next = new Map(prev)
      next.set(key, animName)
      return next
    })
    setTimeout(() => {
      setAnimatingCards((prev) => {
        if (prev.get(key) !== animName) return prev
        const next = new Map(prev)
        next.delete(key)
        return next
      })
    }, durationMs)
  }, [])

  const applyMatchResponse = useCallback((data: {
    match?: GameMatch | null
    game_ended?: boolean
    winner_id?: number | null
    is_draw?: boolean
    cancelled?: boolean
  }) => {
    const prevMatch = latestMatchRef.current

    if (data.match) {
      latestMatchRef.current = data.match as GameMatch
    }

    if (data.game_ended) {
      handleGameEnded(data.winner_id ?? null, data.is_draw ?? false)
      return
    }

    if (data.cancelled) {
      clearMatch()
      clearLobby()
      navigate('/')
      return
    }

    if (data.match) {
      const newMatch = data.match as GameMatch

      if (prevMatch && prevMatch.id === newMatch.id && prevMatch.current_round === newMatch.current_round) {
        const ghosts: GhostCard[] = []

        for (const player of newMatch.players) {
          const ownerKey: 'me' | 'op' = player.user_id === user?.id ? 'me' : 'op'
          const prevPlayer = prevMatch.players.find((p) => p.user_id === player.user_id)
          if (!prevPlayer) continue

          const newGraveSet = new Set(player.grave)

          for (const row of ['close', 'ranged', 'siege'] as const) {
            const prevCards = prevPlayer.board_display[row] ?? []
            const newCards = player.board_display[row] ?? []

            if (newCards.length >= prevCards.length) continue

            const newCountMap = new Map<number, number>()
            newCards.forEach((bc) => newCountMap.set(bc.index, (newCountMap.get(bc.index) ?? 0) + 1))

            const prevCountMap = new Map<number, number>()
            prevCards.forEach((bc) => prevCountMap.set(bc.index, (prevCountMap.get(bc.index) ?? 0) + 1))

            prevCountMap.forEach((count, cardIndex) => {
              const remaining = newCountMap.get(cardIndex) ?? 0
              const removed = count - remaining
              if (removed > 0 && newGraveSet.has(cardIndex)) {
                const bc = prevCards.find((c) => c.index === cardIndex)
                for (let i = 0; i < removed; i++) {
                  ghosts.push({
                    id: `ghost_${Date.now()}_${cardIndex}_${i}`,
                    cardIndex,
                    owner: ownerKey,
                    row,
                    power: bc?.power ?? 0,
                  })
                }
              }
            })
          }
        }

        if (ghosts.length > 0) {
          setGhostCards((prev) => [...prev, ...ghosts])
          const ghostIds = new Set(ghosts.map((g) => g.id))
          // После scorch-оверлея призрак летит в стопку кладбища владельца (канон: translateTo row -> grave)
          setTimeout(() => {
            const boardEl = document.querySelector('.match-board')
            const boardRect = boardEl?.getBoundingClientRect()
            const graveFlights: CardFlight[] = []

            if (boardRect) {
              for (const ghost of ghosts) {
                const ghostEl = document.querySelector(`[data-ghost-id="${ghost.id}"]`)
                const zoneEl = document.querySelector(`[data-flyzone="grave_${ghost.owner}"]`)
                const card = cardsByIndexRef.current.get(ghost.cardIndex)
                if (!ghostEl || !zoneEl || !card) continue

                const stackEl = zoneEl.querySelector('.match-grave-pile-stack') ?? zoneEl
                const fromR = ghostEl.getBoundingClientRect()
                const toR = stackEl.getBoundingClientRect()
                graveFlights.push({
                  id: `gfl_${ghost.id}`,
                  card,
                  power: ghost.power,
                  from: { x: fromR.left - boardRect.left, y: fromR.top - boardRect.top, w: fromR.width, h: fromR.height },
                  to: { x: toR.left - boardRect.left, y: toR.top - boardRect.top, w: toR.width, h: toR.height },
                  fadeAtEnd: true,
                })
              }
            }

            setGhostCards((prev) => prev.filter((g) => !ghostIds.has(g.id)))
            if (graveFlights.length > 0) {
              setFlights((prev) => [...prev, ...graveFlights])
              removeFlightsLater(new Set(graveFlights.map((f) => f.id)), false)
            }
          }, GHOST_SCORCH_MS)
        }

        // Прибытия карт: на стол (рука/колода/кладбище -> ряд) и в руку (колода/ряд -> рука)
        const ctx = playContextRef.current
        playContextRef.current = null
        const boardArrivals: PendingBoardArrival[] = []

        for (const player of newMatch.players) {
          const ownerKey: 'me' | 'op' = player.user_id === user?.id ? 'me' : 'op'
          const prevPlayer = prevMatch.players.find((p) => p.user_id === player.user_id)
          if (!prevPlayer) continue

          const prevGraveCounts = countByIndex(prevPlayer.grave)
          const newGraveCounts = countByIndex(player.grave)

          for (const row of ['close', 'ranged', 'siege'] as const) {
            const prevCounts = countByIndex((prevPlayer.board_display[row] ?? []).map((bc) => bc.index))
            const newCounts = countByIndex((player.board_display[row] ?? []).map((bc) => bc.index))

            newCounts.forEach((count, cardIndex) => {
              const addedCount = count - (prevCounts.get(cardIndex) ?? 0)
              if (addedCount <= 0) return

              const card = cardsByIndexRef.current.get(cardIndex)
              let source = `hand_${ownerKey}`
              if (card?.abilities.includes('spy')) {
                // Шпион приходит из руки игравшего — противоположной стороны ряда
                source = ownerKey === 'me' ? 'hand_op' : 'hand_me'
              } else if ((prevGraveCounts.get(cardIndex) ?? 0) > (newGraveCounts.get(cardIndex) ?? 0)) {
                // Воскрешение (медик/avenger) — из кладбища владельца
                source = `grave_${ownerKey}`
              }

              if (ctx?.ability === 'muster' && ctx.side === ownerKey) {
                if (cardIndex !== ctx.cardIndex) {
                  source = `deck_${ownerKey}`
                } else if (addedCount > 1) {
                  // Первая копия из руки, дозванные muster'ом — из колоды
                  boardArrivals.push({ owner: ownerKey, row, cardIndex, count: 1, source })
                  boardArrivals.push({ owner: ownerKey, row, cardIndex, count: addedCount - 1, source: `deck_${ownerKey}` })
                  return
                }
              }

              boardArrivals.push({ owner: ownerKey, row, cardIndex, count: addedCount, source })
            })
          }
        }

        const handArrivals: PendingHandArrival[] = []
        const meNew = newMatch.players.find((p) => p.user_id === user?.id)
        const mePrev = prevMatch.players.find((p) => p.user_id === user?.id)
        if (meNew && mePrev && (meNew.redraw_remaining ?? 0) === 0) {
          const positions = diffHandArrivals(mePrev.hand, meNew.hand)
          const source = ctx?.side === 'me' && ctx.decoyRow ? `row_me_${ctx.decoyRow}` : 'deck_me'
          positions.forEach((pos) => handArrivals.push({ pos, source }))
        }

        if (boardArrivals.length > 0 || handArrivals.length > 0) {
          pendingArrivalsRef.current = { board: boardArrivals, hand: handArrivals }
          const boardMap = new Map<string, number>()
          boardArrivals.forEach((a) => {
            const key = `${a.owner}:${a.row}:${a.cardIndex}`
            boardMap.set(key, (boardMap.get(key) ?? 0) + a.count)
          })
          setArrivingBoard(boardMap)
          setArrivingHand(new Set(handArrivals.map((h) => h.pos)))
        }
      }

      // Фракционные уведомления (канон: factions.js — до round-start)
      const factionEvents = newMatch.faction_events ?? []
      if (prevMatch && prevMatch.id === newMatch.id && lastFactionSeqRef.current >= 0) {
        for (const ev of factionEvents) {
          if (ev.seq <= lastFactionSeqRef.current) continue
          lastFactionSeqRef.current = ev.seq

          if (ev.faction === 'realms') {
            showNotification('north')
          } else if (ev.faction === 'monsters') {
            showNotification('monsters')
          } else if (ev.faction === 'skellige') {
            showNotification(ev.user_id === user?.id ? 'skellige-me' : 'skellige-op')
          } else if (ev.faction === 'scoiatael' && ev.user_id !== user?.id) {
            // Показывается только сопернику выбиравшего (канон: notif "scoiatael")
            showNotification('scoiatael')
          }
        }
      } else {
        // Загрузка/реконнект: не реиграть старые события
        lastFactionSeqRef.current = factionEvents.reduce((max, ev) => Math.max(max, ev.seq), 0)
      }

      // Уведомления смены раунда/хода (канон: Game.startRound / Game.startTurn)
      if (prevMatch && prevMatch.id === newMatch.id) {
        if (prevMatch.current_round !== newMatch.current_round) {
          showNotification('round-start')
          if (newMatch.current_player_id) {
            showNotification(newMatch.current_player_id === user?.id ? 'me-turn' : 'op-turn')
          }
        } else if (
          newMatch.current_player_id &&
          prevMatch.current_player_id !== newMatch.current_player_id
        ) {
          showNotification(newMatch.current_player_id === user?.id ? 'me-turn' : 'op-turn')
        }
      }

      setMatch(newMatch)
      syncTurnCalledRef.current = false
    }
  }, [setMatch, handleGameEnded, user?.id, showNotification, clearMatch, clearLobby, navigate])

  useEffect(() => {
    if (match) {
      latestMatchRef.current = match
      if (match.pending_medic) {
        setFsm({ mode: 'medic_select' })
      } else {
        setFsm((current) => current.mode === 'medic_select' ? { mode: 'idle' } : current)
      }
    }
  }, [match?.id, match?.pending_medic])

  // После коммита скрытых «прилетевших» карт: измеряем их и запускаем полёты.
  // Зависимость именно от arrivingBoard/arrivingHand: обновление zustand-стора (setMatch)
  // коммитится отдельно и раньше, чем useState-состояния этого компонента.
  useLayoutEffect(() => {
    if (arrivingBoard.size === 0 && arrivingHand.size === 0) return
    const pending = pendingArrivalsRef.current
    if (!pending) return
    pendingArrivalsRef.current = null

    const boardEl = document.querySelector('.match-board')
    if (!boardEl) {
      setArrivingBoard(new Map())
      setArrivingHand(new Set())
      return
    }
    const boardRect = boardEl.getBoundingClientRect()

    const toBoardRect = (r: DOMRect): FlightRect => ({
      x: r.left - boardRect.left,
      y: r.top - boardRect.top,
      w: r.width,
      h: r.height,
    })

    const zoneRect = (zone: string): FlightRect | null => {
      const el = document.querySelector(`[data-flyzone="${zone}"]`)
      if (!el) return null
      const inner = el.querySelector('.match-grave-pile-stack, .match-deck-pile-stack')
      return toBoardRect((inner ?? el).getBoundingClientRect())
    }

    // Точка вылета: центр зоны-источника, размер = размеру целевого слота
    const fromZone = (src: FlightRect, to: FlightRect): FlightRect => ({
      x: src.x + src.w / 2 - to.w / 2,
      y: src.y + src.h / 2 - to.h / 2,
      w: to.w,
      h: to.h,
    })

    const newFlights: CardFlight[] = []
    const elemsByKey = new Map<string, Element[]>()

    for (const arrival of pending.board) {
      const key = `${arrival.owner}:${arrival.row}:${arrival.cardIndex}`
      if (!elemsByKey.has(key)) {
        elemsByKey.set(key, Array.from(document.querySelectorAll(`[data-arriving="${key}"]`)))
      }
      const elems = elemsByKey.get(key)!
      const card = cardsByIndexRef.current.get(arrival.cardIndex)
      const src = zoneRect(arrival.source)

      for (let i = 0; i < arrival.count; i++) {
        const el = elems.shift()
        if (!el || !card || !src) continue
        const to = toBoardRect(el.getBoundingClientRect())
        const power = (() => {
          const m = latestMatchRef.current
          const p = m?.players.find((pl) => (pl.user_id === user?.id) === (arrival.owner === 'me'))
          const rowCards = p?.board_display[arrival.row] ?? []
          for (let j = rowCards.length - 1; j >= 0; j--) {
            if (rowCards[j].index === arrival.cardIndex) return rowCards[j].power
          }
          return undefined
        })()
        newFlights.push({
          id: `fl_${flightSeqRef.current++}`,
          card,
          power,
          from: fromZone(src, to),
          to,
        })
      }
    }

    for (const arrival of pending.hand) {
      const el = document.querySelector(`[data-hand-arriving="${arrival.pos}"]`)
      const src = zoneRect(arrival.source)
      const m = latestMatchRef.current
      const me = m?.players.find((p) => p.user_id === user?.id)
      const cardIndex = me?.hand[arrival.pos]
      const card = cardIndex != null ? cardsByIndexRef.current.get(cardIndex) : undefined
      if (!el || !src || !card) continue
      const to = toBoardRect(el.getBoundingClientRect())
      newFlights.push({
        id: `fl_${flightSeqRef.current++}`,
        card,
        from: fromZone(src, to),
        to,
      })
    }

    if (newFlights.length > 0) {
      setFlights((prev) => [...prev, ...newFlights])
      removeFlightsLater(new Set(newFlights.map((f) => f.id)), true)
    } else {
      setArrivingBoard((prev) => (prev.size ? new Map() : prev))
      setArrivingHand((prev) => (prev.size ? new Set() : prev))
    }
  }, [arrivingBoard, arrivingHand, user?.id, removeFlightsLater])

  // Жребий первого хода при старте матча (канон: Game.coinToss)
  useEffect(() => {
    if (!match || match.current_round !== 1 || !match.current_player_id) return

    const boardsEmpty = match.players.every((p) =>
      p.grave.length === 0 &&
      (['close', 'ranged', 'siege'] as const).every((row) => (p.board[row] ?? []).length === 0)
    )
    if (!boardsEmpty) return

    showNotification(match.current_player_id === user?.id ? 'me-coin' : 'op-coin')
  }, [match?.id])

  useEffect(() => {
    if (match) {
      setLoading(false)
      return
    }

    let cancelled = false

    matchApi.getState()
      .then((data) => {
        if (cancelled) return
        if (data.game_ended) {
          handleGameEnded(data.winner_id ?? null, data.is_draw ?? false)
        } else if (data.match) {
          latestMatchRef.current = data.match as GameMatch
          setMatch(data.match as GameMatch)
        } else {
          navigate('/')
        }
      })
      .catch(() => {
        if (!cancelled) navigate('/')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    cardsApi.fetchAll()
      .then(({ cards }) => {
        if (!cancelled) {
          const map = new Map(cards.map((card) => [card.index, card]))
          cardsByIndexRef.current = map
          setCardsByIndex(map)
        }
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [])

  const refreshState = useCallback(async () => {
    try {
      const data = await matchApi.getState(latestMatchRef.current?.id)
      applyMatchResponse(data)
    } catch {
    }
  }, [applyMatchResponse])

  const syncTurn = useCallback(async () => {
    try {
      const data = await matchApi.syncTurn(latestMatchRef.current?.id)
      applyMatchResponse(data)
    } catch {
    }
  }, [applyMatchResponse])

  useEffect(() => {
    if (!match?.turn_started_at || !match.turn_timeout_seconds) {
      setTurnSecondsLeft(null)
      return
    }

    syncTurnCalledRef.current = false

    const tick = () => {
      const started = new Date(match.turn_started_at!).getTime()
      const deadline = started + match.turn_timeout_seconds * 1000
      const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
      setTurnSecondsLeft(left)

      if (left === 0 && !syncTurnCalledRef.current) {
        syncTurnCalledRef.current = true
        syncTurn()
      }
    }

    tick()
    const interval = setInterval(tick, 1000)

    return () => clearInterval(interval)
  }, [match?.turn_started_at, match?.turn_timeout_seconds, match?.current_player_id, syncTurn])

  useEffect(() => {
    setLocalRoundEndingSeconds(match?.round_ending_seconds ?? null)
  }, [match?.round_ending_seconds])

  useEffect(() => {
    if (localRoundEndingSeconds === null || localRoundEndingSeconds < 0) return

    if (localRoundEndingSeconds === 0) {
      syncTurn()
      return
    }

    const timer = setInterval(() => {
      setLocalRoundEndingSeconds((prev) => (prev !== null && prev > 0 ? prev - 1 : null))
    }, 1000)

    return () => clearInterval(timer)
  }, [localRoundEndingSeconds, syncTurn])

  useEffect(() => {
    if (!match) return

    const poll = setInterval(() => {
      syncTurn()
    }, 5000)

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        syncTurn()
      }
    }

    document.addEventListener('visibilitychange', onVisible)

    return () => {
      clearInterval(poll)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [match?.id, syncTurn])

  useEffect(() => {
    if (!match) return

    const echo = getEcho()
    const channel = echo.private(`match.${match.id}`)

    channel.listen('.match.play_card', async (data: { user_id: number; card_id: number | null; row: string }) => {
      // Канон (Player.playCardAction): карта соперника показывается превью ~1с до обновления поля
      if (data.card_id !== null && data.user_id !== user?.id) {
        const playedCard = cardsByIndexRef.current.get(data.card_id)
        if (playedCard) {
          setOpponentPlayedCard(playedCard)
          await new Promise((resolve) => setTimeout(resolve, 1000))
          setOpponentPlayedCard(null)
        }

        // Контекст для зоны вылета карт соперника (FlightLayer)
        if (playedCard) {
          playContextRef.current = {
            side: 'op',
            cardIndex: data.card_id,
            ability: playedCard.abilities.includes('muster') || playedCard.abilities.includes('cerys') ? 'muster' : null,
            decoyRow: playedCard.abilities.includes('decoy') ? (data.row as RowKey) : null,
          }
        }
      }

      await refreshState()
      setStatusMsg('')

      if (data.card_id === null) return

      const card = cardsByIndexRef.current.get(data.card_id)
      if (!card) return

      const animName = getAbilityAnimName(card)
      if (!animName) return

      const duration = animName === 'scorch' ? 1900 : 1600
      const newMatch = latestMatchRef.current
      if (!newMatch) return

      const ownerKey: 'me' | 'op' = data.user_id === user?.id ? 'me' : 'op'
      const playerData = newMatch.players.find((p) =>
        ownerKey === 'me' ? p.user_id === user?.id : p.user_id !== user?.id
      )
      const row = data.row as RowKey

      if ((animName === 'bond') && playerData) {
        const rowCards = playerData.board_display[row] ?? []
        rowCards.forEach((bc) => {
          const c = cardsByIndexRef.current.get(bc.index)
          if (c?.abilities.includes('bond') || c?.abilities.includes('cerys')) {
            triggerCardAnimation(ownerKey, bc.index, 'bond', duration)
          }
        })
      } else if ((animName === 'horn' || animName === 'morale') && playerData) {
        const rowCards = playerData.board_display[row] ?? []
        rowCards.forEach((bc) => triggerCardAnimation(ownerKey, bc.index, animName, duration))
      } else if (animName === 'muster' && playerData) {
        const rowCards = playerData.board_display[row] ?? []
        rowCards.forEach((bc) => {
          const c = cardsByIndexRef.current.get(bc.index)
          if (c?.abilities.includes('muster') || c?.abilities.includes('cerys')) {
            triggerCardAnimation(ownerKey, bc.index, 'muster', duration)
          }
        })
      } else {
        // Шпион ложится на противоположную сторону от игравшего
        const animSide: 'me' | 'op' = card.abilities.includes('spy')
          ? (ownerKey === 'me' ? 'op' : 'me')
          : ownerKey
        triggerCardAnimation(animSide, data.card_id, animName, duration)
      }
    })

    channel.listen('.match.pass', async (data: { user_id: number }) => {
      if (data.user_id !== user?.id) {
        setStatusMsg(tRef.current.match.opponentPassed)
        showNotification('op-pass')
      } else {
        setStatusMsg(tRef.current.match.youPassed)
        showNotification('me-pass')
      }
      await syncTurn()
    })

    channel.listen('.match.round_end', async (data: { round_winner_id: number | null; current_round: number }) => {
      // Уведомление итога раунда до обновления состояния, чтобы round-start встал в очередь после него
      if (data.round_winner_id === user?.id) {
        setStatusMsg(tRef.current.match.winRound(data.current_round))
        showNotification('win-round')
      } else if (data.round_winner_id) {
        setStatusMsg(tRef.current.match.loseRound(data.current_round))
        showNotification('lose-round')
      } else {
        setStatusMsg(tRef.current.match.drawRound(data.current_round))
        showNotification('draw-round')
      }
      await refreshState()
    })

    channel.listen('.match.leader_used', async (data: { user_id: number; leader_result?: LeaderResult | null }) => {
      // Канон (Player.activateLeader): карта лидера показывается превью ~1.5с
      if (data.user_id !== user?.id) {
        const opPlayer = latestMatchRef.current?.players.find((p) => p.user_id === data.user_id)
        const leaderCard = opPlayer?.leader_index != null
          ? cardsByIndexRef.current.get(opPlayer.leader_index)
          : undefined
        if (leaderCard) {
          setOpponentPlayedCard(leaderCard)
          await new Promise((resolve) => setTimeout(resolve, 1500))
          setOpponentPlayedCard(null)
        }
      }

      await refreshState()
      if (data.user_id !== user?.id) {
        setStatusMsg(tRef.current.match.opponentUsedLeader)
      }
      if (data.leader_result?.type === 'reveal_hand' && Array.isArray(data.leader_result.cards)) {
        setRevealCards(data.leader_result.cards)
        setFsm({ mode: 'emhyr_reveal' })
      }
    })

    channel.listen('.match.game_end', (data: { winner_id: number | null; is_draw: boolean; cancelled?: boolean }) => {
      if (data.cancelled) {
        clearMatch()
        clearLobby()
        navigate(match?.mode === 'sandbox' ? '/' : '/lobby')
        return
      }

      handleGameEnded(data.winner_id, data.is_draw)
    })

    return () => {
      echo.leave(`match.${match.id}`)
    }
  }, [match?.id])

  const playMutation = useMutation({
    mutationFn: ({ cardIndex, row, targetIndex }: { cardIndex: number; row: RowKey; targetIndex?: number }) =>
      matchApi.playCard({ card_index: cardIndex, row, target_index: targetIndex }),
    onMutate: ({ cardIndex, row }) => {
      const card = cardsByIndexRef.current.get(cardIndex)
      playContextRef.current = {
        side: 'me',
        cardIndex,
        ability: card?.abilities.includes('muster') || card?.abilities.includes('cerys') ? 'muster' : null,
        decoyRow: card?.abilities.includes('decoy') ? row : null,
      }
    },
    onSuccess: (data) => {
      applyMatchResponse(data)
      if (data.pending_medic || data.match?.pending_medic) {
        setFsm({ mode: 'medic_select' })
        setStatusMsg(t.match.medicSelectHint)
      } else {
        setFsm({ mode: 'idle' })
        setStatusMsg('')
      }
    },
    onError: (err: unknown) => {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : null
      setStatusMsg(msg || t.match.errPlayCard)
    },
  })

  const medicMutation = useMutation({
    mutationFn: matchApi.medicResolve,
    onSuccess: (data) => {
      applyMatchResponse(data)
      setFsm({ mode: 'idle' })
      setStatusMsg('')
    },
    onError: (err: unknown) => {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : null
      setStatusMsg(msg || t.match.errMedic)
    },
  })

  const leaderMutation = useMutation({
    mutationFn: () => matchApi.useLeader(),
    onSuccess: (data) => {
      applyMatchResponse(data)
      setFsm({ mode: 'idle' })
      setStatusMsg('')
      const leaderResult = data.leader_result ?? (data.match.leader_result as LeaderResult | null)
      if (leaderResult?.type === 'reveal_hand' && Array.isArray(leaderResult.cards)) {
        setRevealCards(leaderResult.cards)
        setFsm({ mode: 'emhyr_reveal' })
      }
    },
    onError: (err: unknown) => {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : null
      setStatusMsg(msg || t.match.errLeader)
    },
  })

  const chooseFirstMutation = useMutation({
    mutationFn: matchApi.chooseFirst,
    onSuccess: (data) => {
      applyMatchResponse(data)
      setFsm({ mode: 'idle' })
      setStatusMsg('')
    },
    onError: (err: unknown) => {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : null
      setStatusMsg(msg || t.match.errChooseFirst)
    },
  })

  const passMutation = useMutation({
    mutationFn: matchApi.pass,
    onSuccess: (data) => {
      setStatusMsg(t.match.youPassed)
      showNotification('me-pass')
      applyMatchResponse(data)
    },
    onError: () => setStatusMsg(t.match.errPass),
  })

  const redrawMutation = useMutation({
    mutationFn: (handPos: number) => matchApi.redraw(handPos),
    onSuccess: (data) => {
      applyMatchResponse(data)
    },
    onError: () => setStatusMsg(t.match.errRedraw),
  })

  const redrawSkipMutation = useMutation({
    mutationFn: matchApi.redrawSkip,
    onSuccess: (data) => {
      applyMatchResponse(data)
    },
    onError: () => setStatusMsg(t.match.errRedrawSkip),
  })

  const leaveMutation = useMutation({
    mutationFn: async () => {
      if (match?.mode === 'sandbox') {
        await sandboxApi.leave()
        return
      }
      await lobbyApi.leave()
    },
    onSuccess: () => {
      clearMatch()
      clearLobby()
      navigate('/')
    },
    onError: () => setStatusMsg(t.match.errLeave),
  })

  const handleBackToMenu = () => {
    leaveMutation.mutate()
  }

  if (gameEnd) {
    return (
      <GameEndScreen
        winnerId={gameEnd.winnerId}
        isDraw={gameEnd.isDraw}
        me={gameEnd.me}
        opponent={gameEnd.opponent}
        roundHistory={gameEnd.roundHistory}
        onBackToMenu={() => navigate('/')}
      />
    )
  }

  if (!match) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gwent-gold text-xl">{loading ? t.match.loading : t.match.notFound}</div>
      </div>
    )
  }

  const myPlayer = match.players.find((p) => p.user_id === user?.id)
  const opponent = match.players.find((p) => p.user_id !== user?.id)
  const isMyTurn = match.current_player_id === user?.id

  const roundEndingMsg = localRoundEndingSeconds !== null
    ? t.match.roundEnding(localRoundEndingSeconds)
    : ''

  const selectedCard = fsm.mode === 'card_selected' || fsm.mode === 'decoy_select' ? fsm.cardIndex : null
  const selectedHandPos = fsm.mode === 'card_selected' || fsm.mode === 'decoy_select' ? fsm.handPos : null
  const selectedCardDefinition = selectedCard !== null ? cardsByIndex.get(selectedCard) : undefined
  const selectedCardIsSpy = fsm.mode === 'card_selected' && (selectedCardDefinition?.abilities.includes('spy') ?? false)
  const spyRow = selectedCardIsSpy ? (selectedCardDefinition?.row as RowKey | undefined) ?? null : null
  const selectedRows = selectedCardDefinition && fsm.mode === 'card_selected' && !selectedCardIsSpy
    ? selectableRowsForCard(selectedCardDefinition)
    : []

  const handleCardClick = (handPos: number, cardIndex: number) => {
    if (!isMyTurn || match.pending_medic) return
    if ((fsm.mode === 'card_selected' || fsm.mode === 'decoy_select') && fsm.handPos === handPos) {
      setFsm({ mode: 'idle' })
      setStatusMsg('')
      return
    }

    const card = cardsByIndex.get(cardIndex)
    if (card?.abilities.includes('decoy')) {
      setFsm({ mode: 'decoy_select', handPos, cardIndex })
      setStatusMsg(t.match.decoySelectHint)
      return
    }

    setFsm({ mode: 'card_selected', handPos, cardIndex })
    setStatusMsg('')
  }

  const handleRowClick = (row: RowKey) => {
    if (fsm.mode !== 'card_selected' || !isMyTurn) return
    playMutation.mutate({ cardIndex: fsm.cardIndex, row })
  }

  const handleBoardCardClick = (row: RowKey, targetIndex: number) => {
    if (fsm.mode !== 'decoy_select' || !isMyTurn) return
    playMutation.mutate({ cardIndex: fsm.cardIndex, row, targetIndex })
  }

  if (!myPlayer || !opponent) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gwent-gold text-xl">{t.match.invalidState}</div>
      </div>
    )
  }

  return (
    <MatchBoard
      match={match}
      me={myPlayer}
      opponent={opponent}
      cardsByIndex={cardsByIndex}
      isMyTurn={isMyTurn}
      selectedCard={selectedCard}
      selectedHandPos={selectedHandPos}
      selectedRows={selectedRows}
      spyRow={spyRow}
      decoySelect={fsm.mode === 'decoy_select'}
      statusMsg={roundEndingMsg || statusMsg}
      notificationName={notificationName}
      turnSecondsLeft={turnSecondsLeft}
      passPending={passMutation.isPending}
      leavePending={leaveMutation.isPending}
      medicChoices={match.grave_choices}
      medicPending={medicMutation.isPending}
      chooseFirstPending={chooseFirstMutation.isPending}
      revealCards={revealCards}
      muliganRemaining={myPlayer.redraw_remaining ?? 0}
      muliganPending={redrawMutation.isPending || redrawSkipMutation.isPending}
      animatingCards={animatingCards}
      ghostCards={ghostCards}
      arrivingBoard={arrivingBoard}
      arrivingHand={arrivingHand}
      flights={flights}
      opponentPlayedCard={opponentPlayedCard}
      onCardClick={handleCardClick}
      onRowClick={handleRowClick}
      onBoardCardClick={handleBoardCardClick}
      onMedicSelect={(gravePos) => medicMutation.mutate(gravePos)}
      onLeaderClick={() => {
        setFsm({ mode: 'leader_confirm' })
        leaderMutation.mutate()
      }}
      onChooseFirst={(preferFirst) => {
        setFsm({ mode: 'scoia_first_choice' })
        chooseFirstMutation.mutate(preferFirst)
      }}
      onCloseReveal={() => {
        setRevealCards([])
        setFsm({ mode: 'idle' })
      }}
      onPass={() => passMutation.mutate()}
      onLeave={handleBackToMenu}
      onMuliganSwap={(handPos) => redrawMutation.mutate(handPos)}
      onMuliganSkip={() => redrawSkipMutation.mutate()}
    />
  )
}

function selectableRowsForCard(card: CardDefinition): RowKey[] {
  if (card.abilities.includes('decoy')) return []
  if (card.row === 'agile') return ['close', 'ranged']
  if (ROWS.includes(card.row as RowKey)) return [card.row as RowKey]
  return ROWS
}
