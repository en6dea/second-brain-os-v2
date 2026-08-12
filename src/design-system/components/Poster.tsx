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
    значок: 'h-10 w-10 rounded-full text-[13px]',
    карточка: 'h-[68px] w-[48px] rounded-2 text-[15px]',
    полоса: 'h-full w-full rounded-3 text-[18px]',
  }

  const общее = cn(
    'flex shrink-0 items-center justify-center overflow-hidden',
    'bg-sunken font-semibold text-ink-3 select-none',
    размеры[размер],
    className,
  )

  if (!адрес || !показывать || сломалась) {
    return (
      <span className={общее} aria-hidden={запасное ? undefined : 'true'}>
        {запасное ?? <ImageOff size={размер === 'значок' ? 14 : 18} />}
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
