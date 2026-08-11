import { рублиВКопейки } from '@/core/money/Money'

/**
 * Разбор полей прежнего приложения.
 *
 * Значения приходят в разном виде: числа строками, даты с временем, пустые
 * строки вместо отсутствия. Здесь это приводится к одному виду, и здесь же
 * собирается всё, что не распозналось.
 */

export type Запись = Record<string, unknown>

export function текст(значение: unknown): string {
  if (значение === null || значение === undefined) return ''
  if (typeof значение === 'object') return ''
  return String(значение).trim()
}

export function числоИлиNull(значение: unknown): number | null {
  if (значение === null || значение === undefined || значение === '') return null
  const число = Number(String(значение).replace(/\s/g, '').replace(',', '.'))
  return Number.isFinite(число) ? число : null
}

export function деньгиИзСтарого(значение: unknown): number | null {
  const число = числоИлиNull(значение)
  return число === null ? null : рублиВКопейки(число)
}

export function датаИлиNull(значение: unknown): string | null {
  const строка = текст(значение)
  if (!строка) return null
  const совпадение = строка.match(/^\d{4}-\d{2}-\d{2}/)
  if (совпадение) return совпадение[0]
  const русская = строка.match(/^(\d{2})[.](\d{2})[.](\d{4})/)
  if (русская) return `${русская[3]}-${русская[2]}-${русская[1]}`
  return null
}

export function массивСтрок(значение: unknown): string[] {
  if (!Array.isArray(значение)) return []
  return значение.map((элемент) => текст(элемент)).filter(Boolean)
}

export function массив(состояние: Запись, ключ: string): Запись[] {
  const значение = состояние[ключ]
  return Array.isArray(значение) ? (значение as Запись[]) : []
}

/**
 * Всё, что не разобрано явно, сохраняется дословно.
 * Нераспознанное поле — не мусор, а смысл, который не был понят.
 */
export function остаток(
  запись: Запись,
  использованные: string[],
): Запись | undefined {
  const прочее: Запись = {}
  let есть = false
  for (const ключ of Object.keys(запись)) {
    if (использованные.includes(ключ)) continue
    const значение = запись[ключ]
    if (значение === '' || значение === null || значение === undefined) continue
    прочее[ключ] = значение
    есть = true
  }
  return есть ? прочее : undefined
}

/** Служебные поля, которые есть почти везде и в остаток не нужны. */
export const СЛУЖЕБНЫЕ = ['id', 'createdAt', 'updatedAt']

/**
 * Склейка нескольких подписанных полей в один текст.
 * Прежнее приложение раскладывало запись по десятку узких полей; в новой
 * версии они собираются в читаемый текст, но ни одно не теряется.
 */
export function собратьТекст(
  запись: Запись,
  части: [ключ: string, подпись: string][],
): string {
  const строки: string[] = []
  for (const [ключ, подпись] of части) {
    const значение = запись[ключ]
    const содержимое = Array.isArray(значение)
      ? массивСтрок(значение).join('; ')
      : текст(значение)
    if (содержимое) строки.push(подпись ? `${подпись}: ${содержимое}` : содержимое)
  }
  return строки.join('\n\n')
}
