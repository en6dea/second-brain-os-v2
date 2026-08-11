import type { Копейки } from '@/core/db/types'

/**
 * Деньги хранятся в копейках целым числом.
 * Рубли появляются только на границе ввода и вывода.
 */

export function рублиВКопейки(значение: number | string | null): Копейки | null {
  if (значение === null || значение === undefined) return null
  const текст = String(значение).replace(/\s| /g, '').replace(',', '.')
  if (текст === '') return null
  const число = Number(текст)
  if (!Number.isFinite(число)) return null
  return Math.round(число * 100)
}

export function копейкиВРубли(значение: Копейки | null): number | null {
  if (значение === null || значение === undefined) return null
  return значение / 100
}

const формат = new Intl.NumberFormat('ru-RU', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

const форматТочный = new Intl.NumberFormat('ru-RU', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/**
 * Сумма для показа человеку.
 * `null` даёт «—», а не «0 ₽»: незаполненное не равно нулю.
 */
export function деньги(
  значение: Копейки | null | undefined,
  настройки: { копейки?: boolean; знак?: boolean } = {},
): string {
  if (значение === null || значение === undefined) return '—'
  const рубли = значение / 100
  const телo = настройки.копейки
    ? форматТочный.format(Math.abs(рубли))
    : формат.format(Math.abs(рубли))
  const минус = рубли < 0 ? '−' : настройки.знак && рубли > 0 ? '+' : ''
  return `${минус}${телo} ₽`
}

/** Компактная сумма для плотных мест: 148 000 ₽ → 148 тыс ₽ */
export function деньгиКратко(значение: Копейки | null | undefined): string {
  if (значение === null || значение === undefined) return '—'
  const рубли = Math.abs(значение / 100)
  const знак = значение < 0 ? '−' : ''
  // Неразрывные пробелы: подпись оси графика не должна разрываться посередине.
  if (рубли >= 1_000_000)
    return `${знак}${(рубли / 1_000_000).toFixed(1).replace('.', ',')} млн ₽`
  if (рубли >= 10_000) return `${знак}${Math.round(рубли / 1000)} тыс ₽`
  return `${знак}${формат.format(рубли)} ₽`
}

/** Сумма значений с уважением к «неизвестно»: null пропускается, а не считается нулём. */
export function суммаИзвестных(значения: (Копейки | null)[]): {
  сумма: Копейки
  известно: number
  неизвестно: number
} {
  let сумма = 0
  let известно = 0
  let неизвестно = 0
  for (const значение of значения) {
    if (значение === null || значение === undefined) неизвестно += 1
    else {
      сумма += значение
      известно += 1
    }
  }
  return { сумма, известно, неизвестно }
}

/** Процент с защитой от деления на ноль. Возвращает null, если базы нет. */
export function процент(часть: number, целое: number): number | null {
  if (!Number.isFinite(целое) || целое === 0) return null
  return Math.round((часть / целое) * 100)
}
