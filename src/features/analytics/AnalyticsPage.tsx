import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { база } from '@/core/db/db'
import { границыМесяца, сдвинутьДень, сегодня } from '@/core/calendar/CalendarRu'
import { склонение } from '@/core/language/Plural'
import { деньги, деньгиКратко, процент } from '@/core/money/Money'
import { итогПериода, расходыПоКатегориям } from '@/features/finance/model/calc'
import {
  Card,
  CardHeader,
  EmptyState,
  Metric,
  Segmented,
  Skeleton,
} from '@/design-system/components'

type Глубина = '3' | '6' | '12'

function предыдущийМесяц(месяц: string, назад: number): string {
  const [год, номер] = месяц.split('-').map(Number)
  const дата = new Date(год ?? 2026, (номер ?? 1) - 1 - назад, 1)
  return `${дата.getFullYear()}-${String(дата.getMonth() + 1).padStart(2, '0')}`
}

const ОСЬ = { fontSize: 11, fill: 'var(--ink-3)' }
const ПОДСКАЗКА = {
  background: 'var(--surface-over)',
  border: '1px solid var(--line-soft)',
  borderRadius: 12,
  fontSize: 12,
  color: 'var(--ink)',
}

export function AnalyticsPage() {
  const [глубина, установитьГлубину] = useState<Глубина>('6')
  const день = сегодня()
  const месяц = день.slice(0, 7)

  const данные = useLiveQuery(async () => {
    const [операции, задачи, привычки, категории, обучение] = await Promise.all([
      база.operations.toArray(),
      база.tasks.toArray(),
      база.habits.toArray(),
      база.moneyCategories.toArray(),
      база.learning.toArray(),
    ])
    return { операции, задачи, привычки, категории, обучение }
  }, [])

  const посчитано = useMemo(() => {
    if (!данные) return null

    const месяцы = Array.from({ length: Number(глубина) }, (_, шаг) =>
      предыдущийМесяц(месяц, Number(глубина) - 1 - шаг),
    )

    const деньгиПоМесяцам = месяцы.map((ключ) => {
      const границы = границыМесяца(ключ)
      const итог = итогПериода(данные.операции, границы.от, границы.до)
      return {
        месяц: ключ.slice(5),
        доходы: итог.доходы / 100,
        расходы: итог.расходы / 100,
        поток: итог.поток / 100,
      }
    })

    // Недели последних 12 недель: выполнение задач и привычек.
    const недели = Array.from({ length: 12 }, (_, шаг) => {
      const конец = сдвинутьДень(день, -7 * (11 - шаг))
      const начало = сдвинутьДень(конец, -6)

      const задачиНедели = данные.задачи.filter(
        (з) =>
          з.дата !== null &&
          з.дата >= начало &&
          з.дата <= конец &&
          з.состояние !== 'отменена',
      )
      const сделано = задачиНедели.filter((з) => з.состояние === 'сделана').length

      const активные = данные.привычки.filter((п) => п.активна)
      let отметок = 0
      for (const привычка of активные) {
        for (let шагДня = 0; шагДня < 7; шагДня += 1) {
          const дата = сдвинутьДень(начало, шагДня)
          if ((привычка.отметки[дата] ?? 0) > 0) отметок += 1
        }
      }

      return {
        неделя: конец.slice(5),
        задачи: процент(сделано, задачиНедели.length) ?? 0,
        задачВсего: задачиНедели.length,
        привычки: процент(отметок, активные.length * 7) ?? 0,
      }
    })

    const границыТекущего = границыМесяца(месяц)
    const поКатегориям = расходыПоКатегориям(
      данные.операции,
      границыТекущего.от,
      границыТекущего.до,
    )
    const имена = new Map(данные.категории.map((к) => [к.id, к.название]))
    const категории = [...поКатегориям.entries()]
      .map(([id, сумма]) => ({
        название: имена.get(id) ?? 'Без категории',
        сумма: сумма / 100,
      }))
      .sort((а, б) => б.сумма - а.сумма)
      .slice(0, 10)

    const часовОбучения = данные.обучение.reduce((и, м) => и + (м.часов ?? 0), 0)

    const всегоЗадач = данные.задачи.filter(
      (з) => з.состояние !== 'отменена',
    ).length
    const сделаноЗадач = данные.задачи.filter(
      (з) => з.состояние === 'сделана',
    ).length

    return {
      деньгиПоМесяцам,
      недели,
      категории,
      часовОбучения,
      всегоЗадач,
      сделаноЗадач,
      операций: данные.операции.length,
    }
  }, [данные, глубина, месяц, день])

  if (!данные || !посчитано) {
    return (
      <Card>
        <Skeleton строк={6} />
      </Card>
    )
  }

  const естьДеньги = данные.операции.length > 0
  const естьЗадачи = данные.задачи.length > 0

  return (
    <div className="anim-rise space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[20px] font-semibold text-ink">Аналитика</h1>
          <p className="mt-0.5 text-[13px] text-ink-3">
            Каждое число посчитано из записей. Общего «показателя жизни» здесь нет:
            без прозрачной формулы он ничего не значит.
          </p>
        </div>
        <Segmented
          значения={[
            { ключ: '3' as const, подпись: '3 мес' },
            { ключ: '6' as const, подпись: '6 мес' },
            { ключ: '12' as const, подпись: '12 мес' },
          ]}
          выбрано={глубина}
          наВыбор={установитьГлубину}
        />
      </div>

      <Card>
        <div className="grid grid-cols-2 gap-5 p-5 lg:grid-cols-4">
          <Metric
            единица="шт · операции"
            подпись="Записей о деньгах"
            значение={String(посчитано.операций)}
            источник="за всё время"
          />
          <Metric
            единица="шт · задачи"
            подпись="Закрыто всего"
            значение={`${посчитано.сделаноЗадач}/${посчитано.всегоЗадач}`}
            источник={`${процент(посчитано.сделаноЗадач, посчитано.всегоЗадач) ?? 0}% за всё время`}
          />
          <Metric
            единица="шт · привычки"
            подпись="Активных"
            значение={String(данные.привычки.filter((п) => п.активна).length)}
            источник={`всего заведено: ${данные.привычки.length}`}
          />
          <Metric
            единица="ч · обучение"
            подпись="Часов учтено"
            счётчик={{
              число: посчитано.часовОбучения,
              запись: (з) => String(Math.round(з)),
            }}
            источник={`${данные.обучение.length} ${склонение(данные.обучение.length, 'материал', 'материала', 'материалов')}`}
          />
        </div>
      </Card>

      <Card>
        <CardHeader
          заголовок="Денежный поток"
          подпись={`${глубина} ${склонение(Number(глубина), 'месяц', 'месяца', 'месяцев')} · переводы не в счёт`}
        />
        {естьДеньги ? (
          <div className="h-[240px] px-2 pb-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={посчитано.деньгиПоМесяцам}>
                <defs>
                  <linearGradient id="доход" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--good)" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="var(--good)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="расход" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--bad)" stopOpacity={0.24} />
                    <stop offset="100%" stopColor="var(--bad)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="var(--line-soft)"
                />
                <XAxis
                  dataKey="месяц"
                  tick={ОСЬ}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={ОСЬ}
                  axisLine={false}
                  tickLine={false}
                  width={58}
                  tickFormatter={((з: number) => деньгиКратко(з * 100)) as never}
                />
                <Tooltip
                  contentStyle={ПОДСКАЗКА}
                  formatter={
                    ((з: number, имя: string) => [деньги(з * 100), имя]) as never
                  }
                />
                <Area
                  type="monotone"
                  dataKey="доходы"
                  stroke="var(--good)"
                  fill="url(#доход)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="расходы"
                  stroke="var(--bad)"
                  fill="url(#расход)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyState
            заголовок="Операций нет"
            подпись="График появится, когда будет что показывать. Пустая сетка с нулями вводила бы в заблуждение."
          />
        )}
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader
            заголовок="Выполнение по неделям"
            подпись="доля закрытых задач и отмеченных привычек"
          />
          {естьЗадачи || данные.привычки.length > 0 ? (
            <div className="h-[220px] px-2 pb-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={посчитано.недели}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="var(--line-soft)"
                  />
                  <XAxis
                    dataKey="неделя"
                    tick={ОСЬ}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={ОСЬ}
                    axisLine={false}
                    tickLine={false}
                    width={36}
                    domain={[0, 100]}
                    tickFormatter={((з: number) => `${з}%`) as never}
                  />
                  <Tooltip
                    contentStyle={ПОДСКАЗКА}
                    formatter={
                      ((з: number, имя: string) => [`${з}%`, имя]) as never
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="задачи"
                    stroke="var(--accent)"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="привычки"
                    stroke="var(--know)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState
              заголовок="Задач и привычек нет"
              подпись="Показывать нечего."
            />
          )}
        </Card>

        <Card>
          <CardHeader заголовок="Расходы по категориям" подпись="текущий месяц" />
          {посчитано.категории.length > 0 ? (
            <div className="h-[220px] px-2 pb-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={посчитано.категории}
                  layout="vertical"
                  margin={{ left: 8, right: 12 }}
                >
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="название"
                    width={120}
                    tick={{ fontSize: 11, fill: 'var(--ink-2)' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: 'var(--surface-hover)' }}
                    contentStyle={ПОДСКАЗКА}
                    formatter={((з: number) => деньги(з * 100)) as never}
                  />
                  <Bar dataKey="сумма" fill="var(--accent)" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState
              заголовок="Расходов за месяц нет"
              подпись="Как только появятся операции с категориями, здесь будет разбивка."
            />
          )}
        </Card>
      </div>

      <Card>
        <CardHeader
          заголовок="Откуда взяты числа"
          подпись="Чтобы не приходилось верить на слово"
        />
        <div className="space-y-1.5 px-5 pb-5 text-[12.5px] text-ink-3">
          <p>· Денежный поток — сумма операций типа «доход» и «расход» за месяц.</p>
          <p>· Переводы между своими счетами и корректировки в поток не входят.</p>
          <p>
            · Выполнение задач — доля закрытых среди задач с датой внутри недели.
          </p>
          <p>
            · Выполнение привычек — отметки, делённые на число активных привычек,
            умноженное на семь дней.
          </p>
          <p>
            · Часы обучения — сумма поля «часов»; незаполненные не считаются нулём.
          </p>
        </div>
      </Card>
    </div>
  )
}
