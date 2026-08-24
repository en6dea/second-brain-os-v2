import { useEffect } from 'react'
import type { Настройки } from '@/core/db/types'

const ЦВЕТ_ОБОЛОЧКИ = {
  light: '#edf3f6',
  dark: '#0b1323',
} as const

/**
 * Применяет сохранённый выбор темы, не создавая второй источник правды.
 * В режиме «как в системе» слушает браузер и меняет только оболочку:
 * пользовательские записи и настройки данных не затрагиваются.
 */
export function useТему(тема: Настройки['тема']) {
  useEffect(() => {
    const система = window.matchMedia('(prefers-color-scheme: dark)')

    const применить = () => {
      const фактическая =
        тема === 'system' ? (система.matches ? 'dark' : 'light') : тема
      document.documentElement.dataset.theme = фактическая
      document.documentElement.dataset.themeChoice = тема
      document.documentElement.style.colorScheme = фактическая

      const мета = document.querySelector<HTMLMetaElement>(
        'meta[name="theme-color"]',
      )
      мета?.setAttribute('content', ЦВЕТ_ОБОЛОЧКИ[фактическая])
    }

    применить()
    if (тема !== 'system') return

    система.addEventListener('change', применить)
    return () => система.removeEventListener('change', применить)
  }, [тема])
}
