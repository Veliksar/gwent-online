function formatTurnTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

export function MatchHeader({
  currentRound,
  isMyTurn,
  turnSecondsLeft,
  leavePending,
  onLeave,
}: {
  currentRound: number
  isMyTurn: boolean
  turnSecondsLeft: number | null
  leavePending: boolean
  onLeave: () => void
}) {
  return (
    <>
      <header className="match-header">
        <h1>Раунд {currentRound}</h1>
        <span className={isMyTurn ? 'match-turn match-turn-me' : 'match-turn'}>
          {isMyTurn ? 'Ваш ход' : 'Ход соперника'}
        </span>
        {turnSecondsLeft !== null && (
          <span className={turnSecondsLeft <= 30 ? 'match-timer match-timer-urgent' : 'match-timer'}>
            {formatTurnTime(turnSecondsLeft)}
          </span>
        )}
      </header>
      <button
        type="button"
        onClick={onLeave}
        className="match-leave-button"
        disabled={leavePending}
      >
        {leavePending ? 'Exit...' : 'Exit'}
      </button>
    </>
  )
}
