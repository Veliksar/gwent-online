import type { CardDefinition } from '../../api/cards'
import { cardSmallImageUrl } from '../../utils/cardAssets'

export function MatchLeaderCard({
  leaderCard,
  leaderUsed,
  leaderDisabled,
  canUse,
  onClick,
}: {
  leaderCard?: CardDefinition
  leaderUsed: boolean
  leaderDisabled?: boolean
  canUse: boolean
  onClick?: () => void
}) {
  const bgImage = leaderCard
    ? `url('${cardSmallImageUrl(leaderCard)}')`
    : undefined

  const showActiveIcon = !leaderUsed && !leaderDisabled

  return (
    <div
      className={[
        'match-leader-box',
        canUse ? 'match-leader-box-available' : '',
        leaderUsed ? 'match-leader-box-used' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={canUse ? onClick : undefined}
      role={canUse ? 'button' : undefined}
      tabIndex={canUse ? 0 : undefined}
      onKeyDown={canUse ? (e) => e.key === 'Enter' && onClick?.() : undefined}
      title={leaderCard?.name}
    >
      <div className="match-leader-container">
        <div
          className="match-leader-card"
          style={{ backgroundImage: bgImage }}
        />
      </div>
      {showActiveIcon && (
        <div className="match-leader-active">
          <div />
        </div>
      )}
    </div>
  )
}
