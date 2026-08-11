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
        'bg-card border border-line rounded-4 shadow-1',
        живая ? 'живая-карта' : 'transition-[border-color,box-shadow] duration-200',
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
        <h2 className="text-[15px] leading-tight font-semibold text-ink">
          {заголовок}
        </h2>
        {подпись ? (
          <p className="mt-0.5 text-[13px] text-ink-3">{подпись}</p>
        ) : null}
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
      <h2 className="text-[11px] font-semibold tracking-[0.14em] text-ink-3 uppercase">
        {children}
      </h2>
      {действие}
    </div>
  )
}
