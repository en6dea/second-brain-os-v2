/**
 * Как назвать клавишу-модификатор в подсказке.
 *
 * Обработчик в AppShell принимает и Ctrl, и Cmd, а подсказка печатала только
 * «Ctrl K» — на Mac она называла клавишу, которой у человека нет. Определение
 * платформы в браузере не гарантировано: `navigator.platform` объявлен
 * устаревшим и в новых версиях может быть урезан. Поэтому при неудачном
 * определении подсказка показывает обе клавиши, а не ошибочную одну.
 */
export function модификатор(): string {
  const данные = (
    navigator as Navigator & { userAgentData?: { platform?: string } }
  ).userAgentData?.platform
  const платформа = данные ?? navigator.platform ?? ''

  if (/mac|iphone|ipad|ipod/i.test(платформа)) return '⌘'
  if (/win|linux|android|cros/i.test(платформа)) return 'Ctrl'
  return 'Ctrl/⌘'
}
