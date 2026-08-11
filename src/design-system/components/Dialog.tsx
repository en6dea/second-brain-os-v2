import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/design-system/classNames'
import { IconButton } from './Button'

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

  useEffect(() => {
    if (!открыто) return
    const наКлавишу = (событие: KeyboardEvent) => {
      if (событие.key === 'Escape') наЗакрытие()
    }
    document.addEventListener('keydown', наКлавишу)
    const прежний = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    ссылка.current?.focus()
    return () => {
      document.removeEventListener('keydown', наКлавишу)
      document.body.style.overflow = прежний
    }
  }, [открыто, наЗакрытие])

  if (!открыто) return null

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
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
      />
      <div
        ref={ссылка}
        tabIndex={-1}
        className={cn(
          'anim-pop relative flex max-h-[92dvh] w-full flex-col overflow-hidden',
          'border border-line bg-over shadow-3 outline-none',
          'rounded-t-5 sm:rounded-5',
          ширины[ширина],
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-[16px] leading-tight font-semibold text-ink">
              {заголовок}
            </h2>
            {подпись ? (
              <p className="mt-0.5 text-[13px] text-ink-3">{подпись}</p>
            ) : null}
          </div>
          <IconButton подпись="Закрыть" onClick={наЗакрытие}>
            <X size={18} />
          </IconButton>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>

        {подвал ? (
          <div className="flex items-center justify-end gap-2 border-t border-line bg-card px-5 py-3">
            {подвал}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  )
}
