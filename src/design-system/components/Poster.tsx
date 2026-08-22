import { useState } from 'react'
import { ImageOff } from 'lucide-react'
import { cn } from '@/design-system/classNames'

/**
 * Обложка по адресу.
 *
 * Картинка грузится с чужого сервера, поэтому:
 *  · её показ можно отключить в настройках;
 *  · при отказе загрузки показывается заглушка, а не пустое место —
 *    иначе непонятно, обложки нет или адрес не работает.
 */
export function Poster({
  адрес,
  подпись,
  запасное,
  размер = 'карточка',
  показывать = true,
  className,
}: {
  адрес: string
  подпись: string
  /** Что показать, когда обложки нет: буква, значок. */
  запасное?: string
  размер?: 'значок' | 'карточка' | 'полоса'
  показывать?: boolean
  className?: string
}) {
  const [сломалась, установитьСломалась] = useState(false)

  const размеры = {
    значок: 'h-14 w-14 rounded-full text-h3',
    карточка: 'h-[112px] w-[78px] rounded-3 text-h2',
    полоса: 'h-full w-full rounded-3 text-h2',
  }

  // Тонкая обводка и тень отделяют обложку от фона карточки: без них тёмная
  // картинка сливается с поверхностью и перестаёт читаться как объект.
  const общее = cn(
    'flex shrink-0 items-center justify-center overflow-hidden',
    'bg-sunken font-semibold text-ink-3 select-none',
    'border border-line shadow-1',
    размеры[размер],
    className,
  )

  if (!адрес || !показывать || сломалась) {
    return (
      <span className={общее} aria-hidden={запасное ? undefined : 'true'}>
        {запасное ?? <ImageOff size={размер === 'значок' ? 18 : 24} />}
      </span>
    )
  }

  return (
    <span className={общее}>
      <img
        src={адрес}
        alt={подпись}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => установитьСломалась(true)}
        className="h-full w-full object-cover"
      />
    </span>
  )
}
