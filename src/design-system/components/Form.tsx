import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { cn } from '@/design-system/classNames'

const базаПоля =
  'w-full bg-card border border-line rounded-2 px-3 text-lead text-ink ' +
  'placeholder:text-ink-3 transition-colors duration-150 ' +
  'hover:border-line-strong focus:border-accent focus:outline-none ' +
  'disabled:opacity-50 disabled:pointer-events-none'

export function Field({
  подпись,
  подсказка,
  ошибка,
  обязательное,
  children,
  className,
}: {
  подпись: string
  подсказка?: string
  ошибка?: string
  обязательное?: boolean
  children: ReactNode
  className?: string
}) {
  return (
    <label className={cn('block', className)}>
      <span className="mb-1.5 flex items-center gap-1 text-body font-medium text-ink-2">
        {подпись}
        {обязательное ? <span className="text-bad">*</span> : null}
      </span>
      {children}
      {ошибка ? (
        <span className="mt-1 block text-meta text-bad">{ошибка}</span>
      ) : подсказка ? (
        <span className="mt-1 block text-meta text-ink-3">{подсказка}</span>
      ) : null}
    </label>
  )
}

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(function Input({ className, ...остальное }, ref) {
  return (
    <input ref={ref} className={cn(базаПоля, 'h-11', className)} {...остальное} />
  )
})

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, rows = 4, ...остальное }, ref) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={cn(базаПоля, 'resize-y py-2.5 leading-relaxed', className)}
      {...остальное}
    />
  )
})

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className, children, ...остальное }, ref) {
  return (
    <select
      ref={ref}
      className={cn(базаПоля, 'h-11 cursor-pointer pr-8', className)}
      {...остальное}
    >
      {children}
    </select>
  )
})

/**
 * Input суммы. Работает в рублях, наружу отдаёт копейки.
 * Пустое поле — это `null` («не заполнено»), а не ноль.
 */
export const MoneyInput = forwardRef<
  HTMLInputElement,
  Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> & {
    value: string
    onChange: (значение: string) => void
  }
>(function MoneyInput({ className, value, onChange, ...остальное }, ref) {
  return (
    <div className="relative">
      <input
        ref={ref}
        inputMode="decimal"
        value={value}
        onChange={(событие) => {
          const очищено = событие.target.value.replace(/[^\d.,\-\s]/g, '')
          onChange(очищено)
        }}
        className={cn(базаПоля, 'tnum h-11 pr-8 text-right', className)}
        {...остальное}
      />
      <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-lead text-ink-3">
        ₽
      </span>
    </div>
  )
})

/** Switch да/нет. */
export function Switch({
  включён,
  наИзменение,
  подпись,
  описание,
}: {
  включён: boolean
  наИзменение: (значение: boolean) => void
  подпись: string
  описание?: string
}) {
  const id = useId()
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <div className="min-w-0">
        <label htmlFor={id} className="cursor-pointer text-body text-ink">
          {подпись}
        </label>
        {описание ? (
          <p className="mt-0.5 text-meta text-ink-3">{описание}</p>
        ) : null}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={включён}
        onClick={() => наИзменение(!включён)}
        className={cn(
          'relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200',
          включён ? 'bg-accent' : 'bg-line-strong',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-1',
            'transition-transform duration-200',
            включён ? 'translate-x-[22px]' : 'translate-x-0.5',
          )}
        />
      </button>
    </div>
  )
}

/**
 * Группа взаимоисключающих значений.
 *
 * `размер="поле"` — когда это поле формы, а не переключатель вида: палец
 * попадает в 44 px, и группа занимает всю ширину, как остальные поля.
 * По умолчанию компактный: в шапке раздела крупные вкладки только мешают.
 */
export function Segmented<T extends string>({
  значения,
  выбрано,
  наВыбор,
  размер = 'компактный',
  className,
}: {
  значения: { ключ: T; подпись: string }[]
  выбрано: T
  наВыбор: (ключ: T) => void
  размер?: 'компактный' | 'поле'
  className?: string
}) {
  const поле = размер === 'поле'
  return (
    <div
      role="tablist"
      className={cn(
        'items-center gap-0.5 rounded-2 border border-line bg-sunken p-0.5',
        поле ? 'flex w-full' : 'inline-flex',
        className,
      )}
    >
      {значения.map((элемент) => (
        <button
          key={элемент.ключ}
          role="tab"
          type="button"
          aria-selected={выбрано === элемент.ключ}
          onClick={() => наВыбор(элемент.ключ)}
          className={cn(
            'rounded-1 font-medium transition-colors duration-150',
            поле ? 'h-11 flex-1 px-2 text-meta' : 'px-3 py-1.5 text-meta',
            выбрано === элемент.ключ
              ? 'bg-card text-ink shadow-1'
              : 'text-ink-3 hover:text-ink-2',
          )}
        >
          {элемент.подпись}
        </button>
      ))}
    </div>
  )
}
