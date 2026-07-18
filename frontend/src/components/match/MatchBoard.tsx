import type { CardDefinition } from '../../api/cards'
import type { GameMatch, GraveChoice, MatchPlayer } from '../../api/match'
import { useEffect, useState } from 'react'
import { CardPreview } from './CardPreview'
import { GraveCarousel } from './GraveCarousel'
import { GraveViewCarousel } from './GraveViewCarousel'
import { MatchField, type GhostCard } from './MatchField'
import { MatchHand, MatchHandActions, OpponentHand } from './MatchHand'
import { MatchHeader } from './MatchHeader'
import { MatchLeaderCard } from './MatchLeaderCard'
import { MatchNotification } from './MatchNotification'
import { RevealCardsPopup, ScoiaFirstChoicePopup } from './MatchPopup'
import { MatchSidePanel } from './MatchSidePanel'
import { MatchStatsPanel } from './MatchStatsPanel'
import { MuliganOverlay } from './MuliganOverlay'

type RowKey = 'close' | 'ranged' | 'siege'

export function MatchBoard({
  match,
  me,
  opponent,
  cardsByIndex,
  isMyTurn,
  selectedCard,
  selectedHandPos,
  selectedRows,
  spyRow,
  decoySelect,
  statusMsg,
  notificationName,
  turnSecondsLeft,
  passPending,
  leavePending,
  medicChoices,
  medicPending,
  chooseFirstPending,
  revealCards,
  muliganRemaining,
  muliganPending,
  animatingCards,
  ghostCards,
  opponentPlayedCard,
  onCardClick,
  onRowClick,
  onBoardCardClick,
  onMedicSelect,
  onLeaderClick,
  onChooseFirst,
  onCloseReveal,
  onPass,
  onLeave,
  onMuliganSwap,
  onMuliganSkip,
}: {
  match: GameMatch
  me: MatchPlayer
  opponent: MatchPlayer
  cardsByIndex: Map<number, CardDefinition>
  isMyTurn: boolean
  selectedCard: number | null
  selectedHandPos: number | null
  selectedRows: RowKey[]
  spyRow: RowKey | null
  decoySelect: boolean
  statusMsg: string
  notificationName: string | null
  turnSecondsLeft: number | null
  passPending: boolean
  leavePending: boolean
  medicChoices: GraveChoice[]
  medicPending: boolean
  chooseFirstPending: boolean
  revealCards: number[]
  muliganRemaining: number
  muliganPending: boolean
  animatingCards: Map<string, string>
  ghostCards: GhostCard[]
  opponentPlayedCard?: CardDefinition | null
  onCardClick: (handPos: number, cardIndex: number) => void
  onRowClick: (row: RowKey) => void
  onBoardCardClick: (row: RowKey, cardIndex: number) => void
  onMedicSelect: (gravePos: number) => void
  onLeaderClick: () => void
  onChooseFirst: (preferFirst: boolean) => void
  onCloseReveal: () => void
  onPass: () => void
  onLeave: () => void
  onMuliganSwap: (handPos: number) => void
  onMuliganSkip: () => void
}) {
  const needsFirstChoice = match.scoiatael_first_choice_user_id === me.user_id

  const myLeaderCard = me.leader_index !== null ? cardsByIndex.get(me.leader_index) : undefined
  const opLeaderCard = opponent.leader_index !== null ? cardsByIndex.get(opponent.leader_index) : undefined

  const canUseLeader = isMyTurn
    && !me.leader_used
    && !me.leader_disabled
    && me.leader_activatable !== false
    && !match.pending_medic
  const [graveViewOwner, setGraveViewOwner] = useState<'me' | 'op' | null>(null)

  useEffect(() => {
    if (match.pending_medic) {
      setGraveViewOwner(null)
    }
  }, [match.pending_medic])

  useEffect(() => {
    if (graveViewOwner === 'me' && me.grave.length === 0) {
      setGraveViewOwner(null)
    }
    if (graveViewOwner === 'op' && opponent.grave.length === 0) {
      setGraveViewOwner(null)
    }
  }, [graveViewOwner, me.grave.length, opponent.grave.length])

  const graveViewGrave =
    graveViewOwner === 'me' ? me.grave : graveViewOwner === 'op' ? opponent.grave : []
  const graveViewLabel =
    graveViewOwner === 'me' ? me.nickname : graveViewOwner === 'op' ? opponent.nickname : ''

  return (
    <div className="match-screen">
      <MatchHeader
        currentRound={match.current_round}
        isMyTurn={isMyTurn}
        turnSecondsLeft={turnSecondsLeft}
        leavePending={leavePending}
        onLeave={onLeave}
      />

      <div className="match-board">
        {(notificationName || statusMsg) && (
          <MatchNotification name={notificationName} message={statusMsg} />
        )}

        <div className="match-panels">
          <aside className="match-panel-left">
            <div className="match-leader-area-op">
              <MatchLeaderCard
                leaderCard={opLeaderCard}
                leaderUsed={opponent.leader_used}
                leaderDisabled={opponent.leader_disabled}
                leaderActivatable={opponent.leader_activatable}
                canUse={false}
              />
            </div>

            <div className="match-stats-area-op">
              <MatchStatsPanel player={opponent} side="op" isCurrentTurn={!isMyTurn} />
            </div>

            <div className="match-weather-area">
              {(['close', 'ranged', 'siege'] as const).map((row) => {
                const icons: Record<string, string> = { close: 'frost', ranged: 'fog', siege: 'rain' }
                const active = match.weather[row]
                return (
                  <div key={row} className="match-weather-row">
                    <div
                      className={[
                        'match-weather-icon',
                        `match-weather-icon-${icons[row]}`,
                        active ? 'match-weather-icon-active' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    />
                  </div>
                )
              })}
            </div>

            <div className="match-stats-area-me">
              <MatchStatsPanel player={me} side="me" isCurrentTurn={isMyTurn} />
            </div>

            <div className="match-leader-area-me">
              <MatchLeaderCard
                leaderCard={myLeaderCard}
                leaderUsed={me.leader_used}
                leaderDisabled={me.leader_disabled}
                leaderActivatable={me.leader_activatable}
                canUse={canUseLeader}
                onClick={onLeaderClick}
              />
            </div>

            <MatchHandActions
              isMyTurn={isMyTurn}
              passPending={passPending}
              onPass={onPass}
            />
          </aside>

          <section className="match-panel-mid">
            <OpponentHand
              count={opponent.hand_count}
              faction={opponent.deck_faction}
              revealedCards={match.sandbox?.reveal_opponent_hand ? opponent.hand : undefined}
              cardsByIndex={match.sandbox?.reveal_opponent_hand ? cardsByIndex : undefined}
            />
            <MatchField
              match={match}
              opponent={opponent}
              me={me}
              cardsByIndex={cardsByIndex}
              isMyTurn={isMyTurn}
              selectedCard={selectedCard}
              selectedRows={selectedRows}
              spyRow={spyRow}
              decoySelect={decoySelect}
              animatingCards={animatingCards}
              ghostCards={ghostCards}
              onRowClick={onRowClick}
              onBoardCardClick={onBoardCardClick}
            />
            <MatchHand
              player={me}
              cardsByIndex={cardsByIndex}
              selectedHandPos={selectedHandPos}
              onCardClick={onCardClick}
            />
          </section>

          <MatchSidePanel
            opponent={opponent}
            me={me}
            cardsByIndex={cardsByIndex}
            graveViewDisabled={match.pending_medic}
            onViewGrave={setGraveViewOwner}
          />
        </div>

        {muliganRemaining > 0 && (
          <MuliganOverlay
            player={me}
            cardsByIndex={cardsByIndex}
            remaining={muliganRemaining}
            pending={muliganPending}
            onSwap={onMuliganSwap}
            onSkip={onMuliganSkip}
          />
        )}

        {match.pending_medic && (
          <GraveCarousel
            choices={medicChoices}
            cardsByIndex={cardsByIndex}
            pending={medicPending}
            onSelect={onMedicSelect}
          />
        )}

        {graveViewOwner && !match.pending_medic && (
          <GraveViewCarousel
            grave={graveViewGrave}
            cardsByIndex={cardsByIndex}
            ownerLabel={graveViewLabel}
            onClose={() => setGraveViewOwner(null)}
          />
        )}

        {needsFirstChoice && (
          <ScoiaFirstChoicePopup pending={chooseFirstPending} onChoose={onChooseFirst} />
        )}

        {revealCards.length > 0 && (
          <RevealCardsPopup cards={revealCards} cardsByIndex={cardsByIndex} onClose={onCloseReveal} />
        )}

        {opponentPlayedCard && (
          <div className="match-op-play-preview">
            <CardPreview card={opponentPlayedCard} />
          </div>
        )}
      </div>
    </div>
  )
}
