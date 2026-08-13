import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/design-system/classNames'

type Вид = 'основная' | 'обычная' | 'тихая' | 'контур' | 'опасная'
type Размер = 'малый' | 'средний' | 'большой'

const виды: Record<Вид, string> = {
  основная:
    'bg-accent text-on-accent hover:bg-accent-hover shadow-1 border border-transparent',
  обычная:
    'bg-card text-ink border border-line hover:bg-hover hover:border-line-strong',
  тихая:
    'bg-transparent text-ink-2 border border-transparent hover:bg-hover hover:text-ink',
  контур:
    'bg-transparent text-accent border border-accent-line hover:bg-accent-soft',
  опасная: 'bg-bad-soft text-bad border border-transparent hover:brightness-95',
}

// Средний — размер по умолчанию, и он же попадает в подвал каждого окна.
// 44 px: то же правило, что и у полей ввода, иначе главная кнопка формы
// оказывается меньше всего, что над ней.
const размеры: Record<Размер, string> = {
  малый: 'h-8 px-3 text-meta gap-1.5 rounded-2',
  средний: 'h-11 px-4 text-body gap-2 rounded-2',
  большой: 'h-12 px-5 text-lead gap-2.5 rounded-3',
}

export interface СвойстваКнопки extends ButtonHTMLAttributes<HTMLButtonElement> {
  вид?: Вид
  размер?: Размер
  иконка?: ReactNode
  наВсюШирину?: boolean
}

export function Button({
  вид = 'обычная',
  размер = 'средний',
  иконка,
  наВсюШирину,
  className,
  children,
  type = 'button',
  ...остальное
}: СвойстваКнопки) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center font-medium select-none',
        'transition-[background-color,border-color,color,transform] duration-150',
        'active:scale-[0.985] disabled:opacity-45 disabled:pointer-events-none',
        виды[вид],
        размеры[размер],
        наВсюШирину && 'w-full',
        className,
      )}
      {...остальное}
    >
      {иконка ? <span className="shrink-0">{иконка}</span> : null}
      {children}
    </button>
  )
}

/** Круглая кнопка только с иконкой. Подпись обязательна для доступности. */
export function IconButton({
  вид = 'тихая',
  className,
  children,
  подпись,
  ...остальное
}: Omit<СвойстваКнопки, 'размер' | 'иконка'> & { подпись: string }) {
  return (
    <button
      type="button"
      aria-label={подпись}
      title={подпись}
      className={cn(
        'inline-flex h-9 w-9 items-center justify-center rounded-2',
        'transition-colors duration-150 active:scale-95',
        виды[вид],
        className,
      )}
      {...остальное}
    >
      {children}
    </button>
  )
}
