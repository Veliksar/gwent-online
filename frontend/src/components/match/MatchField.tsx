import { useEffect, useRef, useState } from 'react'
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
  arrivingBoard,
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
  animatingCards: Map<string, string>
  ghostCards: GhostCard[]
  arrivingBoard: Map<string, number>
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

  // Плавное появление спецкарты при установке в слот
  const prevSpecialRef = useRef(!!specialCard)
  const [specialEntering, setSpecialEntering] = useState(false)
  useEffect(() => {
    const had = prevSpecialRef.current
    prevSpecialRef.current = !!specialCard
    if (!had && specialCard) {
      setSpecialEntering(true)
      const timer = setTimeout(() => setSpecialEntering(false), 450)
      return () => clearTimeout(timer)
    }
  }, [specialCard])

  const weatherOverlay: Record<RowKey, string> = { close: 'frost', ranged: 'fog', siege: 'rain' }

  // Последние N экземпляров карты с прибывающим индексом скрыты — их «везёт» FlightLayer
  const hiddenSlots = new Set<number>()
  arrivingBoard.forEach((count, arrivalKey) => {
    const [aOwner, aRow, aIndexStr] = arrivalKey.split(':')
    if (aOwner !== ownerKey || aRow !== row) return
    const aIndex = Number(aIndexStr)
    let remaining = count
    for (let i = cards.length - 1; i >= 0 && remaining > 0; i--) {
      if (cards[i].index === aIndex && !hiddenSlots.has(i)) {
        hiddenSlots.add(i)
        remaining--
      }
    }
  })

  return (
    <div className={rowCls} onClick={canDrop ? onRowClick : undefined}>
      {weatherActive && (
        <div className={`match-row-weather match-row-weather-${weatherOverlay[row]}`} />
      )}
      <div className="match-row-score">{player.row_scores[row]}</div>
      <div className={specialCls}>
        {specialCard && (
          <div className={specialEntering ? 'gwent-card-special-entering' : ''}>
            <GwentCard card={specialCard} power={0} />
          </div>
        )}
      </div>
      <div className="match-row-cards" data-flyzone={`row_${ownerKey}_${row}`}>
        {cards.map((boardCard, index) => {
          const card = cardsByIndex.get(boardCard.index)
          const selectable = canSelectBoardCard && card && !card.abilities.includes('hero')
          const hidden = hiddenSlots.has(index)
          return card ? (
            <div
              key={`${owner}_${row}_${boardCard.index}_${index}`}
              className={hidden ? 'gwent-card-hidden-arrival' : undefined}
              data-arriving={hidden ? `${ownerKey}:${row}:${boardCard.index}` : undefined}
            >
              <GwentCard
                card={card}
                power={boardCard.power}
                weathered={weatherActive}
                animation={animatingCards.get(`${ownerKey}_${boardCard.index}`) ?? null}
                onClick={selectable ? () => onBoardCardClick?.(row, boardCard.index) : undefined}
              />
            </div>
          ) : (
            <CardChip key={`${owner}_${row}_${boardCard.index}_${index}`} card={boardCard} />
          )
        })}
        {rowGhosts.map((ghost) => {
          const card = cardsByIndex.get(ghost.cardIndex)
          return card ? (
            <div key={ghost.id} className="gwent-card-ghost" data-ghost-id={ghost.id}>
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
  arrivingBoard,
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
  animatingCards: Map<string, string>
  ghostCards: GhostCard[]
  arrivingBoard: Map<string, number>
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
            arrivingBoard={arrivingBoard}
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
            arrivingBoard={arrivingBoard}
            onRowClick={() => onRowClick(row)}
            onBoardCardClick={onBoardCardClick}
          />
        ))}
      </section>
    </section>
  )
}
