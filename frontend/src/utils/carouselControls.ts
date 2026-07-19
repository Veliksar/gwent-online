import { useEffect, useRef } from 'react'

/**
 * Клавиатура для каруселей: стрелки — перебор, Enter — подтверждение,
 * Escape — закрытие (если обработчик передан).
 */
export function useCarouselKeys({
  onPrev,
  onNext,
  onConfirm,
  onClose,
}: {
  onPrev: () => void
  onNext: () => void
  onConfirm?: () => void
  onClose?: () => void
}) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        onPrev()
      } else if (event.key === 'ArrowRight') {
        event.preventDefault()
        onNext()
      } else if (event.key === 'Enter' && onConfirm) {
        event.preventDefault()
        onConfirm()
      } else if (event.key === 'Escape' && onClose) {
        event.preventDefault()
        onClose()
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onPrev, onNext, onConfirm, onClose])
}

/**
 * Колесо мыши как пошаговый перебор карусели. Аккумулирует дельту,
 * чтобы тачпады (много мелких событий) не проматывали по несколько карт.
 */
export function useWheelStep(onStep: (direction: 1 | -1) => void, threshold = 40) {
  const accRef = useRef(0)
  const stepRef = useRef(onStep)
  stepRef.current = onStep

  return (event: React.WheelEvent) => {
    accRef.current += event.deltaY
    if (accRef.current >= threshold) {
      accRef.current = 0
      stepRef.current(1)
    } else if (accRef.current <= -threshold) {
      accRef.current = 0
      stepRef.current(-1)
    }
  }
}

/**
 * Вертикальное колесо над горизонтально прокручиваемым контейнером
 * (рука, ряды поля) прокручивает его по горизонтали.
 */
export function horizontalWheelScroll(event: React.WheelEvent<HTMLElement>) {
  const el = event.currentTarget
  if (el.scrollWidth <= el.clientWidth) return
  if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
    el.scrollLeft += event.deltaY
  }
}
