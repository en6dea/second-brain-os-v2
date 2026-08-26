export interface TelegramEnv {
  TELEGRAM_DB: D1Database
  TELEGRAM_BOT_TOKEN: string
  TELEGRAM_WEBHOOK_SECRET: string
  TELEGRAM_BOT_USERNAME?: string
}

interface TelegramUpdate {
  update_id?: number
  message?: {
    text?: string
    chat?: { id?: number }
  }
}

interface TelegramLinkRow {
  id: string
  chat_id: string | null
  expires_at: string
  linked_at: string | null
}

export interface ParsedTelegramCapture {
  kind: 'task' | 'note'
  text: string
}

const КОДОВЫЙ_АЛФАВИТ = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const СРОК_ПРИВЯЗКИ_МС = 15 * 60 * 1000
const МАКСИМУМ_ТЕКСТА = 1_000

function json(данные: unknown, статус = 200): Response {
  return Response.json(данные, {
    status: статус,
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}

function случайнаяСтрока(длина: number, алфавит: string): string {
  const байты = crypto.getRandomValues(new Uint8Array(длина))
  return Array.from(байты, (байт) => алфавит[байт % алфавит.length]).join('')
}

function токен(): string {
  const байты = crypto.getRandomValues(new Uint8Array(32))
  let двоичная = ''
  for (const байт of байты) двоичная += String.fromCharCode(байт)
  return btoa(двоичная).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

async function хеш(значение: string): Promise<string> {
  const буфер = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(значение),
  )
  return Array.from(new Uint8Array(буфер), (байт) =>
    байт.toString(16).padStart(2, '0'),
  ).join('')
}

function bearer(запрос: Request): string {
  return (запрос.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
}

async function ссылкаПоТокену(
  запрос: Request,
  env: TelegramEnv,
): Promise<TelegramLinkRow | null> {
  const значение = bearer(запрос)
  if (!значение) return null
  const tokenHash = await хеш(значение)
  return env.TELEGRAM_DB.prepare(
    'SELECT id, chat_id, expires_at, linked_at FROM telegram_links WHERE token_hash = ?',
  )
    .bind(tokenHash)
    .first<TelegramLinkRow>()
}

/** Явные команды: свободный текст не угадывается и не создаёт запись. */
export function parseTelegramCapture(текст: string): ParsedTelegramCapture | null {
  const очищено = текст.trim()
  const задача = очищено.match(/^(?:\/task(?:@\w+)?|задача)\s*[:—-]?\s+(.+)$/iu)
  if (задача?.[1]?.trim()) {
    return { kind: 'task', text: задача[1].trim().slice(0, МАКСИМУМ_ТЕКСТА) }
  }
  const заметка = очищено.match(
    /^(?:\/note(?:@\w+)?|заметка|примечание)\s*[:—-]?\s+(.+)$/iu,
  )
  if (заметка?.[1]?.trim()) {
    return { kind: 'note', text: заметка[1].trim().slice(0, МАКСИМУМ_ТЕКСТА) }
  }
  return null
}

async function сообщение(env: TelegramEnv, chatId: string, text: string) {
  if (!env.TELEGRAM_BOT_TOKEN) return
  await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  })
}

const СПРАВКА =
  'Я принимаю только явные команды:\n/task Позвонить клиенту\n/note Идея для проекта\n\nСначала подключите приложение командой /link КОД.'

async function создатьПривязку(env: TelegramEnv): Promise<Response> {
  const теперь = new Date()
  await env.TELEGRAM_DB.prepare(
    'DELETE FROM telegram_links WHERE chat_id IS NULL AND expires_at < ?',
  )
    .bind(теперь.toISOString())
    .run()

  for (let попытка = 0; попытка < 3; попытка += 1) {
    const accessToken = токен()
    const code = случайнаяСтрока(8, КОДОВЫЙ_АЛФАВИТ)
    const expiresAt = new Date(теперь.getTime() + СРОК_ПРИВЯЗКИ_МС).toISOString()
    try {
      await env.TELEGRAM_DB.prepare(
        'INSERT INTO telegram_links (id, code, token_hash, created_at, expires_at) VALUES (?, ?, ?, ?, ?)',
      )
        .bind(
          crypto.randomUUID(),
          code,
          await хеш(accessToken),
          теперь.toISOString(),
          expiresAt,
        )
        .run()
      return json({
        code,
        token: accessToken,
        expiresAt,
        botUsername: env.TELEGRAM_BOT_USERNAME ?? null,
      })
    } catch (error) {
      if (попытка === 2) throw error
    }
  }
  return json({ error: 'Не удалось создать код' }, 500)
}

async function статус(запрос: Request, env: TelegramEnv): Promise<Response> {
  const ссылка = await ссылкаПоТокену(запрос, env)
  if (!ссылка) return json({ error: 'Неверный токен привязки' }, 401)
  const ещёДействует =
    ссылка.chat_id !== null || ссылка.expires_at > new Date().toISOString()
  if (!ещёДействует) return json({ error: 'Код привязки истёк' }, 410)
  return json({
    linked: ссылка.chat_id !== null,
    botUsername: env.TELEGRAM_BOT_USERNAME ?? null,
  })
}

async function получитьЗаписи(
  запрос: Request,
  env: TelegramEnv,
): Promise<Response> {
  const ссылка = await ссылкаПоТокену(запрос, env)
  if (!ссылка?.chat_id) return json({ error: 'Telegram ещё не подключён' }, 401)
  const результат = await env.TELEGRAM_DB.prepare(
    'SELECT id, kind, text, created_at AS createdAt FROM telegram_captures WHERE link_id = ? ORDER BY created_at ASC LIMIT 50',
  )
    .bind(ссылка.id)
    .all()
  return json({ captures: результат.results })
}

async function подтвердитьЗаписи(
  запрос: Request,
  env: TelegramEnv,
): Promise<Response> {
  const ссылка = await ссылкаПоТокену(запрос, env)
  if (!ссылка?.chat_id) return json({ error: 'Telegram ещё не подключён' }, 401)
  const тело = (await запрос.json().catch(() => null)) as { ids?: unknown } | null
  const ids = Array.isArray(тело?.ids)
    ? тело.ids.filter((id): id is string => typeof id === 'string').slice(0, 50)
    : []
  if (ids.length === 0) return json({ deleted: 0 })
  const результаты = await env.TELEGRAM_DB.batch(
    ids.map((id) =>
      env.TELEGRAM_DB.prepare(
        'DELETE FROM telegram_captures WHERE id = ? AND link_id = ?',
      ).bind(id, ссылка.id),
    ),
  )
  const deleted = результаты.reduce(
    (сумма, результат) => сумма + (результат.meta.changes ?? 0),
    0,
  )
  return json({ deleted })
}

async function отключить(запрос: Request, env: TelegramEnv): Promise<Response> {
  const ссылка = await ссылкаПоТокену(запрос, env)
  if (!ссылка) return json({ ok: true })
  await env.TELEGRAM_DB.prepare('DELETE FROM telegram_links WHERE id = ?')
    .bind(ссылка.id)
    .run()
  return json({ ok: true })
}

async function webhook(
  запрос: Request,
  env: TelegramEnv,
  ctx: ExecutionContext,
): Promise<Response> {
  const секрет = запрос.headers.get('X-Telegram-Bot-Api-Secret-Token') ?? ''
  if (!env.TELEGRAM_WEBHOOK_SECRET || секрет !== env.TELEGRAM_WEBHOOK_SECRET) {
    return json({ error: 'Неверный секрет webhook' }, 401)
  }
  const update = (await запрос.json().catch(() => null)) as TelegramUpdate | null
  const chatId = update?.message?.chat?.id
  const text = update?.message?.text?.trim()
  if (chatId === undefined || !text) return new Response(null, { status: 204 })
  const chat = String(chatId)

  const код = text.match(/^\/link(?:@\w+)?\s+([A-Z2-9]{8})$/iu)?.[1]?.toUpperCase()
  if (код) {
    const уже = await env.TELEGRAM_DB.prepare(
      'SELECT id FROM telegram_links WHERE chat_id = ?',
    )
      .bind(chat)
      .first()
    if (уже) {
      ctx.waitUntil(
        сообщение(env, chat, 'Этот чат уже подключён. Сначала отправьте /unlink.'),
      )
      return new Response(null, { status: 204 })
    }
    const результат = await env.TELEGRAM_DB.prepare(
      'UPDATE telegram_links SET chat_id = ?, linked_at = ? WHERE code = ? AND chat_id IS NULL AND expires_at > ?',
    )
      .bind(chat, new Date().toISOString(), код, new Date().toISOString())
      .run()
    ctx.waitUntil(
      сообщение(
        env,
        chat,
        (результат.meta.changes ?? 0) > 0
          ? 'Готово. Теперь: /task текст задачи или /note текст заметки.'
          : 'Код не найден или истёк. Создайте новый код в настройках приложения.',
      ),
    )
    return new Response(null, { status: 204 })
  }

  if (/^\/unlink(?:@\w+)?$/iu.test(text)) {
    await env.TELEGRAM_DB.prepare('DELETE FROM telegram_links WHERE chat_id = ?')
      .bind(chat)
      .run()
    ctx.waitUntil(
      сообщение(env, chat, 'Связь удалена вместе с недоставленными записями.'),
    )
    return new Response(null, { status: 204 })
  }

  if (/^\/(?:start|help)(?:@\w+)?$/iu.test(text)) {
    ctx.waitUntil(сообщение(env, chat, СПРАВКА))
    return new Response(null, { status: 204 })
  }

  const ссылка = await env.TELEGRAM_DB.prepare(
    'SELECT id, chat_id, expires_at, linked_at FROM telegram_links WHERE chat_id = ?',
  )
    .bind(chat)
    .first<TelegramLinkRow>()
  if (!ссылка) {
    ctx.waitUntil(сообщение(env, chat, СПРАВКА))
    return new Response(null, { status: 204 })
  }

  const запись = parseTelegramCapture(text)
  if (!запись || update?.update_id === undefined) {
    ctx.waitUntil(сообщение(env, chat, СПРАВКА))
    return new Response(null, { status: 204 })
  }

  const id = `telegram-${update.update_id}`
  const результат = await env.TELEGRAM_DB.prepare(
    'INSERT OR IGNORE INTO telegram_captures (id, link_id, source_update_id, kind, text, created_at) VALUES (?, ?, ?, ?, ?, ?)',
  )
    .bind(
      id,
      ссылка.id,
      String(update.update_id),
      запись.kind,
      запись.text,
      new Date().toISOString(),
    )
    .run()
  if ((результат.meta.changes ?? 0) > 0) {
    ctx.waitUntil(
      сообщение(
        env,
        chat,
        запись.kind === 'task'
          ? '✓ Задача принята. Появится в приложении при следующей синхронизации.'
          : '✓ Заметка принята во входящие. Появится при следующей синхронизации.',
      ),
    )
  }
  return new Response(null, { status: 204 })
}

export async function handleTelegram(
  запрос: Request,
  env: TelegramEnv,
  ctx: ExecutionContext,
): Promise<Response | null> {
  const путь = new URL(запрос.url).pathname
  if (путь === '/telegram/pair' && запрос.method === 'POST')
    return создатьПривязку(env)
  if (путь === '/telegram/status' && запрос.method === 'GET')
    return статус(запрос, env)
  if (путь === '/telegram/captures' && запрос.method === 'GET') {
    return получитьЗаписи(запрос, env)
  }
  if (путь === '/telegram/captures/ack' && запрос.method === 'POST') {
    return подтвердитьЗаписи(запрос, env)
  }
  if (путь === '/telegram/pair' && запрос.method === 'DELETE')
    return отключить(запрос, env)
  if (путь === '/telegram/webhook' && запрос.method === 'POST') {
    return webhook(запрос, env, ctx)
  }
  return путь.startsWith('/telegram/')
    ? json({ error: 'Маршрут не найден' }, 404)
    : null
}
