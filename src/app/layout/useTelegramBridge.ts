import { useEffect } from 'react'
import { читатьНастройки } from '@/core/db/repo'
import { забратьTelegram } from '@/core/telegram/Bridge'
import { useИнтерфейс } from '@/app/providers/ui'

const ИНТЕРВАЛ = 60_000

/** Забирает только уже отправленные человеком команды и не работает без привязки. */
export function useTelegramBridge() {
  const сообщить = useИнтерфейс((с) => с.сообщить)

  useEffect(() => {
    let остановлено = false
    let идёт = false

    async function пройти() {
      if (остановлено || идёт || document.visibilityState === 'hidden') return
      const config = (await читатьНастройки()).telegram
      if (!config?.token || !config.endpoint) return
      идёт = true
      try {
        const итог = await забратьTelegram(config)
        if (!остановлено && итог.импортировано > 0) {
          сообщить(`Из Telegram добавлено: ${итог.импортировано}`)
        }
      } catch {
        // Фоновая сеть не должна отвлекать. Статус и ошибка видны в настройках.
      } finally {
        идёт = false
      }
    }

    const приВозврате = () => void пройти()
    void пройти()
    const таймер = window.setInterval(() => void пройти(), ИНТЕРВАЛ)
    document.addEventListener('visibilitychange', приВозврате)
    return () => {
      остановлено = true
      window.clearInterval(таймер)
      document.removeEventListener('visibilitychange', приВозврате)
    }
  }, [сообщить])
}
