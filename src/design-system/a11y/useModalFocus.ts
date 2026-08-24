import { useEffect, useRef, type RefObject } from 'react'

const ФОКУСИРУЕМЫЕ = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

const модальныеСлои: symbol[] = []
let исходноеПереполнениеСтраницы: string | null = null

/** Нужен глобальным сочетаниям клавиш, чтобы не открывать второй слой поверх формы. */
export function естьАктивныйМодальныйСлой(): boolean {
  return модальныеСлои.length > 0
}

function добавитьСлой(слой: symbol) {
  if (модальныеСлои.length === 0) {
    исходноеПереполнениеСтраницы = document.body.style.overflow
    document.body.style.overflow = 'hidden'
  }
  модальныеСлои.push(слой)
}

function убратьСлой(слой: symbol) {
  const индекс = модальныеСлои.lastIndexOf(слой)
  if (индекс !== -1) модальныеСлои.splice(индекс, 1)

  if (модальныеСлои.length === 0) {
    document.body.style.overflow = исходноеПереполнениеСтраницы ?? ''
    исходноеПереполнениеСтраницы = null
  }
}

function слойСверху(слой: symbol): boolean {
  return модальныеСлои.at(-1) === слой
}

/** Удерживает клавиатурный фокус внутри модального слоя и возвращает его назад. */
export function useModalFocus({
  активно,
  контейнер,
  начальныйФокус,
  наEscape,
}: {
  активно: boolean
  контейнер: RefObject<HTMLElement | null>
  начальныйФокус?: RefObject<HTMLElement | null>
  наEscape: () => void
}) {
  const закрыть = useRef(наEscape)
  закрыть.current = наEscape
  const слой = useRef(Symbol('modal-layer'))
  const былАктивен = useRef(false)
  const прежнийФокус = useRef<HTMLElement | null>(null)

  // Захватываем инициатор во время render: React применит autoFocus портала
  // раньше passive effect, и читать activeElement внутри эффекта уже поздно.
  if (активно && !былАктивен.current && typeof document !== 'undefined') {
    прежнийФокус.current = document.activeElement as HTMLElement | null
  }
  былАктивен.current = активно

  useEffect(() => {
    if (!активно) return

    const текущийСлой = слой.current
    добавитьСлой(текущийСлой)

    const кадр = requestAnimationFrame(() => {
      const текущийФокус = document.activeElement as HTMLElement | null
      if (текущийФокус && контейнер.current?.contains(текущийФокус)) return

      const первый = контейнер.current?.querySelector<HTMLElement>(ФОКУСИРУЕМЫЕ)
      ;(начальныйФокус?.current ?? первый ?? контейнер.current)?.focus()
    })

    const наКлавишу = (событие: KeyboardEvent) => {
      if (!слойСверху(текущийСлой)) return

      if (событие.key === 'Escape') {
        событие.preventDefault()
        закрыть.current()
        return
      }
      if (событие.key !== 'Tab') return

      const элементы = Array.from(
        контейнер.current?.querySelectorAll<HTMLElement>(ФОКУСИРУЕМЫЕ) ?? [],
      )

      if (элементы.length === 0) {
        событие.preventDefault()
        контейнер.current?.focus()
        return
      }

      const первый = элементы[0]!
      const последний = элементы.at(-1)!
      const фокусВнутри = контейнер.current?.contains(document.activeElement)
      if (!фокусВнутри) {
        событие.preventDefault()
        ;(событие.shiftKey ? последний : первый).focus()
      } else if (событие.shiftKey && document.activeElement === первый) {
        событие.preventDefault()
        последний.focus()
      } else if (!событие.shiftKey && document.activeElement === последний) {
        событие.preventDefault()
        первый.focus()
      }
    }

    document.addEventListener('keydown', наКлавишу)
    return () => {
      cancelAnimationFrame(кадр)
      document.removeEventListener('keydown', наКлавишу)
      const былСверху = слойСверху(текущийСлой)
      убратьСлой(текущийСлой)
      if (былСверху && прежнийФокус.current?.isConnected) {
        прежнийФокус.current.focus()
      }
    }
  }, [активно, контейнер, начальныйФокус])
}
