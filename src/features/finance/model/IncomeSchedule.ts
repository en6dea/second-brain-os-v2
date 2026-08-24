import type { ДатаДень } from '@/core/db/types'

export type ПереносВыходного = 'раньше' | 'позже' | 'без переноса'

function строкаДня(дата: Date): ДатаДень {
  return `${дата.getUTCFullYear()}-${String(дата.getUTCMonth() + 1).padStart(2, '0')}-${String(
    дата.getUTCDate(),
  ).padStart(2, '0')}`
}

function разобратьДень(дата: ДатаДень): Date | null {
  const совпадение = /^(\d{4})-(\d{2})-(\d{2})$/.exec(дата)
  if (!совпадение) return null
  const значение = new Date(
    Date.UTC(
      Number(совпадение[1]),
      Number(совпадение[2]) - 1,
      Number(совпадение[3]),
    ),
  )
  return Number.isNaN(значение.getTime()) ? null : значение
}

function скорректироватьВыходной(дата: Date, перенос: ПереносВыходного) {
  const результат = new Date(дата)
  if (перенос === 'без переноса') return результат
  const шаг = перенос === 'раньше' ? -1 : 1
  while (результат.getUTCDay() === 0 || результат.getUTCDay() === 6) {
    результат.setUTCDate(результат.getUTCDate() + шаг)
  }
  return результат
}

/**
 * Ближайшая дата повторяющегося дохода. Праздники не угадываются: без
 * производственного календаря достоверно известны только суббота и воскресенье.
 */
export function следующаяДатаДохода(параметры: {
  сегодня: ДатаДень
  дниМесяца: number[]
  переносВыходного: ПереносВыходного
}): ДатаДень | null {
  const сегодня = разобратьДень(параметры.сегодня)
  if (!сегодня) return null
  const дни = [...new Set(параметры.дниМесяца)]
    .filter((день) => Number.isInteger(день) && день >= 1 && день <= 31)
    .sort((а, б) => а - б)
  if (дни.length === 0) return null

  const кандидаты: Date[] = []
  for (let сдвиг = 0; сдвиг <= 2; сдвиг += 1) {
    const начало = new Date(
      Date.UTC(сегодня.getUTCFullYear(), сегодня.getUTCMonth() + сдвиг, 1),
    )
    const последнийДень = new Date(
      Date.UTC(начало.getUTCFullYear(), начало.getUTCMonth() + 1, 0),
    ).getUTCDate()
    for (const день of дни) {
      const календарныйДень = Math.min(день, последнийДень)
      кандидаты.push(
        скорректироватьВыходной(
          new Date(
            Date.UTC(
              начало.getUTCFullYear(),
              начало.getUTCMonth(),
              календарныйДень,
            ),
          ),
          параметры.переносВыходного,
        ),
      )
    }
  }

  const сегодняВремя = сегодня.getTime()
  const ближайшая = кандидаты
    .filter((кандидат) => кандидат.getTime() >= сегодняВремя)
    .sort((а, б) => а.getTime() - б.getTime())[0]
  return ближайшая ? строкаДня(ближайшая) : null
}

export function разобратьДниДохода(строка: string): number[] {
  return [...new Set(строка.split(/[,;\s]+/).map(Number))]
    .filter((день) => Number.isInteger(день) && день >= 1 && день <= 31)
    .sort((а, б) => а - б)
}
