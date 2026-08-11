import type { ReactNode } from 'react'
import { cn } from '@/design-system/classNames'

/**
 * Отклик на выполненное действие.
 *
 * Кольцо расходится от отметки и гаснет — как импульс на экране прибора.
 * Ни искр, ни конфетти: система измеряет, а не поздравляет.
 */
export function Ping({
  активен,
  тон = 'успех',
  children,
  className,
}: {
  активен: boolean
  тон?: 'успех' | 'акцент'
  children: ReactNode
  className?: string
}) {
  const цвет = тон === 'успех' ? 'border-good' : 'border-accent'

  return (
    <span className={cn('relative inline-flex', className)}>
      {children}
      {активен ? (
        <>
          <span
            aria-hidden="true"
            className={cn(
              'импульс pointer-events-none absolute inset-0 rounded-full border-2',
              цвет,
            )}
          />
          <span
            aria-hidden="true"
            className={cn(
              'импульс импульс-второй pointer-events-none absolute inset-0 rounded-full border',
              цвет,
            )}
          />
        </>
      ) : null}
    </span>
  )
}

/**
 * Однократный проблеск по карточке: цель достигнута.
 * Свет проходит слева направо и больше не возвращается.
 */
export function Flash({ активен }: { активен: boolean }) {
  if (!активен) return null
  return (
    <span
      aria-hidden="true"
      className="проблеск pointer-events-none absolute inset-0 overflow-hidden rounded-4"
    />
  )
}
