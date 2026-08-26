import { база } from '@/core/db/db'
import { новаяЗапись } from '@/core/db/repo'
import type { Настройки } from '@/core/db/types'

export type TelegramConfig = NonNullable<Настройки['telegram']>

export interface TelegramPair {
  code: string
  token: string
  expiresAt: string
  botUsername: string | null
}

export interface TelegramStatus {
  linked: boolean
  botUsername: string | null
}

interface TelegramCapture {
  id: string
  kind: 'task' | 'note'
  text: string
  createdAt: string
}

function endpoint(значение: string): string {
  const адрес = new URL(значение.trim())
  if (адрес.protocol !== 'https:' && адрес.hostname !== '127.0.0.1') {
    throw new Error('Адрес моста должен начинаться с https://')
  }
  return адрес.origin + адрес.pathname.replace(/\/+$/g, '')
}

async function прочитать<T>(ответ: Response): Promise<T> {
  const тело = (await ответ.json().catch(() => null)) as
    (T & { error?: string }) | null
  if (!ответ.ok) throw new Error(тело?.error ?? 'Telegram-мост не ответил')
  return тело as T
}

function заголовки(config: TelegramConfig): HeadersInit {
  return {
    Authorization: `Bearer ${config.token}`,
    'Content-Type': 'application/json',
  }
}

export async function создатьПривязкуTelegram(
  адрес: string,
): Promise<TelegramPair> {
  const корень = endpoint(адрес)
  return прочитать<TelegramPair>(
    await fetch(`${корень}/telegram/pair`, { method: 'POST' }),
  )
}

export async function статусTelegram(
  config: TelegramConfig,
): Promise<TelegramStatus> {
  return прочитать<TelegramStatus>(
    await fetch(`${endpoint(config.endpoint)}/telegram/status`, {
      headers: заголовки(config),
    }),
  )
}

function telegramId(legacy: Record<string, unknown> | undefined): string | null {
  const значение = legacy?.telegramCaptureId
  return typeof значение === 'string' ? значение : null
}

async function импортировать(captures: TelegramCapture[]): Promise<number> {
  if (captures.length === 0) return 0
  let импортировано = 0
  await база.transaction('rw', база.tasks, база.inbox, async () => {
    // Читаем уже внутри write-транзакции: параллельная ручная и фоновая
    // синхронизация тогда сериализуются и не создают два одинаковых объекта.
    const [задачи, входящие] = await Promise.all([
      база.tasks.toArray(),
      база.inbox.toArray(),
    ])
    const уже = new Set([
      ...задачи.map((запись) => telegramId(запись.legacy)).filter(Boolean),
      ...входящие.map((запись) => telegramId(запись.legacy)).filter(Boolean),
    ])

    for (const запись of captures) {
      if (уже.has(запись.id)) continue
      const legacy = {
        telegramCaptureId: запись.id,
        telegramCreatedAt: запись.createdAt,
      }
      if (запись.kind === 'task') {
        await база.tasks.add(
          новаяЗапись({
            название: запись.text,
            заметка: '',
            дата: null,
            время: null,
            длительностьМинут: null,
            состояние: 'новая',
            важность: 'обычная',
            проектId: null,
            цельId: null,
            сфераId: null,
            выполненаВ: null,
            переносов: 0,
            повтор: null,
            legacy,
          }) as never,
        )
      } else {
        await база.inbox.add(
          новаяЗапись({
            текст: запись.text,
            разобрано: false,
            источник: 'telegram' as const,
            legacy,
          }) as never,
        )
      }
      уже.add(запись.id)
      импортировано += 1
    }
  })
  return импортировано
}

/** Импорт идемпотентен: повторная доставка узнаётся по telegramCaptureId. */
export async function забратьTelegram(
  config: TelegramConfig,
): Promise<{ импортировано: number; получено: number }> {
  const корень = endpoint(config.endpoint)
  const ответ = await прочитать<{ captures: TelegramCapture[] }>(
    await fetch(`${корень}/telegram/captures`, { headers: заголовки(config) }),
  )
  const captures = Array.isArray(ответ.captures) ? ответ.captures : []
  const импортировано = await импортировать(captures)

  if (captures.length > 0) {
    await прочитать<{ deleted: number }>(
      await fetch(`${корень}/telegram/captures/ack`, {
        method: 'POST',
        headers: заголовки(config),
        body: JSON.stringify({ ids: captures.map((запись) => запись.id) }),
      }),
    )
  }
  return { импортировано, получено: captures.length }
}

export async function отключитьTelegram(config: TelegramConfig): Promise<void> {
  await прочитать<{ ok: boolean }>(
    await fetch(`${endpoint(config.endpoint)}/telegram/pair`, {
      method: 'DELETE',
      headers: заголовки(config),
    }),
  )
}

export function нормализоватьTelegramEndpoint(адрес: string): string {
  return endpoint(адрес)
}
