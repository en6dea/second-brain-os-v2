import { cn } from '@/design-system/classNames'
import { ДЕЛЕНИЯ, делениеПоЗначению } from '@/design-system/scale'

/**
 * Оценка пятью делениями.
 *
 * Столбики растут слева направо: шкала читается как прибор, а не как ряд
 * одинаковых кнопок. Выбранное деление названо словом над шкалой — число
 * 0…10 человеку не показывается, потому что и не означало ничего точного.
 *
 * Повторное нажатие снимает отметку: «не отмечено» — это отдельное состояние,
 * а не ноль. Определение шкалы и перевод значения в слова — в
 * `src/design-system/scale.ts`.
 */
export function Scale({
  подпись,
  значение,
  наИзменение,
  className,
}: {
  подпись: string
  значение: number | null
  наИзменение: (значение: number | null) => void
  className?: string
}) {
  const выбрано = делениеПоЗначению(значение)

  return (
    <div className={className}>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="text-body font-medium text-ink-2">{подпись}</span>
        <span className="text-caption text-ink-3">
          {выбрано ? выбрано.подпись : 'не отмечено'}
        </span>
      </div>

      <div
        role="group"
        aria-label={подпись}
        className="flex items-stretch gap-1 rounded-2 border border-line bg-sunken p-1"
      >
        {ДЕЛЕНИЯ.map((деление, номер) => {
          const это = выбрано?.подпись === деление.подпись
          return (
            <button
              key={деление.подпись}
              type="button"
              title={деление.подпись}
              aria-label={`${подпись}: ${деление.подпись}`}
              aria-pressed={это}
              onClick={() => наИзменение(это ? null : деление.значение)}
              className={cn(
                'flex h-11 flex-1 items-end justify-center rounded-1 pb-2',
                'transition-colors duration-150 active:scale-[0.97]',
                это ? 'bg-accent' : 'bg-card hover:bg-accent-soft',
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  'w-3 rounded-full',
                  это ? 'bg-on-accent' : 'bg-line-strong',
                )}
                style={{ height: 5 + номер * 4 }}
              />
            </button>
          )
        })}
      </div>

      <div className="mt-1 flex justify-between text-micro text-ink-3">
        <span>{ДЕЛЕНИЯ.at(0)?.подпись}</span>
        <span>{ДЕЛЕНИЯ.at(-1)?.подпись}</span>
      </div>
    </div>
  )
}
