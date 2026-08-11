import type { ReactNode } from 'react'
import { cn } from '@/design-system/classNames'

type Тон =
  'нейтральный' | 'успех' | 'опасность' | 'внимание' | 'сведения' | 'знание'

const тона: Record<Тон, string> = {
  нейтральный: 'bg-sunken text-ink-2 border-line',
  успех: 'bg-good-soft text-good border-transparent',
  опасность: 'bg-bad-soft text-bad border-transparent',
  внимание: 'bg-warn-soft text-warn border-transparent',
  сведения: 'bg-info-soft text-info border-transparent',
  знание: 'bg-know-soft text-know border-transparent',
}

export function Badge({
  children,
  тон = 'нейтральный',
  className,
}: {
  children: ReactNode
  тон?: Тон
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5',
        'text-[12px] leading-5 font-medium whitespace-nowrap',
        тона[тон],
        className,
      )}
    >
      {children}
    </span>
  )
}

/**
 * Шкала известного — подпись всей системы.
 *
 * Показывает не «сколько сделано», а сколько из учитываемого системе
 * действительно известно. Сплошной отрезок — подтверждённое, штриховка —
 * пробел в данных. Приложение обязано показывать границу своего знания,
 * а не закрывать её нулём.
 */
export function KnownScale({
  известно,
  неизвестно,
  подписьИзвестного,
  подписьНеизвестного,
  className,
}: {
  известно: number
  неизвестно: number
  подписьИзвестного?: string
  подписьНеизвестного?: string
  className?: string
}) {
  const всего = известно + неизвестно
  if (всего === 0) return null
  const доля = (известно / всего) * 100

  return (
    <div className={cn('mt-2', className)}>
      <div
        className="flex h-[3px] w-full overflow-hidden rounded-full bg-sunken"
        role="img"
        aria-label={`Известно ${известно} из ${всего}`}
      >
        <div
          className="шкала-заполнение h-full bg-accent"
          style={{ width: `${доля}%` }}
        />
        {неизвестно > 0 ? (
          <div className="h-full flex-1" style={{ background: 'var(--hatch)' }} />
        ) : null}
      </div>
      <div className="mt-1 flex items-center justify-between text-[10.5px] text-ink-3">
        <span>{подписьИзвестного ?? `известно ${известно}`}</span>
        {неизвестно > 0 ? (
          <span>{подписьНеизвестного ?? `не заполнено ${неизвестно}`}</span>
        ) : null}
      </div>
    </div>
  )
}

/**
 * Показание прибора.
 *
 * Надзаголовок — единица измерения: он говорит, что именно меряет число.
 * Подпись-источник обязательна: человек должен понимать, откуда цифра взялась.
 */
export function Metric({
  подпись,
  значение,
  источник,
  единица,
  тон = 'нейтральный',
  иконка,
  шкала,
  className,
}: {
  подпись: string
  значение: ReactNode
  источник?: string
  единица?: string
  тон?: Тон
  иконка?: ReactNode
  шкала?: { известно: number; неизвестно: number }
  className?: string
}) {
  const цветЗначения =
    тон === 'успех'
      ? 'text-good'
      : тон === 'опасность'
        ? 'text-bad'
        : тон === 'внимание'
          ? 'text-warn'
          : 'text-ink'

  return (
    <div className={cn('min-w-0', className)}>
      {единица ? <div className="unit mb-1">{единица}</div> : null}
      <div className="flex items-center gap-1.5 text-[12px] text-ink-3">
        {иконка}
        <span className="truncate">{подпись}</span>
      </div>
      <div
        className={cn(
          // На узких экранах показание уменьшается, чтобы сумма не обрезалась.
          'tnum mt-1 text-[18.5px] leading-tight font-medium sm:text-[21px]',
          цветЗначения,
        )}
      >
        {значение}
      </div>
      {источник ? (
        <div className="mt-0.5 text-[11px] leading-snug text-ink-3">{источник}</div>
      ) : null}
      {шкала ? (
        <KnownScale известно={шкала.известно} неизвестно={шкала.неизвестно} />
      ) : null}
    </div>
  )
}

export function ProgressBar({
  значение,
  из,
  тон = 'нейтральный',
  подпись,
}: {
  значение: number
  из: number
  тон?: Тон
  подпись?: string
}) {
  const доля = из > 0 ? Math.min(100, Math.max(0, (значение / из) * 100)) : 0
  const цвет =
    тон === 'успех'
      ? 'bg-good'
      : тон === 'опасность'
        ? 'bg-bad'
        : тон === 'внимание'
          ? 'bg-warn'
          : 'bg-accent'

  return (
    <div>
      {подпись ? (
        <div className="mb-1.5 flex items-baseline justify-between text-[12px] text-ink-3">
          <span>{подпись}</span>
          <span className="tnum">{Math.round(доля)}%</span>
        </div>
      ) : null}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-sunken">
        <div
          className={cn('h-full rounded-full transition-[width]', цвет)}
          style={{ width: `${доля}%`, transitionDuration: '600ms' }}
        />
      </div>
    </div>
  )
}

export function EmptyState({
  заголовок,
  подпись,
  действие,
  иконка,
}: {
  заголовок: string
  подпись?: string
  действие?: ReactNode
  иконка?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
      {иконка ? (
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-3 bg-sunken text-ink-3">
          {иконка}
        </div>
      ) : null}
      <p className="text-sm font-medium text-ink">{заголовок}</p>
      {подпись ? (
        <p className="mt-1 max-w-sm text-[13px] text-ink-3">{подпись}</p>
      ) : null}
      {действие ? <div className="mt-4">{действие}</div> : null}
    </div>
  )
}

export function Skeleton({ строк = 3 }: { строк?: number }) {
  return (
    <div className="space-y-2 px-5 pb-5" aria-busy="true" aria-live="polite">
      {Array.from({ length: строк }).map((_, индекс) => (
        <div
          key={индекс}
          className="h-10 animate-pulse rounded-2 bg-sunken"
          style={{ animationDelay: `${индекс * 80}ms` }}
        />
      ))}
      <span className="sr-only">Загрузка данных</span>
    </div>
  )
}

export function ErrorNote({
  текст,
  действие,
}: {
  текст: string
  действие?: ReactNode
}) {
  return (
    <div className="rounded-3 border border-bad/30 bg-bad-soft px-4 py-3">
      <p className="text-[13px] text-bad">{текст}</p>
      {действие ? <div className="mt-2">{действие}</div> : null}
    </div>
  )
}
