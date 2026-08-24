import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { база } from '@/core/db/db'
import { новаяЗапись } from '@/core/db/repo'
import type { КатегорияДенег } from '@/core/db/types'
import { итогПериода, расходыПоКатегориям } from '@/features/finance/model/calc'
import { деньги, копейкиВРубли, рублиВКопейки } from '@/core/money/Money'
import {
  границыМесяца,
  месяцСловами,
  текущийМесяц,
} from '@/core/calendar/CalendarRu'
import { сейчас } from '@/core/db/RecordId'
import { useИнтерфейс } from '@/app/providers/ui'
import {
  MoneyInput,
  Skeleton,
  Card,
  Button,
  Metric,
  Field,
  ProgressBar,
  EmptyState,
  CardHeader,
  CardBody,
} from '@/design-system/components'

export function BudgetPage() {
  const сообщить = useИнтерфейс((с) => с.сообщить)
  const месяц = текущийМесяц()
  const [плановыйДоход, установитьПлановыйДоход] = useState<string | null>(null)

  const данные = useLiveQuery(async () => {
    const [категории, операции, бюджеты] = await Promise.all([
      база.moneyCategories.filter((к) => !к.архив).toArray(),
      база.operations.toArray(),
      база.budgets.where('месяц').equals(месяц).toArray(),
    ])
    return { категории, операции, бюджет: бюджеты[0] ?? null }
  }, [месяц])

  if (!данные) {
    return (
      <Card>
        <Skeleton строк={4} />
      </Card>
    )
  }

  const границы = границыМесяца(месяц)
  const период = итогПериода(данные.операции, границы.от, границы.до)
  const факт = расходыПоКатегориям(данные.операции, границы.от, границы.до)

  const лимитыЗафиксированы = (данные.бюджет?.строки.length ?? 0) > 0
  const снимокЛимитов = new Map(
    (данные.бюджет?.строки ?? []).map((строка) => [
      строка.категорияId,
      строка.лимит,
    ]),
  )
  const естьЛимитыШаблона = данные.категории.some(
    (категория) => категория.вид === 'расход' && категория.месячныйЛимит !== null,
  )
  const сЛимитами = данные.категории
    .filter((категория) => категория.вид === 'расход')
    .map((категория) => ({
      категория,
      лимит: лимитыЗафиксированы
        ? (снимокЛимитов.get(категория.id) ?? null)
        : категория.месячныйЛимит,
    }))
    .filter((строка) => строка.лимит !== null) as {
    категория: КатегорияДенег
    лимит: number
  }[]
  const суммаЛимитов = сЛимитами.reduce((итог, строка) => итог + строка.лимит, 0)
  const планДохода = данные.бюджет?.плановыйДоход ?? null

  const значениеПоля =
    плановыйДоход ?? (планДохода === null ? '' : String(копейкиВРубли(планДохода)))

  async function сохранитьПлан() {
    const сумма = рублиВКопейки(значениеПоля)
    if (данные?.бюджет) {
      await база.budgets.put({
        ...данные.бюджет,
        плановыйДоход: сумма,
        updatedAt: сейчас(),
      })
    } else {
      await база.budgets.add(
        новаяЗапись({ месяц, плановыйДоход: сумма, строки: [] }) as never,
      )
    }
    сообщить('План дохода сохранён')
    установитьПлановыйДоход(null)
  }

  async function зафиксироватьЛимиты() {
    if (!данные) return
    const строки = данные.категории
      .filter(
        (категория) =>
          категория.вид === 'расход' && категория.месячныйЛимит !== null,
      )
      .map((категория) => ({
        категорияId: категория.id,
        лимит: категория.месячныйЛимит ?? 0,
      }))
    if (строки.length === 0) {
      сообщить('Сначала задайте хотя бы один лимит в категориях')
      return
    }
    if (данные.бюджет) {
      await база.budgets.put({
        ...данные.бюджет,
        строки,
        updatedAt: сейчас(),
      })
    } else {
      await база.budgets.add(
        новаяЗапись({ месяц, плановыйДоход: null, строки }) as never,
      )
    }
    сообщить('Лимиты зафиксированы для этого месяца')
  }

  return (
    <div className="anim-rise space-y-5">
      <Card>
        <CardHeader
          заголовок={`Бюджет · ${месяцСловами(месяц)}`}
          подпись={
            лимитыЗафиксированы
              ? 'Лимиты сохранены снимком месяца и не изменятся вместе с шаблоном категорий'
              : 'Пока показан шаблон из категорий — зафиксируйте его для истории месяца'
          }
          действие={
            <Button
              вид="контур"
              размер="малый"
              onClick={зафиксироватьЛимиты}
              disabled={!естьЛимитыШаблона}
            >
              {лимитыЗафиксированы ? 'Обновить снимок' : 'Зафиксировать лимиты'}
            </Button>
          }
        />
        <div className="grid grid-cols-2 gap-5 px-5 pb-5 lg:grid-cols-4">
          <Metric
            подпись="План дохода"
            значение={деньги(планДохода)}
            источник={планДохода === null ? 'не задан' : 'на этот месяц'}
          />
          <Metric
            подпись="Получено"
            значение={деньги(период.доходы)}
            тон={период.доходы > 0 ? 'успех' : 'нейтральный'}
            источник="фактические доходы месяца"
          />
          <Metric
            подпись="Сумма лимитов"
            значение={деньги(суммаЛимитов)}
            источник={`категорий с лимитом: ${сЛимитами.length}`}
          />
          <Metric
            подпись="Израсходовано"
            значение={деньги(период.расходы)}
            тон={
              суммаЛимитов > 0 && период.расходы > суммаЛимитов
                ? 'опасность'
                : 'нейтральный'
            }
            источник="все расходы месяца"
          />
        </div>

        <div className="border-t border-line px-5 py-4">
          <div className="flex flex-wrap items-end gap-3">
            <Field подпись="План дохода на месяц" className="w-56">
              <MoneyInput
                value={значениеПоля}
                onChange={установитьПлановыйДоход}
                placeholder="не задан"
              />
            </Field>
            <Button onClick={сохранитьПлан}>Сохранить</Button>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader
          заголовок="Лимиты по категориям"
          подпись="Категории без лимита показаны отдельно — они не считаются нулевыми"
        />
        {сЛимитами.length === 0 ? (
          <EmptyState
            заголовок="Лимиты ещё не заданы"
            подпись="Задайте месячный лимит хотя бы для одной категории расходов — тогда бюджет начнёт что-то означать."
            действие={
              <Link
                to="/finance/categories"
                className="inline-flex h-10 items-center rounded-2 border border-accent-line px-4 text-sm font-medium text-accent transition-colors hover:bg-accent-soft"
              >
                К категориям
              </Link>
            }
          />
        ) : (
          <div className="divide-y divide-line border-t border-line">
            {сЛимитами
              .sort((а, б) => {
                const фактА = факт.get(а.категория.id) ?? 0
                const фактБ = факт.get(б.категория.id) ?? 0
                return фактБ / (б.лимит || 1) - фактА / (а.лимит || 1)
              })
              .map(({ категория, лимит }) => {
                const потрачено = факт.get(категория.id) ?? 0
                const превышено = потрачено > лимит
                return (
                  <div key={категория.id} className="px-5 py-3.5">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="min-w-0 truncate text-meta text-ink">
                        {категория.название}
                      </p>
                      <span className="tnum shrink-0 text-meta text-ink-2">
                        {деньги(потрачено)} из {деньги(лимит)}
                        {превышено ? (
                          <span className="ml-2 text-bad">
                            +{деньги(потрачено - лимит)}
                          </span>
                        ) : null}
                      </span>
                    </div>
                    <div className="mt-2.5">
                      <ProgressBar
                        значение={потрачено}
                        из={лимит}
                        тон={превышено ? 'опасность' : 'успех'}
                      />
                    </div>
                  </div>
                )
              })}
          </div>
        )}
      </Card>

      {данные.категории.some((категория) => {
        if (категория.вид !== 'расход') return false
        return лимитыЗафиксированы
          ? !снимокЛимитов.has(категория.id)
          : категория.месячныйЛимит === null
      }) ? (
        <Card>
          <CardHeader заголовок="Без лимита" подпись="Тратятся, но не ограничены" />
          <CardBody>
            <div className="flex flex-wrap gap-2">
              {данные.категории
                .filter((категория) => {
                  if (категория.вид !== 'расход') return false
                  return лимитыЗафиксированы
                    ? !снимокЛимитов.has(категория.id)
                    : категория.месячныйЛимит === null
                })
                .map((категория) => (
                  <span
                    key={категория.id}
                    className="tnum rounded-full border border-line px-3 py-1.5 text-caption text-ink-2"
                  >
                    {категория.название} · {деньги(факт.get(категория.id) ?? 0)}
                  </span>
                ))}
            </div>
          </CardBody>
        </Card>
      ) : null}
    </div>
  )
}
