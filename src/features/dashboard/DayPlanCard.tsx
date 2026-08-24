import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { ArrowRight, Circle } from 'lucide-react'
import { база } from '@/core/db/db'
import { собратьПланДня, РАЗДЕЛ_ПО_ВИДУ } from '@/core/day/dayPlan'
import { новаяЗапись } from '@/core/db/repo'
import { новыйId, сейчас } from '@/core/db/RecordId'
import { сегодня } from '@/core/calendar/CalendarRu'
import {
  Card,
  CardHeader,
  CardBody,
  CheckMark,
  Skeleton,
  Button,
} from '@/design-system/components'
import { cn } from '@/design-system/classNames'
import type { ПунктПлана } from '@/core/db/types'

/**
 * План на день — короткий список из `core/day/dayPlan.ts`, собранный без
 * внешних сервисов и без сети. До подтверждения это только локальный черновик:
 * открытие страницы не должно само создавать записи от имени человека.
 *
 * Отметка задачи и привычки отражается и в самой записи — иначе появились
 * бы два источника правды о том, сделано что-то или нет.
 */
export function DayPlanCard() {
  const день = сегодня()
  const [сохраняется, установитьСохраняется] = useState(false)

  const данные = useLiveQuery(async () => {
    const [задачи, цели, привычки, обязательства, входящие, план] =
      await Promise.all([
        база.tasks.toArray(),
        база.goals.toArray(),
        база.habits.toArray(),
        база.obligations.toArray(),
        база.inbox.toArray(),
        база.dayPlans.where('день').equals(день).first(),
      ])
    return { задачи, цели, привычки, обязательства, входящие, план }
  }, [день])

  if (!данные) {
    return (
      <Card>
        <Skeleton строк={3} />
      </Card>
    )
  }

  const план = данные.план
  const черновик = план
    ? []
    : собратьПланДня(
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

  async function принятьПлан() {
    if (план || черновик.length === 0 || сохраняется) return
    const пункты: ПунктПлана[] = черновик.map((пункт, индекс) => ({
      ...пункт,
      id: новыйId(),
      порядок: индекс,
      выполнен: false,
    }))
    установитьСохраняется(true)
    try {
      await база.transaction('rw', база.dayPlans, async () => {
        const ужеЕсть = await база.dayPlans.where('день').equals(день).first()
        if (!ужеЕсть) {
          await база.dayPlans.add(новаяЗапись({ день, пункты }) as never)
        }
      })
    } finally {
      установитьСохраняется(false)
    }
  }

  if (!план) {
    return (
      <Card className="plan-surface flex h-full flex-col">
        <CardHeader
          заголовок="Предложенный план"
          подпись={
            черновик.length === 0
              ? 'Система не придумывает дела для заполнения экрана'
              : `${черновик.length} ${склонениеПунктов(черновик.length)} · пока не сохранён`
          }
        />
        <CardBody className="flex flex-1 flex-col">
          {черновик.length === 0 ? (
            <div className="flex flex-1 flex-col justify-center py-4">
              <p className="text-meta leading-relaxed text-ink-2">
                Добавьте задачу, привычку или обязательство — и здесь появится
                короткий, объяснимый черновик дня.
              </p>
              <Link
                to="/quick"
                className="mt-4 inline-flex min-h-11 items-center gap-2 self-start text-meta font-medium text-accent"
              >
                Быстро зафиксировать
                <ArrowRight size={16} />
              </Link>
            </div>
          ) : (
            <>
              <ul className="flex-1 divide-y divide-line">
                {черновик.map((пункт) => (
                  <li
                    key={`${пункт.вид}-${пункт.записьId}`}
                    className="flex gap-3 py-3 first:pt-0"
                  >
                    <Circle size={16} className="mt-1 shrink-0 text-accent" />
                    <span className="min-w-0">
                      <span className="block text-meta font-medium text-ink">
                        {пункт.заголовок}
                      </span>
                      <span className="mt-0.5 block text-caption leading-snug text-ink-3">
                        {пункт.зачем}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 border-t border-line pt-4">
                <Button
                  вид="основная"
                  наВсюШирину
                  disabled={сохраняется}
                  onClick={() => void принятьПлан()}
                >
                  {сохраняется ? 'Сохраняю…' : 'Принять план'}
                </Button>
                <p className="mt-2 text-center text-micro text-ink-3">
                  Только после подтверждения план сохранится в ваших данных
                </p>
              </div>
            </>
          )}
        </CardBody>
      </Card>
    )
  }

  async function переключить(пункт: ПунктПлана) {
    if (!план) return

    if (пункт.вид === 'задача') {
      await база.transaction('rw', база.dayPlans, база.tasks, async () => {
        const [текущийПлан, задача] = await Promise.all([
          база.dayPlans.get(план.id),
          база.tasks.get(пункт.записьId),
        ])
        const текущийПункт = текущийПлан?.пункты.find((п) => п.id === пункт.id)
        if (!текущийПлан || !текущийПункт || !задача) return
        if (задача.состояние === 'отменена') return

        const былаСделана = задача.состояние === 'сделана'
        const новоеСостояние = !былаСделана
        const исходное = текущийПункт.состояниеЗадачиДоВыполнения
        if (
          !новоеСостояние &&
          (!исходное || исходное === 'сделана' || исходное === 'отменена')
        ) {
          return
        }

        const обновлённыйПункт: ПунктПлана = {
          ...текущийПункт,
          выполнен: новоеСостояние,
        }
        if (новоеСостояние) {
          обновлённыйПункт.состояниеЗадачиДоВыполнения = задача.состояние
        } else {
          delete обновлённыйПункт.состояниеЗадачиДоВыполнения
        }
        const отметкаВремени = сейчас()
        await Promise.all([
          база.dayPlans.put({
            ...текущийПлан,
            пункты: текущийПлан.пункты.map((п) =>
              п.id === пункт.id ? обновлённыйПункт : п,
            ),
            updatedAt: отметкаВремени,
          }),
          база.tasks.put({
            ...задача,
            состояние: новоеСостояние ? 'сделана' : исходное!,
            выполненаВ: новоеСостояние ? отметкаВремени : null,
            updatedAt: отметкаВремени,
          }),
        ])
      })
    } else if (пункт.вид === 'привычка') {
      await база.transaction('rw', база.dayPlans, база.habits, async () => {
        const [текущийПлан, привычка] = await Promise.all([
          база.dayPlans.get(план.id),
          база.habits.get(пункт.записьId),
        ])
        const текущийПункт = текущийПлан?.пункты.find((п) => п.id === пункт.id)
        if (!текущийПлан || !текущийПункт || !привычка) return

        const отметки = { ...привычка.отметки }
        const новоеСостояние = (отметки[день] ?? 0) <= 0
        if (новоеСостояние) отметки[день] = привычка.норма || 1
        else delete отметки[день]
        const отметкаВремени = сейчас()
        await Promise.all([
          база.dayPlans.put({
            ...текущийПлан,
            пункты: текущийПлан.пункты.map((п) =>
              п.id === пункт.id ? { ...п, выполнен: новоеСостояние } : п,
            ),
            updatedAt: отметкаВремени,
          }),
          база.habits.put({
            ...привычка,
            отметки,
            updatedAt: отметкаВремени,
          }),
        ])
      })
    }
  }

  const задачиПлана = данные.задачи
  const привычкиПлана = данные.привычки

  function фактическиВыполнен(пункт: ПунктПлана): boolean {
    if (пункт.вид === 'задача') {
      return задачиПлана.some(
        (задача) =>
          задача.id === пункт.записьId && задача.состояние === 'сделана',
      )
    }
    if (пункт.вид === 'привычка') {
      return привычкиПлана.some(
        (привычка) =>
          привычка.id === пункт.записьId &&
          (привычка.отметки[день] ?? 0) > 0,
      )
    }
    return пункт.выполнен
  }

  const выполнено = план.пункты.filter(фактическиВыполнен).length

  return (
    <Card className="plan-surface">
      <CardHeader
        заголовок="План на сегодня"
        подпись={`${выполнено} из ${план.пункты.length} · подтверждён вами`}
      />
      <CardBody>
        <ul className="divide-y divide-line">
          {план.пункты.map((пункт) => (
            <li key={пункт.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
              {пункт.вид === 'задача' || пункт.вид === 'привычка' ? (
                <CheckMark
                  отмечено={фактическиВыполнен(пункт)}
                  подпись={`Отметить «${пункт.заголовок}» выполненным`}
                  disabled={
                    пункт.вид === 'задача' &&
                    (задачиПлана.some(
                      (задача) =>
                        задача.id === пункт.записьId &&
                        задача.состояние === 'отменена',
                    ) ||
                      (фактическиВыполнен(пункт) &&
                        !пункт.состояниеЗадачиДоВыполнения))
                  }
                  наПереключение={() => void переключить(пункт)}
                  className="mt-0.5"
                />
              ) : (
                <Circle size={16} className="mt-1 shrink-0 text-ink-3" />
              )}
              <div className="min-w-0 flex-1">
                <Link
                  to={РАЗДЕЛ_ПО_ВИДУ[пункт.вид]}
                  className={cn(
                    'flex min-h-11 flex-col justify-center py-0.5 hover:underline',
                    фактическиВыполнен(пункт) && 'text-ink-3',
                  )}
                >
                  <span
                    className={cn(
                      'block truncate text-meta font-medium text-ink',
                      фактическиВыполнен(пункт) && 'text-ink-3 line-through',
                    )}
                  >
                    {пункт.заголовок}
                  </span>
                  <span className="mt-0.5 flex items-center gap-1 truncate text-caption text-ink-3">
                    {пункт.зачем}
                    {пункт.вид !== 'задача' && пункт.вид !== 'привычка' ? (
                      <span className="text-accent">· открыть источник</span>
                    ) : null}
                  </span>
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </CardBody>
    </Card>
  )
}

function склонениеПунктов(число: number): string {
  const остаток100 = число % 100
  const остаток10 = число % 10
  if (остаток100 >= 11 && остаток100 <= 14) return 'пунктов'
  if (остаток10 === 1) return 'пункт'
  if (остаток10 >= 2 && остаток10 <= 4) return 'пункта'
  return 'пунктов'
}
