import { useT } from '../../i18n'
import LanguageSwitcher from '../LanguageSwitcher'

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
  const t = useT()

  return (
    <>
      <header className="match-header">
        <h1>{t.match.round(currentRound)}</h1>
        <span className={isMyTurn ? 'match-turn match-turn-me' : 'match-turn'}>
          {isMyTurn ? t.match.yourTurn : t.match.opponentTurn}
        </span>
        {turnSecondsLeft !== null && (
          <span className={turnSecondsLeft <= 30 ? 'match-timer match-timer-urgent' : 'match-timer'}>
            {formatTurnTime(turnSecondsLeft)}
          </span>
        )}
        <span className="match-header-lang">
          <LanguageSwitcher compact />
        </span>
      </header>
      <button
        type="button"
        onClick={onLeave}
        className="match-leave-button"
        disabled={leavePending}
      >
        {leavePending ? t.match.exiting : t.match.exit}
      </button>
    </>
  )
}
