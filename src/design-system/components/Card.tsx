import type { ReactNode } from 'react'
import { cn } from '@/design-system/classNames'

export function Card({
  className,
  children,
  живая,
  ...остальное
}: React.HTMLAttributes<HTMLDivElement> & {
  /** Карточка, по которой можно щёлкнуть: приподнимается под курсором. */
  живая?: boolean
}) {
  return (
    <div
      className={cn(
        'premium-card rounded-4',
        живая ? 'premium-card-interactive' : undefined,
        className,
      )}
      {...остальное}
    >
      {children}
    </div>
  )
}

export function CardHeader({
  заголовок,
  подпись,
  действие,
  className,
}: {
  заголовок: ReactNode
  подпись?: ReactNode
  действие?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex items-start justify-between gap-3 px-5 pt-5 pb-3',
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className="text-h3 leading-tight font-medium text-ink">{заголовок}</h2>
        {подпись ? <p className="mt-0.5 text-body text-ink-3">{подпись}</p> : null}
      </div>
      {действие ? <div className="shrink-0">{действие}</div> : null}
    </div>
  )
}

export function CardBody({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return <div className={cn('px-5 pb-5', className)}>{children}</div>
}

/** Заголовок раздела страницы — вне карточек. */
export function SectionTitle({
  children,
  действие,
}: {
  children: ReactNode
  действие?: ReactNode
}) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h2 className="section-rule text-caption font-medium tracking-[0.14em] text-ink-3 uppercase">
        {children}
      </h2>
      {действие}
    </div>
  )
}
