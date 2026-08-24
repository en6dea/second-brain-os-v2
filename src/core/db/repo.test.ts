import { afterAll, describe, expect, it } from 'vitest'
import { база } from './db'
import { новаяЗапись, подготовитьПервыйЗапуск } from './repo'

afterAll(async () => {
  база.close()
  await база.delete()
})

/**
 * Проверка на возврат ошибки, из-за которой новая запись молча не
 * сохранялась: форма передавала пустой идентификатор, он затирал служебный,
 * а пустая строка ключом в IndexedDB не является.
 */
describe('новаяЗапись', () => {
  it('выдаёт идентификатор и время', () => {
    const запись = новаяЗапись({ название: 'Что-то' })
    expect(запись.id.length).toBeGreaterThan(0)
    expect(запись.createdAt).toBe(запись.updatedAt)
  })

  it('пустой идентификатор из формы заменяется новым', () => {
    expect(новаяЗапись({ id: '' }).id.length).toBeGreaterThan(0)
    expect(новаяЗапись({ id: '   ' }).id.length).toBeGreaterThan(0)
  })

  it('отсутствующий идентификатор не оставляет запись без ключа', () => {
    // Именно так приходит черновик формы: поле есть, значения нет.
    const черновик: Record<string, unknown> = {
      id: undefined,
      название: 'Замысел',
    }
    expect(String(новаяЗапись(черновик).id).length).toBeGreaterThan(0)
  })

  it('свой идентификатор сохраняется', () => {
    expect(новаяЗапись({ id: 'мой-ключ' }).id).toBe('мой-ключ')
  })

  it('время из прежней версии переопределяет служебное', () => {
    const запись = новаяЗапись({ createdAt: '2019-05-01T00:00:00.000Z' })
    expect(запись.createdAt).toBe('2019-05-01T00:00:00.000Z')
  })
})

describe('подготовитьПервыйЗапуск', () => {
  it('не создаёт дубли справочников при параллельном запуске', async () => {
    await Promise.all([подготовитьПервыйЗапуск(), подготовитьПервыйЗапуск()])

    expect(await база.areas.count()).toBe(6)
    expect(await база.moneyCategories.count()).toBe(17)
  })
})
