import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/design-system/classNames'

type Вид = 'основная' | 'обычная' | 'тихая' | 'контур' | 'опасная'
type Размер = 'малый' | 'средний' | 'большой'

const виды: Record<Вид, string> = {
  основная: 'button-primary',
  обычная: 'button-default',
  тихая: 'button-quiet',
  контур: 'button-outline',
  опасная: 'button-danger',
}

// Средний — размер по умолчанию, и он же попадает в подвал каждого окна.
// 44 px: то же правило, что и у полей ввода, иначе главная кнопка формы
// оказывается меньше всего, что над ней.
const размеры: Record<Размер, string> = {
  малый: 'h-11 px-3 text-meta gap-1.5 rounded-2',
  средний: 'h-11 px-4 text-body gap-2 rounded-2',
  большой: 'h-12 px-5 text-body gap-2.5 rounded-3',
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
        'button-base inline-flex items-center justify-center font-medium select-none',
        'disabled:pointer-events-none disabled:opacity-45',
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
        'button-base inline-flex h-11 w-11 items-center justify-center rounded-2',
        виды[вид],
        className,
      )}
      {...остальное}
    >
      {children}
    </button>
  )
}
