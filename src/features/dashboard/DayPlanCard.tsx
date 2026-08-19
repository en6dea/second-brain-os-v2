import { useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { база } from '@/core/db/db'
import { собратьПланДня, РАЗДЕЛ_ПО_ВИДУ } from '@/core/day/dayPlan'
import { новаяЗапись } from '@/core/db/repo'
import { новыйId, сейчас } from '@/core/db/RecordId'
import { сегодня } from '@/core/calendar/CalendarRu'
import { Card, CardHeader, CardBody, CheckMark, Skeleton } from '@/design-system/components'
import { cn } from '@/design-system/classNames'
import type { ПунктПлана } from '@/core/db/types'

/**
 * План на день — короткий список из `core/day/dayPlan.ts`, собранный без
 * внешних сервисов и без сети. Собирается один раз при первом заходе за
 * день и дальше только отмечается: пересборка на каждой перезагрузке
 * заставляла бы список скакать.
 *
 * Отметка задачи и привычки отражается и в самой записи — иначе появились
 * бы два источника правды о том, сделано что-то или нет.
 */
export function DayPlanCard() {
  const день = сегодня()

  const данные = useLiveQuery(async () => {
    const [задачи, цели, привычки, обязательства, входящие, план] = await Promise.all([
      база.tasks.toArray(),
      база.goals.toArray(),
      база.habits.toArray(),
      база.obligations.toArray(),
      база.inbox.toArray(),
      база.dayPlans.where('день').equals(день).first(),
    ])
    return { задачи, цели, привычки, обязательства, входящие, план }
  }, [день])

  useEffect(() => {
    if (!данные || данные.план) return

    void (async () => {
      const черновик = собратьПланДня(
        {
          задачи: данные.задачи,
          цели: данные.цели,
          привычки: данные.привычки,
          обязательства: данные.обязательства,
          замыслы: [],
          входящие: данные.входящие,
        },
        день,
        new Date().getHours(),
      )
      if (черновик.length === 0) return

      const пункты: ПунктПлана[] = черновик.map((пункт, индекс) => ({
        ...пункт,
        id: новыйId(),
        порядок: индекс,
        выполнен: false,
      }))
      await база.dayPlans.add(новаяЗапись({ день, пункты }) as never)
    })()
  }, [данные, день])

  if (!данные) {
    return (
      <Card>
        <Skeleton строк={3} />
      </Card>
    )
  }

  const план = данные.план
  if (!план || план.пункты.length === 0) return null

  async function переключить(пункт: ПунктПлана) {
    if (!план) return
    const новоеСостояние = !пункт.выполнен

    const пункты = план.пункты.map((п) =>
      п.id === пункт.id ? { ...п, выполнен: новоеСостояние } : п,
    )
    await база.dayPlans.put({ ...план, пункты, updatedAt: сейчас() })

    if (пункт.вид === 'задача') {
      const задача = данные?.задачи.find((з) => з.id === пункт.записьId)
      if (задача) {
        await база.tasks.put({
          ...задача,
          состояние: новоеСостояние ? 'сделана' : 'новая',
          выполненаВ: новоеСостояние ? сейчас() : null,
          updatedAt: сейчас(),
        })
      }
    } else if (пункт.вид === 'привычка') {
      const привычка = данные?.привычки.find((п) => п.id === пункт.записьId)
      if (привычка) {
        const отметки = { ...привычка.отметки }
        if (новоеСостояние) отметки[день] = привычка.норма || 1
        else delete отметки[день]
        await база.habits.put({ ...привычка, отметки, updatedAt: сейчас() })
      }
    }
  }

  const выполнено = план.пункты.filter((п) => п.выполнен).length

  return (
    <Card>
      <CardHeader
        заголовок="План на сегодня"
        подпись={`${выполнено} из ${план.пункты.length} · собран из ваших записей`}
      />
      <CardBody>
        <ul className="divide-y divide-line">
          {план.пункты.map((пункт) => (
            <li key={пункт.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
              <CheckMark
                отмечено={пункт.выполнен}
                подпись={`Отметить «${пункт.заголовок}» выполненным`}
                наПереключение={() => void переключить(пункт)}
                className="mt-0.5"
              />
              <div className="min-w-0 flex-1">
                <Link
                  to={РАЗДЕЛ_ПО_ВИДУ[пункт.вид]}
                  className={cn(
                    'block truncate text-meta font-medium text-ink hover:underline',
                    пункт.выполнен && 'text-ink-3 line-through',
                  )}
                >
                  {пункт.заголовок}
                </Link>
                <p className="mt-0.5 truncate text-caption text-ink-3">{пункт.зачем}</p>
              </div>
            </li>
          ))}
        </ul>
      </CardBody>
    </Card>
  )
}
