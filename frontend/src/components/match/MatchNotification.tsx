import { iconUrl } from '../../utils/cardAssets'

const NOTIFICATION_TEXT: Record<string, string> = {
  'me-pass': 'Round passed',
  'op-pass': 'Your opponent has passed',
  'win-round': 'You won the round!',
  'lose-round': 'Your opponent won the round',
  'draw-round': 'The round ended in a draw',
  'me-turn': 'Your turn!',
  'op-turn': "Opponent's turn",
  north: 'Northern Realms faction ability triggered - North draws an additional card.',
  monsters: 'Monsters faction ability triggered - one randomly-chosen Monster Unit Card stays on the board',
  scoiatael: "Opponent used the Scoia'tael faction perk to go first.",
  'skellige-me': 'Skellige Ability Triggered!',
  'skellige-op': 'Opponent Skellige Ability Triggered!',
}

const NOTIFICATION_ICON: Record<string, string> = {
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
  if (!name && !message) return null

  const iconName = name ? NOTIFICATION_ICON[name] ?? 'notif_round_start' : 'notif_round_start'

  return (
    <div id="notification-bar" className="match-notification-bar">
      <div
        id={name ? `notif-${name}` : undefined}
        style={{ backgroundImage: `url("${iconUrl(iconName)}")` }}
      >
        <span>{message || (name ? NOTIFICATION_TEXT[name] : '')}</span>
      </div>
    </div>
  )
}
