import { useEffect, useRef, useState } from 'react'

/**
 * Показание «оседает» на новом значении, как стрелка прибора.
 *
 * Число не подменяется анимацией: конечное значение всегда равно тому, что
 * посчитано из данных. Движение показывает только переход к нему.
 */

const ДЛИТЕЛЬНОСТЬ = 620

function замедление(доля: number): number {
  // Быстрый старт, мягкая остановка — так ведёт себя стрелка с успокоителем.
  return 1 - Math.pow(2, -9 * доля)
}

function движениеРазрешено(): boolean {
  if (typeof window === 'undefined') return false
  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function useПлавноеЧисло(цель: number): number {
  const [значение, установить] = useState(цель)
  const предыдущее = useRef(цель)
  const кадр = useRef(0)

  useEffect(() => {
    const от = предыдущее.current
    предыдущее.current = цель

    if (от === цель) return
    if (!движениеРазрешено()) {
      установить(цель)
      return
    }

    const начало = performance.now()
    const шаг = (сейчас: number) => {
      const доля = Math.min(1, (сейчас - начало) / ДЛИТЕЛЬНОСТЬ)
      установить(от + (цель - от) * замедление(доля))
      if (доля < 1) кадр.current = requestAnimationFrame(шаг)
      else установить(цель)
    }
    кадр.current = requestAnimationFrame(шаг)

    return () => cancelAnimationFrame(кадр.current)
  }, [цель])

  return значение
}

/**
 * Отклик на событие: возвращает признак, который держится заданное время.
 * Нужен, чтобы проиграть анимацию один раз и погасить её.
 */
export function useОтклик(мс = 900): [boolean, () => void] {
  const [активен, установить] = useState(false)
  const таймер = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => () => clearTimeout(таймер.current), [])

  const запустить = () => {
    if (!движениеРазрешено()) return
    установить(true)
    clearTimeout(таймер.current)
    таймер.current = setTimeout(() => установить(false), мс)
  }

  return [активен, запустить]
}
