import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { база } from '@/core/db/db'
import { забратьTelegram, статусTelegram } from './Bridge'

const CONFIG = {
  endpoint: 'https://bridge.example.test',
  token: 'private-token',
  pairingCode: null,
  pairingExpiresAt: null,
}

describe('Telegram bridge', () => {
  beforeEach(async () => {
    await база.tasks.clear()
    await база.inbox.clear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('передаёт личный токен только в Authorization', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        Response.json({ linked: true, botUsername: 'second_brain_bot' }),
      )
    vi.stubGlobal('fetch', fetchMock)

    await статусTelegram(CONFIG)

    expect(fetchMock).toHaveBeenCalledWith(
      'https://bridge.example.test/telegram/status',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer private-token' }),
      }),
    )
    expect(fetchMock.mock.calls[0]?.[0]).not.toContain('private-token')
  })

  it('импортирует задачу и заметку один раз, затем подтверждает доставку', async () => {
    const captures = [
      {
        id: 'telegram-101',
        kind: 'task',
        text: 'Позвонить клиенту',
        createdAt: '2026-08-26T08:00:00.000Z',
      },
      {
        id: 'telegram-102',
        kind: 'note',
        text: 'Идея для проекта',
        createdAt: '2026-08-26T08:01:00.000Z',
      },
    ]
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ captures }))
      .mockResolvedValueOnce(Response.json({ deleted: 2 }))
      .mockResolvedValueOnce(Response.json({ captures }))
      .mockResolvedValueOnce(Response.json({ deleted: 2 }))
    vi.stubGlobal('fetch', fetchMock)

    expect(await забратьTelegram(CONFIG)).toEqual({ импортировано: 2, получено: 2 })
    expect(await забратьTelegram(CONFIG)).toEqual({ импортировано: 0, получено: 2 })
    expect(await база.tasks.count()).toBe(1)
    expect(await база.inbox.count()).toBe(1)
    expect((await база.inbox.toArray())[0]?.источник).toBe('telegram')

    const подтверждение = fetchMock.mock.calls[1]
    if (!подтверждение) throw new Error('Нет подтверждения доставки')
    expect(подтверждение[0]).toBe(
      'https://bridge.example.test/telegram/captures/ack',
    )
    expect(JSON.parse(String((подтверждение[1] as RequestInit).body))).toEqual({
      ids: ['telegram-101', 'telegram-102'],
    })
  })

  it('не дублирует запись при одновременной ручной и фоновой синхронизации', async () => {
    const captures = [
      {
        id: 'telegram-201',
        kind: 'task',
        text: 'Одна задача',
        createdAt: '2026-08-26T08:02:00.000Z',
      },
    ]
    const fetchMock = vi.fn((input: string | URL | Request) => {
      const url = String(input)
      return Promise.resolve(
        url.endsWith('/captures')
          ? Response.json({ captures })
          : Response.json({ deleted: 1 }),
      )
    })
    vi.stubGlobal('fetch', fetchMock)

    await Promise.all([забратьTelegram(CONFIG), забратьTelegram(CONFIG)])

    expect(await база.tasks.count()).toBe(1)
    expect((await база.tasks.toArray())[0]?.название).toBe('Одна задача')
  })
})
