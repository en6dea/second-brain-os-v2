import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  endOfMonth,
  format,
  parseISO,
  startOfMonth,
  startOfWeek,
  endOfWeek,
} from 'date-fns'
import { ru } from 'date-fns/locale'
import type { ДатаДень } from '@/core/db/types'

export function сегодня(): ДатаДень {
  return format(new Date(), 'yyyy-MM-dd')
}

export function текущийМесяц(): string {
  return format(new Date(), 'yyyy-MM')
}

export function кДате(значение: ДатаДень): Date {
  // Полдень, чтобы переход на летнее время не сдвигал день.
  return parseISO(`${значение}T12:00:00`)
}

export function деньСловами(значение: ДатаДень | null): string {
  if (!значение) return '—'
  return format(кДате(значение), 'd MMMM yyyy', { locale: ru })
}

export function деньКратко(значение: ДатаДень | null): string {
  if (!значение) return '—'
  return format(кДате(значение), 'd MMM', { locale: ru })
}

export function деньНедели(значение: ДатаДень): string {
  return format(кДате(значение), 'EEEE', { locale: ru })
}

export function месяцСловами(месяц: string): string {
  return format(parseISO(`${месяц}-01T12:00:00`), 'LLLL yyyy', { locale: ru })
}

/**
 * Короткое имя месяца для подписей на осях: «март», «янв. 26».
 * Год добавляется только при смене года — иначе он лишний шум.
 */
export function месяцКоротко(месяц: string, показыватьГод = false): string {
  const образец = показыватьГод ? 'LLL yy' : 'LLL'
  return format(parseISO(`${месяц}-01T12:00:00`), образец, { locale: ru })
}

export function сдвинутьДень(значение: ДатаДень, дней: number): ДатаДень {
  return format(addDays(кДате(значение), дней), 'yyyy-MM-dd')
}

/**
 * Сдвиг на месяцы с клэмпингом конца месяца: 31 января + 1 месяц = 28 или
 * 29 февраля, а не несуществующее 31 февраля. Поведение `date-fns`, не
 * переопределяется — здесь только перевод в формат `ДатаДень`.
 */
export function сдвинутьМесяц(значение: ДатаДень, месяцев: number): ДатаДень {
  return format(addMonths(кДате(значение), месяцев), 'yyyy-MM-dd')
}

export function днейДо(значение: ДатаДень | null): number | null {
  if (!значение) return null
  return differenceInCalendarDays(кДате(значение), кДате(сегодня()))
}

/** Разница в днях между двумя днями: `до` минус `от`. */
export function разностьДней(от: ДатаДень, до: ДатаДень): number {
  return differenceInCalendarDays(кДате(до), кДате(от))
}

export function границыМесяца(месяц: string): { от: ДатаДень; до: ДатаДень } {
  const дата = parseISO(`${месяц}-01T12:00:00`)
  return {
    от: format(startOfMonth(дата), 'yyyy-MM-dd'),
    до: format(endOfMonth(дата), 'yyyy-MM-dd'),
  }
}

export function границыНедели(значение: ДатаДень = сегодня()): {
  от: ДатаДень
  до: ДатаДень
} {
  const дата = кДате(значение)
  return {
    от: format(startOfWeek(дата, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
    до: format(endOfWeek(дата, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
  }
}

/** Приветствие по времени суток — без выдумок, только по часам. */
export function приветствие(час = new Date().getHours()): string {
  if (час < 5) return 'Доброй ночи'
  if (час < 12) return 'Доброе утро'
  if (час < 18) return 'Добрый день'
  return 'Добрый вечер'
}
