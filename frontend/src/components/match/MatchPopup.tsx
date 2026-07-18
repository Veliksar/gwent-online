import type { CardDefinition } from '../../api/cards'
import { cardLargeImageUrl } from '../../utils/cardAssets'

export function ScoiaFirstChoicePopup({
  pending,
  onChoose,
}: {
  pending: boolean
  onChoose: (preferFirst: boolean) => void
}) {
  return (
    <div className="match-popup" role="dialog" aria-modal="true">
      <div className="match-popup-card">
        <h2>Скоя'таэли выбирают первый ход</h2>
        <p>Выберите, начинать ли первый раунд.</p>
        <div className="match-popup-actions">
          <button type="button" disabled={pending} onClick={() => onChoose(true)}>Ходить первым</button>
          <button type="button" disabled={pending} onClick={() => onChoose(false)}>Ходить вторым</button>
        </div>
      </div>
    </div>
  )
}

export function RevealCardsPopup({
  cards,
  cardsByIndex,
  onClose,
}: {
  cards: number[]
  cardsByIndex: Map<number, CardDefinition>
  onClose: () => void
}) {
  return (
    <div className="match-popup" role="dialog" aria-modal="true">
      <div className="match-popup-card match-popup-card-wide">
        <h2>Карты соперника</h2>
        <div className="match-reveal-cards">
          {cards.map((index, pos) => {
            const card = cardsByIndex.get(index)
            return (
              <div
                key={`${index}_${pos}`}
                className="card-lg match-reveal-card"
                style={card ? { backgroundImage: `url("${cardLargeImageUrl(card)}")` } : undefined}
              >
                {!card && <span>{index}</span>}
              </div>
            )
          })}
        </div>
        <div className="match-popup-actions">
          <button type="button" onClick={onClose}>Закрыть</button>
        </div>
      </div>
    </div>
  )
}
