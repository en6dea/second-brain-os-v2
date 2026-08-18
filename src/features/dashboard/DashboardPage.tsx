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
  Wallet,
} from 'lucide-react'
import { база } from '@/core/db/db'
import { следующееДействие as вычислитьДействие } from '@/core/day/NextAction'
import { NextActionCard } from './NextActionCard'
import { собратьСигналы, длинаСерии } from '@/core/signals/engine'
import { посчитатьGameLife } from '@/features/gamelife/model/Levels'
import { GameLifeCard } from '@/features/gamelife/GameLifeCard'
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
    проекты: данные.проекты,
    опыт: данные.опыт,
    вызовы: данные.вызовы,
    планы: данные.планы,
    люди: данные.люди,
    категории: данные.категории,
  })

  const требуютВнимания = сигналы.filter((с) => с.уровень !== 'хорошо')
  const хорошее = сигналы.filter((с) => с.уровень === 'хорошо')

  const следующееДействие = выбратьСледующееДействие(
    задачиНаСегодня,
    требуютВнимания,
  )

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
    (сигнал) =>
      сигнал.id !== следующееДействие.сигналId &&
      !(действиеДня && сигнал.id.includes(действиеДня.источникId)),
  )

  const показателиGameLife = посчитатьGameLife({
    задачСделано: данные.задачи.filter((з) => з.состояние === 'сделана').length,
    привычекОтмечено: данные.привычки.reduce(
      (итог, п) => итог + Object.values(п.отметки).filter((значение) => значение > 0).length,
      0,
    ),
    целейДостигнуто: данные.цели.filter((ц) => ц.состояние === 'достигнута').length,
    обзоровЗакрыто: данные.обзоры.filter((о) => о.закрыт).length,
  })

  const активныеЦели = данные.цели.filter((ц) => ц.состояние === 'активна')
  const естьХотьЧтоТо =
    данные.задачи.length + данные.привычки.length + данные.операции.length > 0
  const деньгиПусты = данные.счета.length === 0 && данные.операции.length === 0

  // Пустая база: первым идёт приглашение, приборы сворачиваются в строку.
  // Восемь нулей подряд, а объяснение под ними — это перевёрнутый порядок:
  // человек успевает решить, что приложение сломано, раньше, чем дочитает.
  if (!естьХотьЧтоТо) {
    return (
      <div className="anim-rise space-y-7">
        <section>
          <Card className="relative overflow-hidden">
            <AmbientField />
            <div className="relative p-5 sm:p-6">
              <p className="text-caption text-ink-3 first-letter:uppercase">
                {деньНедели(день)}, {деньСловами(день)}
              </p>
              <h1 className="mt-1.5 text-gauge leading-tight font-semibold text-ink sm:text-display">
                Здесь пока нечего показывать
              </h1>
              <p className="mt-1.5 max-w-xl text-body text-ink-2">
                Ни одна цифра в этом приложении не выдумана. Пока нет записей,
                приборы честно пусты — начните с одного действия.
              </p>

              <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                <Link
                  to="/tasks"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-3 bg-accent px-5 text-lead font-medium text-on-accent shadow-1 transition-colors hover:bg-accent-hover"
                >
                  Записать первую задачу
                  <ArrowRight size={ЗНАЧОК.основной} />
                </Link>
                <Link
                  to="/finance/accounts"
                  className="inline-flex h-12 items-center justify-center rounded-3 border border-line px-5 text-lead font-medium text-ink transition-colors hover:border-line-strong"
                >
                  Завести счёт
                </Link>
                <Link
                  to="/settings"
                  className="inline-flex h-12 items-center justify-center rounded-3 border border-line px-5 text-lead font-medium text-ink transition-colors hover:border-line-strong"
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
    <div className="anim-rise space-y-7">
      {действиеДня ? <NextActionCard действие={действиеДня} /> : null}
      <GameLifeCard показатели={показателиGameLife} />

      {/* --- Сейчас --- */}
      <section>
        <Card className="relative overflow-hidden">
          <AmbientField />
          <div className="relative flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="min-w-0">
              <p className="text-caption text-ink-3 first-letter:uppercase">
                {деньНедели(день)}, {деньСловами(день)}
              </p>
              <h1 className="mt-1.5 text-h2 leading-tight font-semibold text-ink sm:text-h2">
                {следующееДействие.заголовок}
              </h1>
              <p className="mt-1.5 max-w-xl text-meta text-ink-2">
                {следующееДействие.пояснение}
              </p>
            </div>
            {следующееДействие.ссылка ? (
              <Link
                to={следующееДействие.ссылка}
                className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-3 bg-accent px-5 text-body font-medium text-on-accent shadow-1 transition-colors hover:bg-accent-hover"
              >
                {следующееДействие.подписьКнопки}
                <ArrowRight size={16} />
              </Link>
            ) : null}
          </div>

          <div className="relative grid grid-cols-2 gap-px border-t border-line bg-line sm:grid-cols-4">
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
          <div className="grid gap-2.5 md:grid-cols-2">
            {остальныеСигналы.slice(0, 6).map((сигнал) => (
              <SignalRow key={сигнал.id} сигнал={сигнал} />
            ))}
          </div>
        )}
      </section>

      {/* --- Деньги --- */}
      <section>
        <SectionTitle
          действие={
            <Link to="/finance" className="-mr-2 inline-flex min-h-11 items-center px-2 text-caption text-accent hover:underline">
              Все финансы
            </Link>
          }
        >
          Деньги
        </SectionTitle>

        <Card>
          {деньгиПусты ? (
            <EmptyState
              иконка={<Wallet size={ЗНАЧОК.показание} />}
              заголовок="Счетов ещё нет"
              подпись="Четыре нуля здесь ничего не значат: пока нет счетов и операций, считать не из чего. Заведите счёт — и суммы появятся."
              действие={
                <Link
                  to="/finance/accounts"
                  className="inline-flex h-11 items-center rounded-2 border border-accent-line px-4 text-body font-medium text-accent transition-colors hover:bg-accent-soft"
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
                счётчик={{ число: счета.собственные, запись: деньги }}
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
                счётчик={{ число: свободно, запись: деньги }}
                источник="собственные − обязательства − резерв"
                тон={свободно < 0 ? 'опасность' : 'нейтральный'}
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
      <section>
        <SectionTitle
          действие={
            <Link to="/goals" className="-mr-2 inline-flex min-h-11 items-center px-2 text-caption text-accent hover:underline">
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

      {/* --- Привычки сегодня --- */}
      {активныеПривычки.length > 0 ? (
        <section>
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
                      'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-meta',
                      отмечена
                        ? 'border-transparent bg-good-soft text-good'
                        : 'border-line text-ink-2',
                    )}
                  >
                    {отмечена ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                    {привычка.название}
                    {серия > 1 ? (
                      <span className="tnum text-micro opacity-70">
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
          <Иконка size={17} />
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

function выбратьСледующееДействие(
  задачиНаСегодня: { название: string; состояние: string; важность: string }[],
  сигналы: Сигнал[],
): {
  заголовок: string
  пояснение: string
  ссылка: string | null
  подписьКнопки: string
  /** Какой сигнал занят наверху — чтобы он не повторился в списке ниже. */
  сигналId: string | null
} {
  const критичный = сигналы.find((с) => с.уровень === 'критично')
  if (критичный) {
    return {
      заголовок: критичный.текст,
      пояснение: критичный.объяснение,
      ссылка: критичный.ссылка,
      подписьКнопки: 'Разобраться',
      сигналId: критичный.id,
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
      сигналId: null,
    }
  }

  const внимание = сигналы[0]
  if (внимание) {
    return {
      заголовок: внимание.текст,
      пояснение: внимание.объяснение,
      ссылка: внимание.ссылка,
      подписьКнопки: 'Посмотреть',
      сигналId: внимание.id,
    }
  }

  return {
    заголовок: 'На сегодня всё закрыто',
    пояснение:
      'Просроченных задач нет, ближайших платежей нет, цели двигаются. Хорошее время спланировать завтра.',
    ссылка: null,
    подписьКнопки: '',
    сигналId: null,
  }
}
