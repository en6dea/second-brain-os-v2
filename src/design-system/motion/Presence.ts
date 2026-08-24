import { useEffect, useState } from 'react'

/**
 * Держит блок смонтированным на время анимации закрытия.
 *
 * Без этого React убирает элемент из DOM в тот же кадр, когда `открыто`
 * становится ложным, — анимация исчезновения просто не успевает
 * проиграться. Раскрытие остаётся мгновенной реакцией на `открыто`;
 * закрытие ждёт `onAnimationEnd` с последнего проигранного элемента.
 */
export function useПрисутствие(открыто: boolean): {
  смонтировано: boolean
  закрывается: boolean
  наОкончание: () => void
} {
  const [смонтировано, установитьСмонтировано] = useState(открыто)
  const [закрывается, установитьЗакрывается] = useState(false)

  useEffect(() => {
    if (открыто) {
      установитьСмонтировано(true)
      установитьЗакрывается(false)
    } else if (смонтировано) {
      установитьЗакрывается(true)
      // Animation events are not guaranteed: the stylesheet may be late,
      // an animation can be cancelled, or the user can reduce motion. Keep
      // the visual exit, but never leave an invisible modal mounted forever.
      const предохранитель = window.setTimeout(
        () => установитьСмонтировано(false),
        250,
      )
      return () => window.clearTimeout(предохранитель)
    }
  }, [открыто, смонтировано])

  function наОкончание() {
    if (!открыто) установитьСмонтировано(false)
  }

  return { смонтировано, закрывается, наОкончание }
}
