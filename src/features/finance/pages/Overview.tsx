import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { база } from '@/core/db/db'
import { читатьНастройки } from '@/core/db/repo'
import {
  итогОбязательств,
  итогПериода,
  итогПоСчетам,
  расходыПоКатегориям,
  свободныеДеньги,
} from '@/features/finance/model/calc'
import { темпТрат } from '@/features/finance/model/SpendingPace'
import { месяцевЗапаса, среднийРасходВМесяц } from '@/features/finance/model/Runway'
import { деньги, деньгиКратко } from '@/core/money/Money'
import {
  границыМесяца,
  месяцКоротко,
  месяцСловами,
  сдвинутьМесяц,
  сегодня,
  текущийМесяц,
} from '@/core/calendar/CalendarRu'
import { склонение } from '@/core/language/Plural'
import { cn } from '@/design-system/classNames'
import {
  Skeleton,
  Card,
  Metric,
  EmptyState,
  CardHeader,
  CardBody,
  Badge,
} from '@/design-system/components'
import { useСигналыПоРазделам } from '@/features/signals/useSignals'
import { SignalsStrip } from '@/features/signals/SignalsStrip'

const МЕСЯЦЕВ_ДЛЯ_ЗАПАСА = 3

function предыдущийМесяц(месяц: string, назад: number): string {
  const [год, номер] = месяц.split('-').map(Number)
  const дата = new Date(год ?? 2026, (номер ?? 1) - 1 - назад, 1)
  return `${дата.getFullYear()}-${String(дата.getMonth() + 1).padStart(2, '0')}`
}

export function FinanceOverview() {
  const [месяц] = useState(текущийМесяц())
  const сигналы = useСигналыПоРазделам(['Финансы', 'Обязательства'])

  const данные = useLiveQuery(async () => {
    const [счета, операции, обязательства, категории, настройки] =
      await Promise.all([
        база.accounts.toArray(),
        база.operations.toArray(),
        база.obligations.toArray(),
        база.moneyCategories.toArray(),
        читатьНастройки(),
      ])
    return { счета, операции, обязательства, категории, настройки }
  }, [])

  const посчитано = useMemo(() => {
    if (!данные) return null
    const границы = границыМесяца(месяц)
    const итог = итогПоСчетам(данные.счета)
    const долги = итогОбязательств(данные.обязательства)
    const период = итогПериода(данные.операции, границы.от, границы.до)
    const свободно = свободныеДеньги({
      собственные: итог.собственные,
      яДолжен: долги.яДолжен,
      минимальныйРезерв: данные.настройки.минимальныйРезерв,
    })

    const поКатегориям = расходыПоКатегориям(
      данные.операции,
      границы.от,
      границы.до,
    )
    const имена = new Map(данные.категории.map((к) => [к.id, к.название]))
    const категории = [...поКатегориям.entries()]
      .map(([id, сумма]) => ({
        название: имена.get(id) ?? 'Без категории',
        сумма,
      }))
      .sort((а, б) => б.сумма - а.сумма)
      .slice(0, 8)

    const помесячно = Array.from({ length: 6 }, (_, шаг) => {
      const ключ = предыдущийМесяц(месяц, 5 - шаг)
      const границыМ = границыМесяца(ключ)
      const итогМ = итогПериода(данные.операции, границыМ.от, границыМ.до)
      // Подпись — короткое имя месяца. Номер «03» на оси читается как число
      // месяца, и весь график начинает выглядеть графиком за одни сутки.
      const сменаГода = ключ.slice(0, 4) !== месяц.slice(0, 4)
      return {
        месяц: ключ,
        подпись: месяцКоротко(ключ, сменаГода),
        доходы: итогМ.доходы / 100,
        расходы: итогМ.расходы / 100,
      }
    })

    const расходыДоСегодня = итогПериода(
      данные.операции,
      границы.от,
      сегодня(),
    ).расходы
    const темп = темпТрат({
      расходыДоСегодня,
      от: границы.от,
      до: границы.до,
      сегодня: сегодня(),
    })

    // Запас в месяцах, а не голое число резерва — но только если реально
    // накопилось хотя бы 3 месяца истории операций: без неё среднее
    // расхода посчитано было бы по обрывку, который выглядит как факт.
    const самаяРанняя = данные.операции.reduce<string | null>(
      (мин, о) => (мин === null || о.дата < мин ? о.дата : мин),
      null,
    )
    const границаИстории = границыМесяца(
      сдвинутьМесяц(`${месяц}-01`, -МЕСЯЦЕВ_ДЛЯ_ЗАПАСА).slice(0, 7),
    ).от
    const достаточноИстории =
      самаяРанняя !== null && самаяРанняя <= границаИстории
    const среднийРасход = достаточноИстории
      ? среднийРасходВМесяц(данные.операции, МЕСЯЦЕВ_ДЛЯ_ЗАПАСА)
      : null
    const запас = месяцевЗапаса(данные.настройки.минимальныйРезерв, среднийРасход)

    return { итог, долги, период, свободно, категории, помесячно, темп, запас }
  }, [данные, месяц])

  if (!данные || !посчитано) {
    return (
      <Card>
        <Skeleton строк={4} />
      </Card>
    )
  }

  const естьОперации = данные.операции.length > 0
  const естьСчета = данные.счета.length > 0

  return (
    <div className="anim-rise space-y-5">
      {сигналы && сигналы.length > 0 ? <SignalsStrip сигналы={сигналы} /> : null}
      <Card>
        <div className="grid grid-cols-2 gap-5 p-5 lg:grid-cols-4">
          <Metric
            единица="₽ · остаток"
            подпись="Собственные деньги"
            счётчик={{ число: посчитано.итог.собственные, запись: деньги }}
            источник={
              посчитано.итог.счетовБезОстатка > 0
                ? `не заполнено: ${посчитано.итог.названияБезОстатка.join(', ')}`
                : `по ${посчитано.итог.счетовУчтено} ${склонение(посчитано.итог.счетовУчтено, 'счёту', 'счетам', 'счетам')}`
            }
            тон={посчитано.итог.счетовБезОстатка > 0 ? 'внимание' : 'нейтральный'}
            шкала={{
              известно: посчитано.итог.счетовУчтено,
              неизвестно: посчитано.итог.счетовБезОстатка,
            }}
          />
          <Metric
            единица="₽ · свободно"
            подпись="Можно тратить"
            счётчик={{ число: посчитано.свободно, запись: деньги }}
            источник="собственные − обязательства − резерв"
            тон={посчитано.свободно < 0 ? 'опасность' : 'нейтральный'}
          />
          <Metric
            единица="₽ · долг"
            подпись="Я должен"
            счётчик={{ число: посчитано.долги.яДолжен, запись: деньги }}
            источник="тело + проценты + штрафы"
            тон={посчитано.долги.яДолжен > 0 ? 'опасность' : 'нейтральный'}
            шкала={
              посчитано.долги.безДанных > 0
                ? {
                    известно:
                      данные.обязательства.filter((о) => !о.закрыто).length -
                      посчитано.долги.безДанных,
                    неизвестно: посчитано.долги.безДанных,
                  }
                : undefined
            }
          />
          <Metric
            единица="₽ · лимит"
            подпись="Кредитный лимит"
            значение={деньги(посчитано.итог.кредитныйЛимитДоступен)}
            источник="доступно, но это не ваши деньги"
          />
        </div>
        {посчитано.запас !== null ? (
          <p className="border-t border-line px-5 py-3 text-caption text-ink-3">
            Минимальный резерв — это ≈{посчитано.запас}{' '}
            {склонение(Math.round(посчитано.запас), 'месяц', 'месяца', 'месяцев')} расходов
            по среднему за последние {МЕСЯЦЕВ_ДЛЯ_ЗАПАСА} месяца.
          </p>
        ) : null}
      </Card>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader
            заголовок="Движение денег"
            подпись={`Показатели — за ${месяцСловами(месяц)}. Переводы между своими счетами не считаются ни доходом, ни расходом`}
          />
          <div className="grid grid-cols-3 gap-4 px-5 pb-4">
            <Metric
              подпись="Доходы"
              значение={деньги(посчитано.период.доходы)}
              тон="успех"
              источник={`${посчитано.период.операций} ${склонение(посчитано.период.операций, 'операция', 'операции', 'операций')}`}
            />
            <Metric
              подпись="Расходы"
              значение={деньги(посчитано.период.расходы)}
              тон={
                посчитано.период.расходы > посчитано.период.доходы
                  ? 'опасность'
                  : 'нейтральный'
              }
            />
            <Metric
              подпись="Поток"
              значение={деньги(посчитано.период.поток, { знак: true })}
              тон={посчитано.период.поток < 0 ? 'опасность' : 'успех'}
              источник="доходы − расходы"
            />
          </div>

          {посчитано.темп && посчитано.темп.расходыДоСегодня > 0 ? (
            <div className="mx-5 mb-4 space-y-2">
              <p className="text-caption text-ink-3">
                При темпе {деньги(посчитано.темп.темпВДень)}/день — ещё ~
                {деньги(посчитано.темп.прогнозНаОстаток)} за оставшиеся{' '}
                {посчитано.темп.оставшихсяДней}{' '}
                {склонение(посчитано.темп.оставшихсяДней, 'день', 'дня', 'дней')}.
                Прогноз на весь месяц: {деньги(посчитано.темп.прогнозИтогПериода)}.
                Посчитано по факту: {деньги(посчитано.темп.расходыДоСегодня)} за{' '}
                {посчитано.темп.прошедшихДней}{' '}
                {склонение(посчитано.темп.прошедшихДней, 'день', 'дня', 'дней')}.
              </p>
              <p
                className={cn(
                  'rounded-3 px-3 py-2 text-caption',
                  посчитано.темп.прогнозНаОстаток > посчитано.свободно
                    ? 'bg-bad-soft text-bad'
                    : 'bg-good-soft text-good',
                )}
              >
                {посчитано.темп.прогнозНаОстаток > посчитано.свободно
                  ? `Прогноза на остаток месяца больше, чем свободных денег (${деньги(посчитано.свободно)}).`
                  : `Свободных денег хватает на прогноз до конца месяца.`}
              </p>
              <p
                className={cn(
                  'rounded-3 px-3 py-2 text-caption',
                  посчитано.темп.прогнозИтогПериода > посчитано.период.доходы
                    ? 'bg-bad-soft text-bad'
                    : 'bg-good-soft text-good',
                )}
              >
                {посчитано.темп.прогнозИтогПериода > посчитано.период.доходы
                  ? `При таком темпе расходы за месяц превысят полученный доход (${деньги(посчитано.период.доходы)}).`
                  : `Прогноз расходов за месяц не превышает полученный доход.`}
              </p>
            </div>
          ) : null}

          {естьОперации ? (
            <div className="px-5 pt-1 pb-4">
              <p className="mb-1 text-micro font-semibold tracking-[0.14em] text-ink-3 uppercase">
                По месяцам · последние 6
              </p>
            </div>
          ) : null}

          {естьОперации ? (
            <div className="h-[180px] px-2 pb-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={посчитано.помесячно}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="var(--line-soft)"
                  />
                  <XAxis
                    dataKey="подпись"
                    tick={{ fontSize: 11, fill: 'var(--ink-3)' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: 'var(--ink-3)' }}
                    axisLine={false}
                    tickLine={false}
                    width={52}
                    tickFormatter={(значение: number) =>
                      деньгиКратко(значение * 100)
                    }
                  />
                  <Tooltip
                    cursor={{ fill: 'var(--surface-hover)' }}
                    contentStyle={{
                      background: 'var(--surface-over)',
                      border: '1px solid var(--line-soft)',
                      borderRadius: 12,
                      fontSize: 12,
                      color: 'var(--ink)',
                    }}
                    formatter={
                      ((значение: number, имя: string) => [
                        деньги(значение * 100),
                        имя,
                      ]) as never
                    }
                  />
                  <Bar dataKey="доходы" fill="var(--good)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="расходы" fill="var(--bad)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState
              заголовок="Операций пока нет"
              подпись="График появится, когда будет хотя бы одна операция. Пустой график с нулями вводил бы в заблуждение."
            />
          )}
        </Card>

        <Card>
          <CardHeader
            заголовок="Расходы по категориям"
            подпись={месяцСловами(месяц)}
          />
          {посчитано.категории.length === 0 ? (
            <EmptyState
              заголовок="Расходов за месяц нет"
              подпись="Как только появятся операции с категориями, здесь будет разбивка."
            />
          ) : (
            <div className="h-[260px] px-2 pb-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={посчитано.категории.map((строка) => ({
                    название: строка.название,
                    сумма: строка.сумма / 100,
                  }))}
                  layout="vertical"
                  margin={{ left: 8, right: 12 }}
                >
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="название"
                    width={110}
                    tick={{ fontSize: 11, fill: 'var(--ink-2)' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: 'var(--surface-hover)' }}
                    contentStyle={{
                      background: 'var(--surface-over)',
                      border: '1px solid var(--line-soft)',
                      borderRadius: 12,
                      fontSize: 12,
                      color: 'var(--ink)',
                    }}
                    formatter={
                      ((значение: number) => деньги(значение * 100)) as never
                    }
                  />
                  <Bar dataKey="сумма" radius={[0, 6, 6, 0]}>
                    {посчитано.категории.map((_, индекс) => (
                      <Cell key={индекс} fill="var(--accent)" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      {!естьСчета ? (
        <Card>
          <CardHeader
            заголовок="Начните со счетов"
            подпись="Пока нет ни одного счёта, сумма доступных денег неизвестна — и приложение не станет придумывать её за вас."
          />
          <CardBody>
            <div className="flex flex-wrap gap-2">
              <Link
                to="/finance/accounts"
                className="inline-flex h-10 items-center rounded-2 bg-accent px-4 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover"
              >
                Добавить счёт
              </Link>
              <Link
                to="/settings"
                className="inline-flex h-10 items-center rounded-2 border border-line px-4 text-sm font-medium text-ink-2 transition-colors hover:bg-hover"
              >
                Перенести данные из прежней версии
              </Link>
            </div>
          </CardBody>
        </Card>
      ) : null}

      {посчитано.итог.счетовБезОстатка > 0 ? (
        <Card className="border-warn/30">
          <CardBody className="pt-5">
            <div className="flex flex-wrap items-center gap-3">
              <Badge тон="внимание">Незаполненное — не ноль</Badge>
              <p className="text-meta text-ink-2">
                {посчитано.итог.счетовБезОстатка}{' '}
                {склонение(
                  посчитано.итог.счетовБезОстатка,
                  'счёт не участвует',
                  'счёта не участвуют',
                  'счетов не участвуют',
                )}{' '}
                в сумме, потому что остаток не подтверждён.{' '}
                <Link
                  to="/finance/accounts"
                  className="text-accent hover:underline"
                >
                  Заполнить
                </Link>
              </p>
            </div>
          </CardBody>
        </Card>
      ) : null}
    </div>
  )
}
