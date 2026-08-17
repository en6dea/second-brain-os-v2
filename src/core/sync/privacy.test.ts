import { describe, expect, it } from 'vitest'
import { можноСинхронизировать } from './privacy'

describe('можноСинхронизировать', () => {
  it('настройки устройства не синхронизируются', () => {
    expect(можноСинхронизировать('settings')).toBe(false)
  })

  it('дни партнёра синхронизируются как любая другая таблица', () => {
    expect(можноСинхронизировать('partnerDays')).toBe(true)
  })

  it('дневник синхронизируется целиком, включая личные записи', () => {
    expect(можноСинхронизировать('journal')).toBe(true)
  })

  it('обычные таблицы синхронизируются', () => {
    expect(можноСинхронизировать('tasks')).toBe(true)
    expect(можноСинхронизировать('goals')).toBe(true)
    expect(можноСинхронизировать('operations')).toBe(true)
  })
})
