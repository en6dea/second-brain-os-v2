import { handleTelegram, type TelegramEnv } from './telegram'

/**
 * Прокси к Anthropic API для помощника «Второго мозга».
 *
 * Единственная задача: спрятать ключ Anthropic. Приложение — статический
 * сайт на GitHub Pages, ключ в его коде виден кому угодно. Здесь ключ лежит
 * секретом воркера (`wrangler secret put ANTHROPIC_API_KEY`), браузер его не
 * видит и никогда не увидит.
 *
 * Второй секрет, `ОБЩИЙ_ТОКЕН`, — не защита ключа Anthropic (та уже есть),
 * а защита от чужого счёта: без него воркер отвечал бы любому, кто узнал его
 * адрес, и чужие запросы шли бы в вашу оплату.
 */

interface Окружение extends TelegramEnv {
  ANTHROPIC_API_KEY: string
  ОБЩИЙ_ТОКЕН: string
}

/** Кому разрешён доступ. Локальный адрес — для разработки, второй — сама страница. */
const РАЗРЕШЁННЫЕ_ИСТОЧНИКИ = new Set([
  'https://en6dea.github.io',
  'http://127.0.0.1:5173',
])

function заголовкиCORS(источник: string | null): Record<string, string> {
  const разрешён = источник !== null && РАЗРЕШЁННЫЕ_ИСТОЧНИКИ.has(источник)
  return {
    'Access-Control-Allow-Origin': разрешён ? источник : 'https://en6dea.github.io',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Max-Age': '86400',
  }
}

function ответОшибка(
  текст: string,
  код: number,
  cors: Record<string, string>,
): Response {
  return new Response(JSON.stringify({ ошибка: текст }), {
    status: код,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}

export default {
  async fetch(
    запрос: Request,
    окружение: Окружение,
    контекст: ExecutionContext,
  ): Promise<Response> {
    const источник = запрос.headers.get('Origin')
    const cors = заголовкиCORS(источник)

    if (запрос.method === 'OPTIONS') {
      return new Response(null, { headers: cors })
    }

    const telegramОтвет = await handleTelegram(запрос, окружение, контекст)
    if (telegramОтвет) {
      const ответ = new Response(telegramОтвет.body, telegramОтвет)
      for (const [имя, значение] of Object.entries(cors)) {
        ответ.headers.set(имя, значение)
      }
      return ответ
    }

    if (запрос.method !== 'POST' || new URL(запрос.url).pathname !== '/assistant') {
      return ответОшибка('Только POST /assistant', 404, cors)
    }

    const заголовокАвторизации = запрос.headers.get('Authorization') ?? ''
    const переданныйТокен = заголовокАвторизации.replace(/^Bearer\s+/i, '')
    if (!окружение.ОБЩИЙ_ТОКЕН || переданныйТокен !== окружение.ОБЩИЙ_ТОКЕН) {
      return ответОшибка('Неверный токен', 401, cors)
    }

    let тело: unknown
    try {
      тело = await запрос.json()
    } catch {
      return ответОшибка('Тело запроса — не JSON', 400, cors)
    }

    const ответAnthropic = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': окружение.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(тело),
    })

    const текстОтвета = await ответAnthropic.text()
    return new Response(текстОтвета, {
      status: ответAnthropic.status,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  },
}
