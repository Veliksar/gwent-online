import { iconUrl } from '../../utils/cardAssets'
import { useT } from '../../i18n'

const NOTIFICATION_ICON: Record<string, string> = {
  'me-coin': 'notif_me_coin',
  'op-coin': 'notif_op_coin',
  'round-start': 'notif_round_start',
  'me-pass': 'notif_round_passed',
  'op-pass': 'notif_round_passed',
  'win-round': 'notif_win_round',
  'lose-round': 'notif_lose_round',
  'draw-round': 'notif_draw_round',
  'me-turn': 'notif_me_turn',
  'op-turn': 'notif_op_turn',
  north: 'notif_north',
  monsters: 'notif_monsters',
  scoiatael: 'notif_scoiatael',
  'skellige-me': 'notif_skellige',
  'skellige-op': 'notif_skellige',
}

export function MatchNotification({ name, message }: { name: string | null; message?: string }) {
  const t = useT()

  if (!name && !message) return null

  const iconName = name ? NOTIFICATION_ICON[name] ?? 'notif_round_start' : 'notif_round_start'
  const isPersistent = !name

  return (
    <div
      id="notification-bar"
      className={`match-notification-bar ${isPersistent ? 'match-notification-persistent' : ''}`}
    >
      <div
        id={name ? `notif-${name}` : undefined}
        style={{ backgroundImage: `url("${iconUrl(iconName)}")` }}
      >
        <span>{message || (name ? t.notifications[name] ?? '' : '')}</span>
      </div>
    </div>
  )
}
