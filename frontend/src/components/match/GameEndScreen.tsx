import type { GameMatch, MatchPlayer } from '../../api/match'
import { useT } from '../../i18n'

export function GameEndScreen({
  winnerId,
  isDraw,
  me,
  opponent,
  roundHistory,
  onBackToMenu,
}: {
  winnerId: number | null
  isDraw: boolean
  me?: MatchPlayer | null
  opponent?: MatchPlayer | null
  roundHistory: GameMatch['round_history']
  onBackToMenu: () => void
}) {
  const t = useT()
  const resultClass = isDraw ? 'end-draw' : winnerId === me?.user_id ? 'end-win' : 'end-lose'
  const rows = [
    { player: me, title: me?.nickname ?? t.match.youFallback },
    { player: opponent, title: opponent?.nickname ?? t.match.opponentFallback },
  ]

  return (
    <div id="end-screen" className="match-end-screen">
      <div className={resultClass} />
      <table>
        <tbody>
          <tr>
            <th />
            <th>{t.match.round(1)}</th>
            <th>{t.match.round(2)}</th>
            <th>{t.match.round(3)}</th>
            <th>{t.match.gems}</th>
          </tr>
          {rows.map(({ player, title }) => (
            <tr key={title}>
              <td>{title}</td>
              {[0, 1, 2].map((roundIndex) => {
                const round = roundHistory[roundIndex]
                const score = player?.user_id !== null && player?.user_id !== undefined && round
                  ? round.scores[String(player.user_id)] ?? 0
                  : 0
                const won = round?.winner_id === player?.user_id

                return (
                  <td key={roundIndex} className={won ? 'match-end-round-won' : undefined}>
                    {score}
                  </td>
                )
              })}
              <td>{player?.health ?? 0}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {isDraw && <p>{t.match.matchDraw}</p>}
      <button type="button" onClick={onBackToMenu}>
        {t.match.menu}
      </button>
    </div>
  )
}
