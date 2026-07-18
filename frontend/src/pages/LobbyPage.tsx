import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { lobbyApi } from '../api/lobby'
import { matchApi, type GameMatch } from '../api/match'
import { useLobbyStore } from '../stores/lobbyStore'
import { useMatchStore } from '../stores/matchStore'
import { useAuthStore } from '../stores/authStore'
import DeckSelector from '../components/DeckSelector'
import { getEcho } from '../services/echo'

export default function LobbyPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { room, roomCode, setRoom, clearLobby } = useLobbyStore()
  const { setMatch } = useMatchStore()
  const [joinCode, setJoinCode] = useState('')
  const [error, setError] = useState('')
  const channelRef = useRef<ReturnType<ReturnType<typeof getEcho>['private']> | null>(null)
  const autoStartAttemptedRef = useRef(false)
  const navigatingRef = useRef(false)
  const prevRoomStatusRef = useRef<string | null>(null)

  const navigateToMatch = useCallback(async () => {
    if (navigatingRef.current) return
    navigatingRef.current = true
    try {
      const stateData = await matchApi.getState()
      if (stateData.match) {
        setMatch(stateData.match as GameMatch)
        navigate('/match')
        return
      }

      try {
        await lobbyApi.leave()
      } catch {
      }
      prevRoomStatusRef.current = null
      clearLobby()
      setError('Матч не найден или уже завершён')
    } catch {
      setError('Не удалось загрузить матч')
    } finally {
      navigatingRef.current = false
    }
  }, [setMatch, navigate, clearLobby])

  const { refetch: checkCurrentLobby } = useQuery({
    queryKey: ['currentLobby'],
    queryFn: lobbyApi.getCurrent,
    enabled: false,
  })

  const refreshLobby = useCallback(async () => {
    const { data } = await checkCurrentLobby()

    if (!data?.room) {
      prevRoomStatusRef.current = null
      clearLobby()
      return
    }

    const prevStatus = prevRoomStatusRef.current
    prevRoomStatusRef.current = data.room.status

    if (data.room.status === 'started') {
      if (prevStatus === 'ready' || prevStatus === 'waiting') {
        await navigateToMatch()
        return
      }

      setRoom(data.room, data.room_code ?? roomCode)
      return
    }

    setRoom(data.room, data.room_code ?? roomCode)
  }, [checkCurrentLobby, roomCode, setRoom, clearLobby, navigateToMatch])

  useEffect(() => {
    checkCurrentLobby().then(({ data }) => {
      if (data?.room) {
        prevRoomStatusRef.current = data.room.status
        setRoom(data.room, data.room_code)
      }
    })
  }, [])

  const isUserReady = room?.members.find((m) => m.user_id === user?.id)?.ready
  const hasDeck = room?.members.find((m) => m.user_id === user?.id)?.has_deck
  const allReady = Boolean(room?.members.every((m) => m.ready) && room?.members.length === 2)
  const isHost = room?.host_user_id === user?.id
  const hostNickname = room?.members.find((m) => m.user_id === room?.host_user_id)?.nickname

  useEffect(() => {
    if (allReady && !isHost) {
      refreshLobby()
    }
  }, [allReady, isHost, refreshLobby])

  useEffect(() => {
    if (!room || room.status === 'started') return

    const pollMs = allReady && !isHost ? 1500 : 5000
    const interval = setInterval(() => {
      refreshLobby()
    }, pollMs)

    return () => clearInterval(interval)
  }, [room?.id, refreshLobby, allReady, isHost])

  useEffect(() => {
    if (!room) {
      if (channelRef.current) {
        getEcho().leave(`lobby.${channelRef.current}`)
        channelRef.current = null
      }
      return
    }

    const echo = getEcho()
    const channel = echo.private(`lobby.${room.id}`)
    channelRef.current = channel as unknown as ReturnType<ReturnType<typeof getEcho>['private']>

    channel.listen('.lobby.joined', async () => {
      await refreshLobby()
    })

    channel.listen('.lobby.left', async () => {
      await refreshLobby()
    })

    channel.listen('.lobby.ready', async () => {
      await refreshLobby()
    })

    channel.listen('.lobby.start', async () => {
      await navigateToMatch()
    })

    return () => {
      echo.leave(`lobby.${room.id}`)
      channelRef.current = null
    }
  }, [room?.id, refreshLobby, navigateToMatch])

  const getErrorMessage = (err: unknown, fallback: string) => {
    if (err && typeof err === 'object' && 'response' in err) {
      const response = (err as { response?: { data?: { message?: string } } }).response
      if (response?.data?.message) {
        return response.data.message
      }
    }
    return fallback
  }

  const joinMutation = useMutation({
    mutationFn: async () => {
      try {
        await lobbyApi.leave()
      } catch {
      }
      return lobbyApi.join()
    },
    onSuccess: (data) => {
      setRoom(data.room)
      setError('')
    },
    onError: (err) => setError(getErrorMessage(err, 'Не удалось найти игру')),
  })

  const joinByCodeMutation = useMutation({
    mutationFn: async (code: string) => {
      try {
        await lobbyApi.leave()
      } catch {
      }
      return lobbyApi.joinByCode(code)
    },
    onSuccess: (data) => {
      setRoom(data.room)
      setError('')
    },
    onError: (err) => setError(getErrorMessage(err, 'Неверный код комнаты')),
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      try {
        await lobbyApi.leave()
      } catch {
      }
      return lobbyApi.create()
    },
    onSuccess: (data) => {
      setRoom(data.room, data.room_code)
      setError('')
    },
    onError: (err) => setError(getErrorMessage(err, 'Не удалось создать комнату')),
  })

  const leaveMutation = useMutation({
    mutationFn: lobbyApi.leave,
    onSuccess: () => {
      prevRoomStatusRef.current = null
      navigatingRef.current = false
      autoStartAttemptedRef.current = false
      clearLobby()
      setError('')
    },
    onError: (err) => setError(getErrorMessage(err, 'Не удалось покинуть лобби')),
  })

  const readyMutation = useMutation({
    mutationFn: lobbyApi.setReady,
    onSuccess: (data) => {
      setRoom(data.room, roomCode)
    },
  })

  const startMutation = useMutation({
    mutationFn: matchApi.start,
    onSuccess: (data) => {
      setMatch(data.match)
      navigate('/match')
    },
    onError: () => {
      autoStartAttemptedRef.current = false
      setError('Не удалось начать матч')
    },
  })

  useEffect(() => {
    if (!room || !isHost || !allReady || room.status !== 'ready') {
      if (!allReady) {
        autoStartAttemptedRef.current = false
      }
      return
    }

    if (autoStartAttemptedRef.current || startMutation.isPending) return

    autoStartAttemptedRef.current = true
    startMutation.mutate()
  }, [room?.id, room?.status, isHost, allReady])

  const handleJoinByCode = () => {
    if (joinCode.length === 6) {
      joinByCodeMutation.mutate(joinCode.toUpperCase())
    }
  }

  if (!room) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="panel max-w-md w-full">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gwent-gold">Онлайн игра</h1>
            <Link to="/" className="btn-secondary text-sm">
              Назад
            </Link>
          </div>

          {error && (
            <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-2 rounded mb-4">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <button
              onClick={() => joinMutation.mutate()}
              className="btn-gold w-full py-4"
              disabled={joinMutation.isPending}
            >
              {joinMutation.isPending ? 'Поиск...' : 'Найти игру'}
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gwent-border"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-gwent-dark text-gray-400">или</span>
              </div>
            </div>

            <button
              onClick={() => createMutation.mutate()}
              className="btn-secondary w-full py-3"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? 'Создание...' : 'Создать приватную комнату'}
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gwent-border"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-gwent-dark text-gray-400">или войти по код</span>
              </div>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                className="input-field uppercase text-center tracking-widest"
                placeholder="ABCDEF"
                maxLength={6}
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              />
              <button
                onClick={handleJoinByCode}
                className="btn-secondary px-6"
                disabled={joinCode.length !== 6 || joinByCodeMutation.isPending}
              >
                Войти
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (room.status === 'started') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="panel max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-gwent-gold mb-4">Незавершённый матч</h1>
          <p className="text-gray-400 text-sm mb-6">
            В базе сохранена предыдущая игра. Продолжите с того же места или покиньте матч, чтобы начать заново.
          </p>

          <div className="space-y-3">
            <button
              onClick={() => navigateToMatch()}
              className="btn-gold w-full py-4"
            >
              Продолжить матч
            </button>
            <button
              onClick={() => leaveMutation.mutate()}
              className="btn-secondary w-full py-3"
              disabled={leaveMutation.isPending}
            >
              {leaveMutation.isPending ? 'Выход...' : 'Покинуть матч'}
            </button>
            <Link to="/" className="btn-secondary w-full py-3 block">
              В главное меню
            </Link>
          </div>

          {error && (
            <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-2 rounded mt-4">
              {error}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="panel max-w-lg w-full">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gwent-gold">Лобби</h1>
          <button
            onClick={() => leaveMutation.mutate()}
            className="btn-secondary text-sm"
            disabled={leaveMutation.isPending}
          >
            Покинуть
          </button>
        </div>

        {roomCode && (
          <div className="bg-gwent-card border border-gwent-border rounded p-4 mb-6 text-center">
            <div className="text-sm text-gray-400 mb-1">Код комнаты</div>
            <div className="text-3xl font-bold text-gwent-gold tracking-widest">{roomCode}</div>
            <div className="text-xs text-gray-500 mt-1">Поделитесь этим кодом с другом</div>
          </div>
        )}

        <div className="space-y-3 mb-6">
          <div className="text-sm text-gray-400 mb-2">Игроки ({room.members.length}/2)</div>
          {room.members.map((member) => (
            <div
              key={member.user_id}
              className={`flex items-center justify-between p-3 rounded border ${
                member.ready
                  ? 'bg-green-900/20 border-green-700'
                  : 'bg-gwent-card border-gwent-border'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gwent-border rounded-full flex items-center justify-center">
                  {member.nickname.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-medium">{member.nickname}</div>
                  <div className="text-xs text-gray-400">
                    {member.user_id === user?.id
                      ? isHost
                        ? 'Вы · Хост'
                        : 'Вы'
                      : member.user_id === room.host_user_id
                        ? 'Хост'
                        : 'Соперник'}
                  </div>
                </div>
              </div>
              <div
                className={`text-sm ${
                  member.ready ? 'text-green-400' : 'text-gray-400'
                }`}
              >
                {member.ready ? 'Готов' : 'Ожидание...'}
              </div>
            </div>
          ))}

          {room.members.length < 2 && (
            <div className="flex items-center justify-center p-3 rounded border border-dashed border-gwent-border text-gray-500">
              Ожидание соперника...
            </div>
          )}
        </div>

        <div className="mb-4">
          <DeckSelector
            onSaved={(updatedRoom) => {
              if (updatedRoom) {
                setRoom(updatedRoom, roomCode)
              } else {
                refreshLobby()
              }
            }}
          />
        </div>

        <div className="space-y-3">
          <button
            onClick={() => readyMutation.mutate(!isUserReady)}
            className={isUserReady ? 'btn-secondary w-full py-3' : 'btn-gold w-full py-3'}
            disabled={readyMutation.isPending || !hasDeck}
            title={!hasDeck ? 'Сначала выберите колоду' : undefined}
          >
            {isUserReady ? 'Отменить готовность' : hasDeck ? 'Готов' : 'Выберите колоду'}
          </button>

          {allReady && isHost && (
            <div className="text-center py-3 text-gwent-gold">
              {startMutation.isPending ? 'Запуск матча...' : 'Оба игрока готовы - матч запускается автоматически'}
            </div>
          )}

          {allReady && !isHost && (
            <div className="text-center py-3">
              <p className="text-sm text-gray-300 animate-pulse">
                Ожидайте начала матча{hostNickname ? ` от ${hostNickname}` : ''}...
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Переход в игру произойдёт автоматически
              </p>
            </div>
          )}

          {allReady && isHost && startMutation.isError && (
            <button
              onClick={() => {
                autoStartAttemptedRef.current = false
                startMutation.mutate()
              }}
              className="btn-gold w-full py-4 text-lg"
              disabled={startMutation.isPending}
            >
              {startMutation.isPending ? 'Запуск...' : 'Начать матч'}
            </button>
          )}
        </div>

        {error && (
          <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-2 rounded mt-4">
            {error}
          </div>
        )}
      </div>
    </div>
  )
}
