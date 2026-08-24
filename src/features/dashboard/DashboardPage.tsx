import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Circle,
  Eye,
  Info,
  Wallet,
} from 'lucide-react'
import { база } from '@/core/db/db'
import { следующееДействие as вычислитьДействие } from '@/core/day/NextAction'
import { DayPlanCard } from './DayPlanCard'
import { NextActionCard } from './NextActionCard'
import { CourseOfDay, SecondBrainFlow } from './CoachingLoop'
import { собратьСигналы, длинаСерии } from '@/core/signals/engine'
import {
  итогПериода,
  итогПоСчетам,
  итогОбязательств,
  свободныеДеньги,
} from '@/features/finance/model/calc'
import { читатьНастройки } from '@/core/db/repo'
import { деньги } from '@/core/money/Money'
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
  CardBody,
} from '@/design-system/components'
import type { Сигнал, УровеньСигнала } from '@/core/db/types'
import { cn } from '@/design-system/classNames'
import { ЗНАЧОК } from '@/design-system/iconSize'
import { AmbientField } from '@/design-system/motion/AmbientField'

const иконкаСигнала: Record<УровеньСигнала, typeof Info> = {
  критично: AlertTriangle,
  внимание: Eye,
  наблюдение: Info,
  хорошо: CheckCircle2,
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
      проекты,
      опыт,
      вызовы,
      планы,
      замыслы,
      входящиеЗаписи,
      люди,
      обзоры,
      категории,
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
      база.projects.toArray(),
      база.experiences.toArray(),
      база.challenges.toArray(),
      база.plans.toArray(),
      база.intentions.toArray(),
      база.inbox.toArray(),
      база.people.toArray(),
      база.reviews.toArray(),
      база.moneyCategories.toArray(),
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
      проекты,
      опыт,
      вызовы,
      планы,
      замыслы,
      входящиеЗаписи,
      люди,
      обзоры,
      категории,
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
  const закрытоИзЗадачНаСегодня = задачиНаСегодня.filter(
    (задача) => задача.состояние === 'сделана',
  )
  const активныеПривычки = данные.привычки.filter((п) => п.активна)
  const счета = итогПоСчетам(данные.счета)
  const долги = итогОбязательств(данные.обязательства)
  const обязательствСНеполнымиСуммами = данные.обязательства.filter(
    (обязательство) =>
      !обязательство.закрыто &&
      обязательство.направление === 'я должен' &&
      [
        обязательство.телоОстаток,
        обязательство.начисленныеПроценты,
        обязательство.штрафы,
      ].some((часть) => часть === null),
  ).length
  const деньгиИзвестны = счета.счетовУчтено > 0
  const данныеДенегПолны =
    деньгиИзвестны &&
    счета.счетовБезОстатка === 0 &&
    обязательствСНеполнымиСуммами === 0
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
    проекты: данные.проекты,
    опыт: данные.опыт,
    вызовы: данные.вызовы,
    планы: данные.планы,
    люди: данные.люди,
    категории: данные.категории,
  })

  const требуютВнимания = сигналы.filter((с) => с.уровень !== 'хорошо')
  const хорошее = сигналы.filter((с) => с.уровень === 'хорошо')

  // Что делать сейчас — считается доменом дня, а не страницей: правило выбора
  // должно проверяться тестом, а не жить в разметке.
  const действиеДня = вычислитьДействие(
    {
      задачи: данные.задачи,
      цели: данные.цели,
      привычки: данные.привычки,
      обязательства: данные.обязательства,
      замыслы: данные.замыслы,
      входящие: данные.входящиеЗаписи,
    },
    день,
    new Date().getHours(),
  )

  // Сигнал, вынесенный наверх, не повторяется в списке: один и тот же текст
  // дважды на одном экране читается как сбой, а не как акцент.
  const остальныеСигналы = [...требуютВнимания, ...хорошее].filter(
    (сигнал) => !(действиеДня && сигнал.id.includes(действиеДня.источникId)),
  )

  const активныеЦели = данные.цели.filter((ц) => ц.состояние === 'активна')
  const естьХотьЧтоТо =
    данные.задачи.length + данные.привычки.length + данные.операции.length > 0
  const деньгиПусты = данные.счета.length === 0 && данные.операции.length === 0
  const открытыеСегодня = задачиНаСегодня.filter(
    (задача) => задача.состояние !== 'сделана',
  )
  const минутЗапланировано = открытыеСегодня.reduce(
    (итог, задача) => итог + (задача.длительностьМинут ?? 0),
    0,
  )
  const безОценкиВремени = открытыеСегодня.filter(
    (задача) => задача.длительностьМинут === null,
  ).length
  const связаноСКурсом = открытыеСегодня.filter(
    (задача) => задача.цельId !== null || задача.проектId !== null,
  ).length
  const активныхПроектов = данные.проекты.filter(
    (проект) => проект.состояние === 'активен',
  ).length
  const обзоровСВыводом = данные.обзоры.filter(
    (обзор) => обзор.закрыт && обзор.выводы.trim().length > 0,
  ).length

  // Пустая база: первым идёт приглашение, приборы сворачиваются в строку.
  // Восемь нулей подряд, а объяснение под ними — это перевёрнутый порядок:
  // человек успевает решить, что приложение сломано, раньше, чем дочитает.
  if (!естьХотьЧтоТо) {
    return (
      <div className="anim-rise space-y-7">
        <section>
          <Card className="hero-surface relative overflow-hidden">
            <AmbientField />
            <div className="relative p-6 sm:p-8 lg:p-10">
              <p className="hero-kicker text-micro font-medium first-letter:uppercase">
                {деньНедели(день)}, {деньСловами(день)}
              </p>
              <h1 className="hero-title mt-4 text-ink">
                Здесь пока нечего показывать
              </h1>
              <p className="mt-4 max-w-xl text-body leading-relaxed text-ink-2">
                Ни одна цифра в этом приложении не выдумана. Пока нет записей,
                приборы честно пусты — начните с одного действия.
              </p>

              <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                <Link
                  to="/tasks"
                  className="button-base button-primary inline-flex h-12 items-center justify-center gap-2 rounded-2 px-5 text-body font-medium"
                >
                  Записать первую задачу
                  <ArrowRight size={ЗНАЧОК.основной} />
                </Link>
                <Link
                  to="/finance/accounts"
                  className="button-base button-default inline-flex h-12 items-center justify-center rounded-2 px-5 text-body font-medium"
                >
                  Завести счёт
                </Link>
                <Link
                  to="/settings"
                  className="button-base button-default inline-flex h-12 items-center justify-center rounded-2 px-5 text-body font-medium"
                >
                  Перенести прежние данные
                </Link>
              </div>
            </div>

            <div className="relative flex flex-wrap gap-x-5 gap-y-1 border-t border-line px-5 py-3 text-caption text-ink-3 sm:px-6">
              <span>задачи сегодня 0</span>
              <span>привычки 0</span>
              <span>события {данные.события.length}</span>
              <span>входящие {данные.входящие}</span>
              <span>счета 0</span>
            </div>
          </Card>
        </section>
      </div>
    )
  }

  return (
    <div className="dashboard-reveal grid gap-6 [&>*]:min-w-0 xl:grid-cols-12">
      {/* --- Ориентир и один объяснимый выбор --- */}
      <section className="xl:col-span-8 xl:row-start-1 [&>div]:h-full">
        {действиеДня ? (
          <NextActionCard действие={действиеДня} />
        ) : (
          <Card className="hero-surface relative h-full overflow-hidden">
            <AmbientField />
            <div className="relative flex min-h-[300px] flex-col justify-between gap-8 p-6 sm:p-8">
              <div>
                <p className="hero-kicker text-micro font-medium">Ориентир дня</p>
                <h1 className="hero-title mt-4 text-ink">
                  По заполненным данным срочных действий не найдено
                </h1>
                <p className="mt-4 max-w-xl text-body leading-relaxed text-ink-2">
                  Выберите одно важное дело или спокойно зафиксируйте то, что не
                  хочется держать в голове.
                </p>
                <p className="mt-5 text-caption text-ink-3 first-letter:uppercase">
                  {деньНедели(день)}, {деньСловами(день)}
                </p>
              </div>
              <Link
                to="/quick"
                className="button-base button-primary inline-flex h-12 w-full items-center justify-center gap-2 self-start rounded-2 px-5 text-body font-medium sm:w-auto"
              >
                Быстро зафиксировать
                <ArrowRight size={ЗНАЧОК.строка} />
              </Link>
            </div>
          </Card>
        )}
      </section>

      <section className="xl:col-span-4 xl:row-start-1 [&>div]:h-full">
        <DayPlanCard />
      </section>

      <section className="xl:col-span-12 xl:row-start-2">
        <CourseOfDay
          задачВсего={задачиНаСегодня.length}
          задачОткрыто={открытыеСегодня.length}
          минутЗапланировано={минутЗапланировано}
          безОценкиВремени={безОценкиВремени}
          связаноСКурсом={связаноСКурсом}
          доступно={свободно}
          деньгиИзвестны={деньгиИзвестны}
          данныеДенегПолны={данныеДенегПолны}
        />
      </section>

      {/* --- Сигналы --- */}
      <section className="xl:col-span-4 xl:col-start-9 xl:row-start-3">
        <SectionTitle
          действие={
            <span className="text-caption text-ink-3">
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
              иконка={<CheckCircle2 size={ЗНАЧОК.показание} />}
              заголовок="Пока сигналов нет"
              подпись="Сигналы появятся, когда в данных возникнет то, что требует решения: просроченная задача, близкий платёж, цель без движения."
            />
          </Card>
        ) : остальныеСигналы.length === 0 ? (
          <Card>
            <CardBody>
              <p className="text-meta text-ink-3">
                Единственный сигнал показан наверху — повторять его здесь незачем.
              </p>
            </CardBody>
          </Card>
        ) : (
          <div className="grid gap-2.5">
            {остальныеСигналы.slice(0, 4).map((сигнал) => (
              <SignalRow key={сигнал.id} сигнал={сигнал} />
            ))}
          </div>
        )}
      </section>

      {/* --- Деньги --- */}
      <section className="xl:col-span-8 xl:col-start-1 xl:row-start-3">
        <SectionTitle
          действие={
            <Link
              to="/finance"
              className="-mr-2 inline-flex min-h-11 items-center px-2 text-caption text-accent hover:underline"
            >
              Все финансы
            </Link>
          }
        >
          Деньги
        </SectionTitle>

        <Card className="finance-surface h-full">
          {деньгиПусты ? (
            <EmptyState
              иконка={<Wallet size={ЗНАЧОК.показание} />}
              заголовок="Счетов ещё нет"
              подпись="Четыре нуля здесь ничего не значат: пока нет счетов и операций, считать не из чего. Заведите счёт — и суммы появятся."
              действие={
                <Link
                  to="/finance/accounts"
                  className="button-base button-outline inline-flex h-11 items-center rounded-2 px-4 text-body font-medium"
                >
                  Завести счёт
                </Link>
              }
            />
          ) : (
            <div className="grid grid-cols-2 gap-5 p-5 lg:grid-cols-4">
              <Metric
                единица="₽ · остаток"
                подпись="Собственные деньги"
                значение={деньгиИзвестны ? undefined : 'неизвестно'}
                счётчик={
                  деньгиИзвестны
                    ? { число: счета.собственные, запись: деньги }
                    : undefined
                }
                источник={
                  !деньгиИзвестны
                    ? 'нет подтверждённого остатка собственного счёта'
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
                подпись="Доступно по заполненным данным"
                значение={деньгиИзвестны ? undefined : 'неизвестно'}
                счётчик={
                  деньгиИзвестны ? { число: свободно, запись: деньги } : undefined
                }
                источник={
                  данныеДенегПолны
                    ? 'собственные − обязательства − резерв'
                    : 'расчёт неполный: заполните счета и все части обязательств'
                }
                тон={
                  !данныеДенегПолны
                    ? 'внимание'
                    : свободно < 0
                      ? 'опасность'
                      : 'нейтральный'
                }
              />
              <Metric
                единица="₽ · за месяц"
                подпись="Получено"
                счётчик={{ число: периодМесяца.доходы, запись: деньги }}
                источник={`${периодМесяца.операций} ${склонение(периодМесяца.операций, 'операция', 'операции', 'операций')}`}
                тон={периодМесяца.доходы > 0 ? 'успех' : 'нейтральный'}
              />
              <Metric
                единица="₽ · за месяц"
                подпись="Израсходовано"
                счётчик={{ число: периодМесяца.расходы, запись: деньги }}
                источник="переводы не в счёт"
                тон={
                  периодМесяца.расходы > периодМесяца.доходы
                    ? 'опасность'
                    : 'нейтральный'
                }
              />
            </div>
          )}

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
      <section className="xl:col-span-7 xl:row-start-4">
        <SectionTitle
          действие={
            <Link
              to="/goals"
              className="-mr-2 inline-flex min-h-11 items-center px-2 text-caption text-accent hover:underline"
            >
              Все цели
            </Link>
          }
        >
          Движение
        </SectionTitle>

        <Card className="h-full">
          {активныеЦели.length === 0 ? (
            <EmptyState
              иконка={<Circle size={20} />}
              заголовок="Активных целей нет"
              подпись="Цель задаёт направление: без неё задачи и привычки остаются набором дел."
              действие={
                <Link
                  to="/goals"
                  className="button-base button-outline inline-flex h-11 items-center rounded-2 px-4 text-meta font-medium"
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
                      <p className="min-w-0 truncate text-meta font-medium text-ink">
                        {цель.название}
                      </p>
                      <span className="tnum shrink-0 text-meta text-ink-2">
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

      <section className="xl:col-span-5 xl:row-start-4 [&>div]:h-full">
        <SecondBrainFlow
          входящих={данные.входящие}
          активныхПроектов={активныхПроектов}
          обзоровСВыводом={обзоровСВыводом}
          закрытоИзЗадачНаСегодня={закрытоИзЗадачНаСегодня.length}
        />
      </section>

      {/* --- Привычки сегодня --- */}
      {активныеПривычки.length > 0 ? (
        <section className="xl:col-span-12">
          <SectionTitle
            действие={
              <Link
                to="/habits"
                className="-mr-2 inline-flex min-h-11 items-center px-2 text-caption text-accent hover:underline"
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
                      'inline-flex min-h-10 items-center gap-2 rounded-2 border px-3 py-2 text-meta',
                      отмечена
                        ? 'border-good/25 bg-transparent text-good'
                        : 'border-line text-ink-2',
                    )}
                  >
                    {отмечена ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                    {привычка.название}
                    {серия > 1 ? (
                      <span className="tnum text-micro text-ink-3">{серия} дн</span>
                    ) : null}
                  </span>
                )
              })}
            </div>
          </Card>
        </section>
      ) : null}
    </div>
  )
}

function SignalRow({ сигнал }: { сигнал: Сигнал }) {
  const Иконка = иконкаСигнала[сигнал.уровень]
  const содержимое = (
    <Card живая className="h-full p-4">
      <div className="flex items-start gap-3">
        <span
          className={cn(
            'mt-0.5 shrink-0',
            тонСигнала[сигнал.уровень],
            сигнал.уровень === 'критично' && 'дыхание',
          )}
        >
          <Иконка size={ЗНАЧОК.строка} />
        </span>
        <div className="min-w-0">
          <p className="text-meta font-medium text-ink">{сигнал.текст}</p>
          <p className="mt-1 text-caption leading-relaxed text-ink-3">
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
