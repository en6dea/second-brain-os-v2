import { describe, expect, it } from 'vitest'
import { parseTelegramCapture } from './telegram'

describe('Telegram commands', () => {
  it('принимает только явную задачу или заметку', () => {
    expect(parseTelegramCapture('/task Позвонить клиенту')).toEqual({
      kind: 'task',
      text: 'Позвонить клиенту',
    })
    expect(parseTelegramCapture('примечание: Идея для проекта')).toEqual({
      kind: 'note',
      text: 'Идея для проекта',
    })
    expect(parseTelegramCapture('просто сообщение')).toBeNull()
  })

  it('не создаёт пустую запись', () => {
    expect(parseTelegramCapture('/task')).toBeNull()
    expect(parseTelegramCapture('/note   ')).toBeNull()
  })
})
