import { cardBackImageUrl } from '../../utils/cardAssets'

function backBackground(url: string): string {
  return `url("${url}"), radial-gradient(circle at 50% 50%, rgba(201, 162, 39, 0.32), transparent 42%), linear-gradient(135deg, rgba(201, 162, 39, 0.2), transparent), linear-gradient(145deg, #332119, #09080a)`
}

export function GwentCardBack({ faction = 'neutral' }: { faction?: string }) {
  return (
    <div
      className="card gwent-card-back"
      style={{ backgroundImage: backBackground(cardBackImageUrl(faction)) }}
    />
  )
}
