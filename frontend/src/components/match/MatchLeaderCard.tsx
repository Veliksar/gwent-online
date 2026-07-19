import type { CardDefinition } from '../../api/cards'
import { cardSmallImageUrl } from '../../utils/cardAssets'
import { translateCardName, useLanguage } from '../../i18n'
import { CardPreview } from './CardPreview'

export function MatchLeaderCard({
  leaderCard,
  leaderUsed,
  leaderDisabled,
  leaderActivatable = true,
  canUse,
  onClick,
}: {
  leaderCard?: CardDefinition
  leaderUsed: boolean
  leaderDisabled?: boolean
  leaderActivatable?: boolean
  canUse: boolean
  onClick?: () => void
}) {
  const language = useLanguage()
  const bgImage = leaderCard
    ? `url('${cardSmallImageUrl(leaderCard)}')`
    : undefined

  // Канон: значок активации только у лидеров с активируемой способностью
  const showActiveIcon = !leaderUsed && !leaderDisabled && leaderActivatable

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
      title={leaderCard ? translateCardName(leaderCard.name, language) : undefined}
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
      {leaderCard && <CardPreview card={leaderCard} />}
    </div>
  )
}
