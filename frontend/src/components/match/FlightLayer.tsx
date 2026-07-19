import type { CSSProperties } from 'react'
import type { CardDefinition } from '../../api/cards'
import { GwentCard } from './GwentCard'

// Прямоугольник в координатах доски (.match-board)
export interface FlightRect {
  x: number
  y: number
  w: number
  h: number
}

// Летящая карта (канон: translateTo, ~499ms)
export interface CardFlight {
  id: string
  card: CardDefinition
  power?: number
  from: FlightRect
  to: FlightRect
  // Затухание в конце полёта (row -> grave)
  fadeAtEnd?: boolean
}

export function FlightLayer({ flights }: { flights: CardFlight[] }) {
  if (flights.length === 0) return null

  return (
    <div className="match-flight-layer" aria-hidden="true">
      {flights.map((flight) => {
        const dx = flight.to.x + flight.to.w / 2 - (flight.from.x + flight.from.w / 2)
        const dy = flight.to.y + flight.to.h / 2 - (flight.from.y + flight.from.h / 2)
        const style: CSSProperties = {
          left: `${flight.from.x}px`,
          top: `${flight.from.y}px`,
          width: `${flight.from.w}px`,
          height: `${flight.from.h}px`,
          ['--fly-x' as string]: `${dx}px`,
          ['--fly-y' as string]: `${dy}px`,
        }
        return (
          <div
            key={flight.id}
            className={`match-flight ${flight.fadeAtEnd ? 'match-flight-fade' : ''}`}
            style={style}
          >
            <GwentCard card={flight.card} power={flight.power} />
          </div>
        )
      })}
    </div>
  )
}
