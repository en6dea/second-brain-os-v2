import { describe, expect, it } from 'vitest'
import { база } from './db'
import { новаяЗапись } from './repo'

/** Надгробие пишется асинхронно после удаления — короткое ожидание с опросом. */
async function ждатьНадгробие(id: string, попыток = 20): Promise<void> {
  for (let номер = 0; номер < попыток; номер += 1) {
    if (await база.syncTombstones.get(id)) return
    await new Promise((resolve) => setTimeout(resolve, 10))
  }
}

/**
 * Хук удаления, который кладёт надгробие в `syncTombstones`.
 *
 * Проверяется на самой базе, а не на изолированной функции: смысл хука
 * именно в том, что он срабатывает на настоящий вызов `.delete()`, каким бы
 * способом он ни был вызван в остальном коде.
 */
describe('надгробия удалений', () => {
  it('удаление задачи оставляет надгробие', async () => {
    const задача = новаяЗапись({
      название: 'Проверка надгробия',
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
    })

    await база.tasks.add(задача as never)
    await база.tasks.delete(задача.id)
    // Надгробие пишется в onsuccess удаления — это отдельный, следующий
    // момент, а не часть той же транзакции. Ждём его явно.
    await ждатьНадгробие(`tasks:${задача.id}`)

    const надгробие = await база.syncTombstones.get(`tasks:${задача.id}`)
    expect(надгробие).toMatchObject({ таблица: 'tasks', recordId: задача.id })
    expect(надгробие?.удаленоВ.length).toBeGreaterThan(0)
  })

  it('удаление из настроек надгробия не оставляет', async () => {
    const допустимыйСчётчик = await база.syncTombstones.count()
    await база.settings.delete('несуществующий-ключ')
    expect(await база.syncTombstones.count()).toBe(допустимыйСчётчик)
  })

  it('id надгробия составной и не путает записи из разных таблиц', async () => {
    const цель = новаяЗапись({
      название: 'Цель',
      зачем: '',
      сфераId: null,
      состояние: 'активна',
      срок: null,
      цель: null,
      текущее: null,
      единица: '',
      порядок: 0,
      вехи: [],
      последняяАктивность: null,
      постер: '',
    })
    await база.goals.add(цель as never)
    await база.goals.delete(цель.id)
    await ждатьНадгробие(`goals:${цель.id}`)

    const надгробие = await база.syncTombstones.get(`goals:${цель.id}`)
    expect(надгробие?.таблица).toBe('goals')
  })
})
