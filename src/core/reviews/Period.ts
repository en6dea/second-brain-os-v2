import type { ВидОбзора, ДатаДень } from '@/core/db/types'
import { границыНедели } from '@/core/calendar/CalendarRu'

/**
 * Ключ периода обзора — «за что» этот обзор.
 *
 * Живёт в `core/`, а не внутри `ReviewsPage.tsx`, потому что напоминания
 * (`core/reminders/Schedule.ts`) тоже должны знать, закрыт ли обзор за
 * текущий период — а `core/` не может зависеть от `features/`.
 */
export function ключПериодаОбзора(вид: ВидОбзора, день: ДатаДень): string {
  if (вид === 'день') return день
  if (вид === 'неделя') {
    const границы = границыНедели(день)
    return `${границы.от}—${границы.до}`
  }
  return день.slice(0, 7)
}
