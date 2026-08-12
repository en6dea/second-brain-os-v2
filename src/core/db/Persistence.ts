/**
 * Постоянное хранение.
 *
 * По умолчанию браузер считает хранилище сайта расходным: при нехватке места
 * он вправе стереть его без предупреждения, и данные откатятся к тому, чего
 * человек не ожидает. Для приложения, где лежат деньги и дневник, это
 * недопустимо, поэтому у браузера явно запрашивается постоянное хранение.
 *
 * Запрос делается один раз при запуске. Браузер может отказать — тогда
 * состояние честно показывается в настройках, а не умалчивается.
 */

export interface СостояниеХранилища {
  постоянное: boolean
  занято: number | null
  доступно: number | null
  поддерживается: boolean
}

export async function запроситьПостоянноеХранение(): Promise<boolean> {
  if (!navigator.storage?.persist) return false
  try {
    if (await navigator.storage.persisted?.()) return true
    return await navigator.storage.persist()
  } catch {
    return false
  }
}

export async function состояниеХранилища(): Promise<СостояниеХранилища> {
  if (!navigator.storage?.estimate) {
    return {
      постоянное: false,
      занято: null,
      доступно: null,
      поддерживается: false,
    }
  }

  try {
    const оценка = await navigator.storage.estimate()
    const постоянное = (await navigator.storage.persisted?.()) ?? false
    return {
      постоянное,
      занято: оценка.usage ?? null,
      доступно: оценка.quota ?? null,
      поддерживается: true,
    }
  } catch {
    return {
      постоянное: false,
      занято: null,
      доступно: null,
      поддерживается: false,
    }
  }
}

/** Объём в понятном виде. `null` означает «браузер не сообщает». */
export function объём(байт: number | null): string {
  if (байт === null) return '—'
  if (байт < 1024) return `${байт} Б`
  if (байт < 1024 * 1024) return `${Math.round(байт / 1024)} КБ`
  return `${(байт / (1024 * 1024)).toFixed(1)} МБ`
}
