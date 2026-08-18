import { useLiveQuery } from 'dexie-react-hooks'
import { база } from '@/core/db/db'
import { собратьСигналы } from '@/core/signals/engine'
import type { Сигнал } from '@/core/db/types'

/**
 * Сигналы своего раздела — для страниц вне Главной.
 *
 * Считает те же данные, что и Главная (`DashboardPage.tsx`), одним общим
 * запросом, и просто отфильтровывает по `раздел`: движок сигналов один на
 * всё приложение, здесь не заводится вторая копия его правил.
 *
 * `undefined` — данные ещё грузятся.
 */
export function useСигналыПоРазделам(разделы: string[]): Сигнал[] | undefined {
  const все = useLiveQuery(async () => {
    const [
      задачи,
      привычки,
      цели,
      счета,
      операции,
      обязательства,
      входящих,
      проекты,
      опыт,
      вызовы,
      планы,
      люди,
      категории,
    ] = await Promise.all([
      база.tasks.toArray(),
      база.habits.toArray(),
      база.goals.toArray(),
      база.accounts.toArray(),
      база.operations.toArray(),
      база.obligations.toArray(),
      база.inbox.filter((з) => !з.разобрано).count(),
      база.projects.toArray(),
      база.experiences.toArray(),
      база.challenges.toArray(),
      база.plans.toArray(),
      база.people.toArray(),
      база.moneyCategories.toArray(),
    ])
    return собратьСигналы({
      задачи,
      привычки,
      цели,
      счета,
      операции,
      обязательства,
      входящих,
      проекты,
      опыт,
      вызовы,
      планы,
      люди,
      категории,
    })
  }, [])

  if (!все) return undefined
  return все.filter((сигнал) => разделы.includes(сигнал.раздел))
}
