import { useEffect, useState, useCallback, useRef } from 'react'
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
import { GameEndScreen } from '../components/match/GameEndScreen'
import { MatchBoard } from '../components/match/MatchBoard'
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

  const [fsm, setFsm] = useState<MatchFsm>({ mode: 'idle' })
  const [statusMsg, setStatusMsg] = useState('')
  const [notificationName, setNotificationName] = useState<string | null>(null)
  const [gameEnd, setGameEnd] = useState<GameEndInfo | null>(null)
  const [loading, setLoading] = useState(!match)
  const [turnSecondsLeft, setTurnSecondsLeft] = useState<number | null>(null)
  const [cardsByIndex, setCardsByIndex] = useState<Map<number, CardDefinition>>(() => new Map())
  const [revealCards, setRevealCards] = useState<number[]>([])
  const [animatingCards, setAnimatingCards] = useState<Map<number, string>>(() => new Map())
  const [ghostCards, setGhostCards] = useState<GhostCard[]>([])
  const [opponentPlayedCard, setOpponentPlayedCard] = useState<CardDefinition | null>(null)

  const syncTurnCalledRef = useRef(false)
  const latestMatchRef = useRef<GameMatch | null>(match)
  const cardsByIndexRef = useRef<Map<number, CardDefinition>>(new Map())
  const notifTimerRef = useRef<number | null>(null)
  const notifQueueRef = useRef<string[]>([])

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
      if (notifTimerRef.current !== null) {
        window.clearTimeout(notifTimerRef.current)
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

  const triggerCardAnimation = useCallback((cardIndex: number, animName: string, durationMs: number) => {
    setAnimatingCards((prev) => {
      const next = new Map(prev)
      next.set(cardIndex, animName)
      return next
    })
    setTimeout(() => {
      setAnimatingCards((prev) => {
        if (prev.get(cardIndex) !== animName) return prev
        const next = new Map(prev)
        next.delete(cardIndex)
        return next
      })
    }, durationMs)
  }, [])

  const applyMatchResponse = useCallback((data: {
    match?: GameMatch | null
    game_ended?: boolean
    winner_id?: number | null
    is_draw?: boolean
  }) => {
    const prevMatch = latestMatchRef.current

    if (data.match) {
      latestMatchRef.current = data.match as GameMatch
    }

    if (data.game_ended) {
      handleGameEnded(data.winner_id ?? null, data.is_draw ?? false)
      return
    }

    if (data.match) {
      const newMatch = data.match as GameMatch

      if (prevMatch && prevMatch.current_round === newMatch.current_round) {
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
          setTimeout(() => {
            setGhostCards((prev) => prev.filter((g) => !ghostIds.has(g.id)))
          }, 2100)
        }
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
  }, [setMatch, handleGameEnded, user?.id, showNotification])

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
      const data = await matchApi.getState()
      applyMatchResponse(data)
    } catch {
    }
  }, [applyMatchResponse])

  const syncTurn = useCallback(async () => {
    try {
      const data = await matchApi.syncTurn()
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

      const ownerKey = data.user_id === user?.id ? 'me' : 'op'
      const playerData = newMatch.players.find((p) =>
        ownerKey === 'me' ? p.user_id === user?.id : p.user_id !== user?.id
      )
      const row = data.row as RowKey

      if ((animName === 'bond') && playerData) {
        const rowCards = playerData.board_display[row] ?? []
        rowCards.forEach((bc) => {
          const c = cardsByIndexRef.current.get(bc.index)
          if (c?.abilities.includes('bond') || c?.abilities.includes('cerys')) {
            triggerCardAnimation(bc.index, 'bond', duration)
          }
        })
      } else if ((animName === 'horn' || animName === 'morale') && playerData) {
        const rowCards = playerData.board_display[row] ?? []
        rowCards.forEach((bc) => triggerCardAnimation(bc.index, animName, duration))
      } else if (animName === 'muster' && playerData) {
        const rowCards = playerData.board_display[row] ?? []
        rowCards.forEach((bc) => {
          const c = cardsByIndexRef.current.get(bc.index)
          if (c?.abilities.includes('muster') || c?.abilities.includes('cerys')) {
            triggerCardAnimation(bc.index, 'muster', duration)
          }
        })
      } else {
        triggerCardAnimation(data.card_id, animName, duration)
      }
    })

    channel.listen('.match.pass', async (data: { user_id: number }) => {
      if (data.user_id !== user?.id) {
        setStatusMsg('Соперник спасовал')
        showNotification('op-pass')
      } else {
        showNotification('me-pass')
      }
      await syncTurn()
    })

    channel.listen('.match.round_end', async (data: { round_winner_id: number | null; current_round: number }) => {
      // Уведомление итога раунда до обновления состояния, чтобы round-start встал в очередь после него
      if (data.round_winner_id === user?.id) {
        setStatusMsg(`Вы выиграли раунд! Раунд ${data.current_round}`)
        showNotification('win-round')
      } else if (data.round_winner_id) {
        setStatusMsg(`Соперник выиграл раунд. Раунд ${data.current_round}`)
        showNotification('lose-round')
      } else {
        setStatusMsg(`Ничья в раунде. Раунд ${data.current_round}`)
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
        setStatusMsg('Соперник использовал лидера')
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
    onSuccess: (data) => {
      applyMatchResponse(data)
      if (data.pending_medic || data.match?.pending_medic) {
        setFsm({ mode: 'medic_select' })
        setStatusMsg('Выберите карту из кладбища для медика')
      } else {
        setFsm({ mode: 'idle' })
        setStatusMsg('')
      }
    },
    onError: (err: unknown) => {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : null
      setStatusMsg(msg || 'Ошибка при разыгрывании карты')
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
      setStatusMsg(msg || 'Ошибка при выборе карты медика')
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
      setStatusMsg(msg || 'Ошибка при использовании лидера')
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
      setStatusMsg(msg || 'Ошибка при выборе первого хода')
    },
  })

  const passMutation = useMutation({
    mutationFn: matchApi.pass,
    onSuccess: (data) => {
      showNotification('me-pass')
      applyMatchResponse(data)
    },
    onError: () => setStatusMsg('Ошибка при пасе'),
  })

  const redrawMutation = useMutation({
    mutationFn: (handPos: number) => matchApi.redraw(handPos),
    onSuccess: (data) => {
      applyMatchResponse(data)
    },
    onError: () => setStatusMsg('Ошибка при замене карты'),
  })

  const redrawSkipMutation = useMutation({
    mutationFn: matchApi.redrawSkip,
    onSuccess: (data) => {
      applyMatchResponse(data)
    },
    onError: () => setStatusMsg('Ошибка при пропуске замены'),
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
    onError: () => setStatusMsg('Не удалось покинуть матч'),
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
        <div className="text-gwent-gold text-xl">{loading ? 'Загрузка матча...' : 'Матч не найден'}</div>
      </div>
    )
  }

  const myPlayer = match.players.find((p) => p.user_id === user?.id)
  const opponent = match.players.find((p) => p.user_id !== user?.id)
  const isMyTurn = match.current_player_id === user?.id

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
      setStatusMsg('Выберите свою негероическую карту на поле для Decoy')
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
        <div className="text-gwent-gold text-xl">Некорректное состояние матча</div>
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
      statusMsg={statusMsg}
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
