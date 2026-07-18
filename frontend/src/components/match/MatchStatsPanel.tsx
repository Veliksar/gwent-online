import type { MatchPlayer } from '../../api/match'
import { deckShieldImageUrl } from '../../utils/cardAssets'

const FACTION_NAMES: Record<string, string> = {
  realms: 'Северные королевства',
  nilfgaard: 'Нильфгаард',
  monsters: 'Чудовища',
  scoiatael: "Скоя'таэли",
  skellige: 'Скеллиге',
}

export function MatchStatsPanel({
  player,
  side,
  isCurrentTurn,
}: {
  player: MatchPlayer
  side: 'me' | 'op'
  isCurrentTurn: boolean
}) {
  const scoreClass =
    side === 'me' ? 'match-score-total match-score-total-me' : 'match-score-total match-score-total-op'

  return (
    <section className={`match-stats match-stats-${side} ${isCurrentTurn ? 'match-stats-current' : ''}`}>
      <div className="match-profile-img">
        <div>
          <div
            style={{ backgroundImage: `url('${deckShieldImageUrl(player.deck_faction)}')` }}
          />
        </div>
      </div>

      <div className={`match-name match-name-${side}`}>{player.nickname}</div>
      <div className={`match-deck-name match-deck-name-${side}`}>
        {FACTION_NAMES[player.deck_faction] ?? player.deck_faction}
      </div>

      <div className={`match-hand-count match-hand-count-${side}`}>{player.hand_count}</div>

      <div
        className={[
          'match-gem',
          `match-gem-${side}-1`,
          player.health >= 1 ? 'match-gem-on' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      />
      <div
        className={[
          'match-gem',
          `match-gem-${side}-2`,
          player.health >= 2 ? 'match-gem-on' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      />

      <div className={scoreClass}>
        <div>{player.round_score}</div>
      </div>

      {player.passed && <div className={`match-passed match-passed-${side}`}>Passed</div>}
    </section>
  )
}
