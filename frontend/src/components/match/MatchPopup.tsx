import type { CardDefinition } from '../../api/cards'
import { cardLargeImageUrl } from '../../utils/cardAssets'
import { useT } from '../../i18n'

export function ScoiaFirstChoicePopup({
  pending,
  onChoose,
}: {
  pending: boolean
  onChoose: (preferFirst: boolean) => void
}) {
  const t = useT()

  return (
    <div className="match-popup" role="dialog" aria-modal="true">
      <div className="match-popup-card">
        <h2>{t.match.scoiaChoiceTitle}</h2>
        <p>{t.match.scoiaChoiceText}</p>
        <div className="match-popup-actions">
          <button type="button" disabled={pending} onClick={() => onChoose(true)}>{t.match.goFirst}</button>
          <button type="button" disabled={pending} onClick={() => onChoose(false)}>{t.match.goSecond}</button>
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
  const t = useT()

  return (
    <div className="match-popup" role="dialog" aria-modal="true">
      <div className="match-popup-card match-popup-card-wide">
        <h2>{t.match.revealTitle}</h2>
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
          <button type="button" onClick={onClose}>{t.common.close}</button>
        </div>
      </div>
    </div>
  )
}
