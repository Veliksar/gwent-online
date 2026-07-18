import type { CardDefinition } from '../../api/cards'
import type { BoardDisplayCard, GameMatch, MatchPlayer } from '../../api/match'
import { GwentCard } from './GwentCard'

type RowKey = 'close' | 'ranged' | 'siege'

export interface GhostCard {
  id: string
  cardIndex: number
  owner: 'me' | 'op'
  row: RowKey
  power: number
}

function CardChip({ card }: { card: BoardDisplayCard }) {
  return (
    <div className="match-card-chip">
      <strong>{card.power}</strong>
    </div>
  )
}

function MatchRow({
  row,
  player,
  owner,
  match,
  cardsByIndex,
  canDrop,
  canSelectBoardCard,
  animatingCards,
  ghostCards,
  onRowClick,
  onBoardCardClick,
}: {
  row: RowKey
  player: MatchPlayer
  owner: 'me' | 'opponent'
  match: GameMatch
  cardsByIndex: Map<number, CardDefinition>
  canDrop: boolean
  canSelectBoardCard: boolean
  animatingCards: Map<number, string>
  ghostCards: GhostCard[]
  onRowClick?: () => void
  onBoardCardClick?: (row: RowKey, cardIndex: number) => void
}) {
  const key = `${player.user_id}_${row}`
  const weatherActive = match.weather[row]
  const hornActive = !!match.horns[key] || !!match.leader_horns[key]
  const mardroemeActive = !!match.mardroeme_rows[key]
  const cards = player.board_display[row] ?? []
  const ownerKey = owner === 'me' ? 'me' : 'op'
  const rowGhosts = ghostCards.filter((g) => g.owner === ownerKey && g.row === row)

  const rowCls = [
    'match-field-row',
    weatherActive ? 'match-row-weather-active' : '',
    canDrop ? 'match-row-selectable' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const specialCls = [
    'match-row-special',
    hornActive ? 'match-row-horn-active match-row-horn-glow' : '',
  ]
    .filter(Boolean)
    .join(' ')

  // Канон (Card.isSpecial): в спец-слоте ряда лежит Commander's Horn (5) или Mardroeme (202)
  const specialCard = hornActive
    ? cardsByIndex.get(5)
    : mardroemeActive
      ? cardsByIndex.get(202)
      : undefined

  const weatherOverlay: Record<RowKey, string> = { close: 'frost', ranged: 'fog', siege: 'rain' }

  return (
    <div className={rowCls} onClick={canDrop ? onRowClick : undefined}>
      {weatherActive && (
        <div className={`match-row-weather match-row-weather-${weatherOverlay[row]}`} />
      )}
      <div className="match-row-score">{player.row_scores[row]}</div>
      <div className={specialCls}>
        {specialCard && (
          <GwentCard card={specialCard} power={0} />
        )}
      </div>
      <div className="match-row-cards">
        {cards.map((boardCard, index) => {
          const card = cardsByIndex.get(boardCard.index)
          const selectable = canSelectBoardCard && card && !card.abilities.includes('hero')
          return card ? (
            <GwentCard
              key={`${owner}_${row}_${boardCard.index}_${index}`}
              card={card}
              power={boardCard.power}
              weathered={weatherActive}
              animation={animatingCards.get(boardCard.index) ?? null}
              onClick={selectable ? () => onBoardCardClick?.(row, boardCard.index) : undefined}
            />
          ) : (
            <CardChip key={`${owner}_${row}_${boardCard.index}_${index}`} card={boardCard} />
          )
        })}
        {rowGhosts.map((ghost) => {
          const card = cardsByIndex.get(ghost.cardIndex)
          return card ? (
            <div key={ghost.id} className="gwent-card-ghost">
              <GwentCard card={card} power={ghost.power} animation="scorch" />
            </div>
          ) : null
        })}
      </div>
    </div>
  )
}

export function MatchField({
  match,
  opponent,
  me,
  cardsByIndex,
  isMyTurn,
  selectedCard,
  selectedRows,
  spyRow,
  decoySelect,
  animatingCards,
  ghostCards,
  onRowClick,
  onBoardCardClick,
}: {
  match: GameMatch
  opponent: MatchPlayer
  me: MatchPlayer
  cardsByIndex: Map<number, CardDefinition>
  isMyTurn: boolean
  selectedCard: number | null
  selectedRows: RowKey[]
  spyRow: RowKey | null
  decoySelect: boolean
  animatingCards: Map<number, string>
  ghostCards: GhostCard[]
  onRowClick: (row: RowKey) => void
  onBoardCardClick: (row: RowKey, cardIndex: number) => void
}) {
  return (
    <section className="match-field-wrap">
      <section className="match-field match-field-op">
        {(['siege', 'ranged', 'close'] as const).map((row) => (
          <MatchRow
            key={`op_${row}`}
            row={row}
            player={opponent}
            owner="opponent"
            match={match}
            cardsByIndex={cardsByIndex}
            canDrop={isMyTurn && spyRow === row && selectedCard !== null}
            canSelectBoardCard={false}
            animatingCards={animatingCards}
            ghostCards={ghostCards}
            onRowClick={() => onRowClick(row)}
          />
        ))}
      </section>

      <div className="match-field-divider" />

      <section className="match-field match-field-me">
        {(['close', 'ranged', 'siege'] as const).map((row) => (
          <MatchRow
            key={`me_${row}`}
            row={row}
            player={me}
            owner="me"
            match={match}
            cardsByIndex={cardsByIndex}
            canDrop={isMyTurn && selectedCard !== null && selectedRows.includes(row)}
            canSelectBoardCard={isMyTurn && decoySelect}
            animatingCards={animatingCards}
            ghostCards={ghostCards}
            onRowClick={() => onRowClick(row)}
            onBoardCardClick={onBoardCardClick}
          />
        ))}
      </section>
    </section>
  )
}
