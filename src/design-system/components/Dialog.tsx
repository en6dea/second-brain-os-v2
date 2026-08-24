import { useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/design-system/classNames'
import { ЗНАЧОК } from '@/design-system/iconSize'
import { useПрисутствие } from '@/design-system/motion/Presence'
import { IconButton } from './Button'
import { useModalFocus } from '@/design-system/a11y/useModalFocus'

/**
 * Модальное окно. На узких экранах превращается в лист, выезжающий снизу, —
 * это не уменьшенная копия настольного окна, а отдельное поведение.
 */
export function Dialog({
  открыто,
  наЗакрытие,
  заголовок,
  подпись,
  children,
  подвал,
  ширина = 'средняя',
}: {
  открыто: boolean
  наЗакрытие: () => void
  заголовок: string
  подпись?: string
  children: ReactNode
  подвал?: ReactNode
  ширина?: 'узкая' | 'средняя' | 'широкая'
}) {
  const ссылка = useRef<HTMLDivElement>(null)
  const { смонтировано, закрывается, наОкончание } = useПрисутствие(открыто)

  useModalFocus({
    активно: смонтировано,
    контейнер: ссылка,
    наEscape: наЗакрытие,
  })

  if (!смонтировано) return null

  const ширины = {
    узкая: 'sm:max-w-md',
    средняя: 'sm:max-w-xl',
    широкая: 'sm:max-w-3xl',
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={заголовок}
    >
      <button
        type="button"
        aria-label="Закрыть окно"
        onClick={наЗакрытие}
        className={cn(
          'absolute inset-0 bg-black/70 backdrop-blur-[2px]',
          закрывается ? 'anim-затемнение-наружу' : 'anim-затемнение-внутрь',
        )}
      />
      <div
        ref={ссылка}
        tabIndex={-1}
        onAnimationEnd={(событие) => {
          if (событие.target === событие.currentTarget) наОкончание()
        }}
        className={cn(
          'relative flex max-h-[92dvh] w-full flex-col overflow-hidden',
          закрывается ? 'anim-pop-уход' : 'anim-pop',
          'dialog-panel outline-none',
          'rounded-t-5 sm:rounded-5',
          ширины[ширина],
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-h3 leading-tight font-medium text-ink">
              {заголовок}
            </h2>
            {подпись ? (
              <p className="mt-0.5 text-body text-ink-3">{подпись}</p>
            ) : null}
          </div>
          <IconButton подпись="Закрыть" onClick={наЗакрытие}>
            <X size={ЗНАЧОК.крупный} />
          </IconButton>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>

        {подвал ? (
          <div className="flex items-center justify-end gap-2 border-t border-line bg-sunken/70 px-5 py-3">
            {подвал}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  )
}
