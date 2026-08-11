import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Circle,
  Eye,
  Info,
  Sparkles,
} from 'lucide-react'
import { база } from '@/core/db/db'
import { собратьСигналы, длинаСерии } from '@/core/signals/engine'
import {
  итогПериода,
  итогПоСчетам,
  итогОбязательств,
  свободныеДеньги,
} from '@/features/finance/model/calc'
import { читатьНастройки } from '@/core/db/repo'
import { деньги, процент } from '@/core/money/Money'
import {
  границыМесяца,
  деньСловами,
  деньНедели,
  сегодня,
  текущийМесяц,
} from '@/core/calendar/CalendarRu'
import { склонение } from '@/core/language/Plural'
import { число } from '@/core/language/Numerals'
import {
  Badge,
  Skeleton,
  SectionTitle,
  Card,
  Metric,
  ProgressBar,
  EmptyState,
  CardHeader,
  CardBody,
} from '@/design-system/components'
import type { Сигнал, УровеньСигнала } from '@/core/db/types'
import { cn } from '@/design-system/classNames'

const иконкаСигнала: Record<УровеньСигнала, typeof Info> = {
  критично: AlertTriangle,
  внимание: Eye,
  наблюдение: Info,
  хорошо: Sparkles,
}

const тонСигнала: Record<УровеньСигнала, string> = {
  критично: 'text-bad',
  внимание: 'text-warn',
  наблюдение: 'text-info',
  хорошо: 'text-good',
}

export function DashboardPage() {
  const день = сегодня()
  const месяц = текущийМесяц()

  const данные = useLiveQuery(async () => {
    const [
      задачи,
      привычки,
      цели,
      счета,
      операции,
      обязательства,
      входящие,
      события,
      настройки,
    ] = await Promise.all([
      база.tasks.toArray(),
      база.habits.toArray(),
      база.goals.toArray(),
      база.accounts.toArray(),
      база.operations.toArray(),
      база.obligations.toArray(),
      база.inbox.filter((з) => !з.разобрано).count(),
      база.events.where('дата').equals(день).toArray(),
      читатьНастройки(),
    ])
    return {
      задачи,
      привычки,
      цели,
      счета,
      операции,
      обязательства,
      входящие,
      события,
      настройки,
    }
  }, [день])

  if (!данные) {
    return (
      <Card>
        <Skeleton строк={5} />
      </Card>
    )
  }

  const задачиНаСегодня = данные.задачи.filter(
    (задача) => задача.дата === день && задача.состояние !== 'отменена',
  )
  const сделаноСегодня = задачиНаСегодня.filter((з) => з.состояние === 'сделана')
  const активныеПривычки = данные.привычки.filter((п) => п.активна)
  const отмеченоПривычек = активныеПривычки.filter(
    (п) => (п.отметки[день] ?? 0) > 0,
  )

  const счета = итогПоСчетам(данные.счета)
  const долги = итогОбязательств(данные.обязательства)
  const границы = границыМесяца(месяц)
  const периодМесяца = итогПериода(данные.операции, границы.от, границы.до)
  const свободно = свободныеДеньги({
    собственные: счета.собственные,
    яДолжен: долги.яДолжен,
    минимальныйРезерв: данные.настройки.минимальныйРезерв,
  })

  const сигналы = собратьСигналы({
    задачи: данные.задачи,
    привычки: данные.привычки,
    цели: данные.цели,
    счета: данные.счета,
    операции: данные.операции,
    обязательства: данные.обязательства,
    входящих: данные.входящие,
  })

  const требуютВнимания = сигналы.filter((с) => с.уровень !== 'хорошо')
  const хорошее = сигналы.filter((с) => с.уровень === 'хорошо')

  const следующееДействие = выбратьСледующееДействие(
    задачиНаСегодня,
    требуютВнимания,
  )

  const активныеЦели = данные.цели.filter((ц) => ц.состояние === 'активна')
  const естьХотьЧтоТо =
    данные.задачи.length + данные.привычки.length + данные.операции.length > 0

  return (
    <div className="anim-rise space-y-7">
      {/* --- Сейчас --- */}
      <section>
        <Card className="overflow-hidden">
          <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="min-w-0">
              <p className="text-[12px] text-ink-3 first-letter:uppercase">
                {деньНедели(день)}, {деньСловами(день)}
              </p>
              <h1 className="mt-1.5 text-[22px] leading-tight font-semibold text-ink sm:text-[26px]">
                {следующееДействие.заголовок}
              </h1>
              <p className="mt-1.5 max-w-xl text-[13.5px] text-ink-2">
                {следующееДействие.пояснение}
              </p>
            </div>
            {следующееДействие.ссылка ? (
              <Link
                to={следующееДействие.ссылка}
                className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-3 bg-accent px-5 text-[15px] font-medium text-on-accent shadow-1 transition-colors hover:bg-accent-hover"
              >
                {следующееДействие.подписьКнопки}
                <ArrowRight size={16} />
              </Link>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-px border-t border-line bg-line sm:grid-cols-4">
            <div className="bg-card p-4">
              <Metric
                единица="шт · задачи"
                подпись="Закрыто сегодня"
                значение={`${сделаноСегодня.length}/${задачиНаСегодня.length}`}
                источник={
                  задачиНаСегодня.length === 0
                    ? 'на сегодня задач нет'
                    : `${процент(сделаноСегодня.length, задачиНаСегодня.length) ?? 0}% выполнено`
                }
              />
            </div>
            <div className="bg-card p-4">
              <Metric
                единица="шт · привычки"
                подпись="Отмечено сегодня"
                значение={`${отмеченоПривычек.length}/${активныеПривычки.length}`}
                источник={
                  активныеПривычки.length === 0
                    ? 'привычек пока нет'
                    : 'из активных'
                }
              />
            </div>
            <div className="bg-card p-4">
              <Metric
                единица="шт · события"
                подпись="В календаре"
                значение={String(данные.события.length)}
                источник={данные.события[0]?.название ?? 'ничего не запланировано'}
              />
            </div>
            <div className="bg-card p-4">
              <Metric
                единица="шт · входящие"
                подпись="Ждут разбора"
                значение={String(данные.входящие)}
                источник="быстрые записи"
                тон={данные.входящие > 0 ? 'внимание' : 'нейтральный'}
              />
            </div>
          </div>
        </Card>
      </section>

      {/* --- Сигналы --- */}
      <section>
        <SectionTitle
          действие={
            <span className="text-[12px] text-ink-3">
              {требуютВнимания.length === 0
                ? 'ничего не требует вмешательства'
                : `${требуютВнимания.length} ${склонение(требуютВнимания.length, 'сигнал', 'сигнала', 'сигналов')}`}
            </span>
          }
        >
          Сигналы
        </SectionTitle>

        {сигналы.length === 0 ? (
          <Card>
            <EmptyState
              иконка={<CheckCircle2 size={20} />}
              заголовок="Пока сигналов нет"
              подпись="Сигналы появятся, когда в данных возникнет то, что требует решения: просроченная задача, близкий платёж, цель без движения."
            />
          </Card>
        ) : (
          <div className="grid gap-2.5 md:grid-cols-2">
            {[...требуютВнимания, ...хорошее].slice(0, 6).map((сигнал) => (
              <SignalRow key={сигнал.id} сигнал={сигнал} />
            ))}
          </div>
        )}
      </section>

      {/* --- Деньги --- */}
      <section>
        <SectionTitle
          действие={
            <Link to="/finance" className="text-[12px] text-accent hover:underline">
              Все финансы
            </Link>
          }
        >
          Деньги
        </SectionTitle>

        <Card>
          <div className="grid grid-cols-2 gap-5 p-5 lg:grid-cols-4">
            <Metric
              единица="₽ · остаток"
              подпись="Собственные деньги"
              значение={деньги(счета.собственные)}
              источник={
                данные.счета.length === 0
                  ? 'счетов ещё нет — сумма неизвестна'
                  : счета.счетовБезОстатка > 0
                    ? `не заполнено: ${счета.названияБезОстатка.join(', ')}`
                    : 'подтверждено по всем счетам'
              }
              тон={счета.счетовБезОстатка > 0 ? 'внимание' : 'нейтральный'}
              шкала={{
                известно: счета.счетовУчтено,
                неизвестно: счета.счетовБезОстатка,
              }}
            />
            <Metric
              единица="₽ · свободно"
              подпись="Можно тратить"
              значение={деньги(свободно)}
              источник="собственные − обязательства − резерв"
              тон={свободно < 0 ? 'опасность' : 'нейтральный'}
            />
            <Metric
              единица="₽ · за месяц"
              подпись="Получено"
              значение={деньги(периодМесяца.доходы)}
              источник={`${периодМесяца.операций} ${склонение(периодМесяца.операций, 'операция', 'операции', 'операций')}`}
              тон={периодМесяца.доходы > 0 ? 'успех' : 'нейтральный'}
            />
            <Metric
              единица="₽ · за месяц"
              подпись="Израсходовано"
              значение={деньги(периодМесяца.расходы)}
              источник="переводы не в счёт"
              тон={
                периодМесяца.расходы > периодМесяца.доходы
                  ? 'опасность'
                  : 'нейтральный'
              }
            />
          </div>

          {периодМесяца.доходы > 0 ? (
            <div className="border-t border-line px-5 py-4">
              <ProgressBar
                значение={периодМесяца.расходы}
                из={периодМесяца.доходы}
                тон={
                  периодМесяца.расходы > периодМесяца.доходы ? 'опасность' : 'успех'
                }
                подпись="Израсходовано от полученного за месяц"
              />
            </div>
          ) : null}
        </Card>
      </section>

      {/* --- Движение --- */}
      <section>
        <SectionTitle
          действие={
            <Link to="/goals" className="text-[12px] text-accent hover:underline">
              Все цели
            </Link>
          }
        >
          Движение
        </SectionTitle>

        <Card>
          {активныеЦели.length === 0 ? (
            <EmptyState
              иконка={<Circle size={20} />}
              заголовок="Активных целей нет"
              подпись="Цель задаёт направление: без неё задачи и привычки остаются набором дел."
              действие={
                <Link
                  to="/goals"
                  className="inline-flex h-10 items-center rounded-2 border border-accent-line px-4 text-sm font-medium text-accent transition-colors hover:bg-accent-soft"
                >
                  Открыть цели
                </Link>
              }
            />
          ) : (
            <div className="divide-y divide-line">
              {активныеЦели.slice(0, 4).map((цель) => {
                const естьЧисло = цель.цель !== null && цель.цель > 0
                return (
                  <div key={цель.id} className="px-5 py-4">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="min-w-0 truncate text-[14px] font-medium text-ink">
                        {цель.название}
                      </p>
                      <span className="tnum shrink-0 text-[13px] text-ink-2">
                        {естьЧисло
                          ? `${число(цель.текущее ?? 0)} / ${число(цель.цель)} ${цель.единица}`
                          : 'без числового показателя'}
                      </span>
                    </div>
                    {естьЧисло ? (
                      <div className="mt-2.5">
                        <ProgressBar
                          значение={цель.текущее ?? 0}
                          из={цель.цель ?? 1}
                        />
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </section>

      {/* --- Привычки сегодня --- */}
      {активныеПривычки.length > 0 ? (
        <section>
          <SectionTitle
            действие={
              <Link
                to="/habits"
                className="text-[12px] text-accent hover:underline"
              >
                Все привычки
              </Link>
            }
          >
            Привычки сегодня
          </SectionTitle>
          <Card>
            <div className="flex flex-wrap gap-2 p-5">
              {активныеПривычки.slice(0, 10).map((привычка) => {
                const отмечена = (привычка.отметки[день] ?? 0) > 0
                const серия = длинаСерии(привычка, день)
                return (
                  <span
                    key={привычка.id}
                    className={cn(
                      'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[13px]',
                      отмечена
                        ? 'border-transparent bg-good-soft text-good'
                        : 'border-line text-ink-2',
                    )}
                  >
                    {отмечена ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                    {привычка.название}
                    {серия > 1 ? (
                      <span className="tnum text-[11px] opacity-70">
                        {серия} дн
                      </span>
                    ) : null}
                  </span>
                )
              })}
            </div>
          </Card>
        </section>
      ) : null}

      {!естьХотьЧтоТо ? (
        <Card>
          <CardHeader
            заголовок="Система пока пуста — и это нормально"
            подпись="Ни одна цифра здесь не выдумана. Пока нет записей, показывать нечего."
          />
          <CardBody>
            <ul className="space-y-2 text-[13.5px] text-ink-2">
              <li>· Добавьте первую задачу или расход кнопкой «Добавить».</li>
              <li>
                · Есть копия прежнего приложения?{' '}
                <Link to="/settings" className="text-accent hover:underline">
                  Перенесите данные в настройках
                </Link>
                .
              </li>
              <li>· Заполните остатки счетов — тогда деньги начнут считаться.</li>
            </ul>
          </CardBody>
        </Card>
      ) : null}
    </div>
  )
}

function SignalRow({ сигнал }: { сигнал: Сигнал }) {
  const Иконка = иконкаСигнала[сигнал.уровень]
  const содержимое = (
    <Card className="h-full p-4 transition-colors hover:border-line-strong">
      <div className="flex items-start gap-3">
        <span className={cn('mt-0.5 shrink-0', тонСигнала[сигнал.уровень])}>
          <Иконка size={17} />
        </span>
        <div className="min-w-0">
          <p className="text-[13.5px] font-medium text-ink">{сигнал.текст}</p>
          <p className="mt-1 text-[12px] leading-relaxed text-ink-3">
            {сигнал.объяснение}
          </p>
          <Badge
            className="mt-2"
            тон={
              сигнал.уровень === 'критично'
                ? 'опасность'
                : сигнал.уровень === 'внимание'
                  ? 'внимание'
                  : сигнал.уровень === 'хорошо'
                    ? 'успех'
                    : 'сведения'
            }
          >
            {сигнал.раздел}
          </Badge>
        </div>
      </div>
    </Card>
  )

  return сигнал.ссылка ? (
    <Link to={сигнал.ссылка} className="block">
      {содержимое}
    </Link>
  ) : (
    содержимое
  )
}

function выбратьСледующееДействие(
  задачиНаСегодня: { название: string; состояние: string; важность: string }[],
  сигналы: Сигнал[],
): {
  заголовок: string
  пояснение: string
  ссылка: string | null
  подписьКнопки: string
} {
  const критичный = сигналы.find((с) => с.уровень === 'критично')
  if (критичный) {
    return {
      заголовок: критичный.текст,
      пояснение: критичный.объяснение,
      ссылка: критичный.ссылка,
      подписьКнопки: 'Разобраться',
    }
  }

  const первая = задачиНаСегодня.find((з) => з.состояние !== 'сделана')
  if (первая) {
    return {
      заголовок: первая.название,
      пояснение:
        'Ближайшая невыполненная задача на сегодня. Остальное подождёт — начните с неё.',
      ссылка: '/tasks',
      подписьКнопки: 'К задачам',
    }
  }

  const внимание = сигналы[0]
  if (внимание) {
    return {
      заголовок: внимание.текст,
      пояснение: внимание.объяснение,
      ссылка: внимание.ссылка,
      подписьКнопки: 'Посмотреть',
    }
  }

  return {
    заголовок: 'На сегодня всё закрыто',
    пояснение:
      'Просроченных задач нет, ближайших платежей нет, цели двигаются. Хорошее время спланировать завтра.',
    ссылка: null,
    подписьКнопки: '',
  }
}
