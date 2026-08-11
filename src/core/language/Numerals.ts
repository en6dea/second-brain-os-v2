/**
 * Запись чисел по-русски: разряды разделяются неразрывным пробелом.
 * Отдельно от денег: показатели целей и привычек измеряются не только в рублях.
 */

const формат = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 })

export function число(значение: number | null | undefined): string {
  if (значение === null || значение === undefined || !Number.isFinite(значение))
    return '—'
  return формат.format(значение)
}
