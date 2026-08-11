import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { база } from '@/core/db/db'
import {
  деньСловами,
  месяцСловами,
  сдвинутьДень,
  сегодня,
  текущийМесяц,
} from '@/core/calendar/CalendarRu'
import { склонение } from '@/core/language/Plural'
import { деньги } from '@/core/money/Money'
import {
  Badge,
  Card,
  CardHeader,
  Dialog,
  EmptyState,
  IconButton,
  Skeleton,
} from '@/design-system/components'
import { cn } from '@/design-system/classNames'

const ДНИ_НЕДЕЛИ = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

type ВидОтметки = 'задача' | 'событие' | 'платёж' | 'обязательство'

interface ОтметкаДня {
  id: string
  вид: ВидОтметки
  название: string
  подпись: string
  сделано: boolean
}

const ЦВЕТ: Record<ВидОтметки, string> = {
  задача: 'bg-accent',
  событие: 'bg-info',
  платёж: 'bg-warn',
  обязательство: 'bg-bad',
}

const ТОН: Record<
  ВидОтметки,
  'нейтральный' | 'сведения' | 'внимание' | 'опасность'
> = {
  задача: 'нейтральный',
  событие: 'сведения',
  платёж: 'внимание',
  обязательство: 'опасность',
}

/** Сетка месяца: полные недели с понедельника. */
function сеткаМесяца(месяц: string): string[] {
  const первое = new Date(`${месяц}-01T12:00:00`)
  const деньНедели = (первое.getDay() + 6) % 7
  const начало = new Date(первое)
  начало.setDate(начало.getDate() - деньНедели)

  const дни: string[] = []
  for (let шаг = 0; шаг < 42; шаг += 1) {
    const дата = new Date(начало)
    дата.setDate(дата.getDate() + шаг)
    дни.push(
      `${дата.getFullYear()}-${String(дата.getMonth() + 1).padStart(2, '0')}-${String(дата.getDate()).padStart(2, '0')}`,
    )
  }
  return дни
}

function сдвинутьМесяц(месяц: string, шаг: number): string {
  const [год, номер] = месяц.split('-').map(Number)
  const дата = new Date(год ?? 2026, (номер ?? 1) - 1 + шаг, 1)
  return `${дата.getFullYear()}-${String(дата.getMonth() + 1).padStart(2, '0')}`
}

export function CalendarPage() {
  const [месяц, установитьМесяц] = useState(текущийМесяц())
  const [выбранныйДень, установитьДень] = useState<string | null>(null)
  const день = сегодня()

  const данные = useLiveQuery(async () => {
    const [задачи, события, платежи, обязательства] = await Promise.all([
      база.tasks.toArray(),
      база.events.toArray(),
      база.plannedPayments.toArray(),
      база.obligations.toArray(),
    ])
    return { задачи, события, платежи, обязательства }
  }, [])

  const поДням = useMemo(() => {
    const карта = new Map<string, ОтметкаДня[]>()
    if (!данные) return карта

    const добавить = (дата: string | null, отметка: ОтметкаДня) => {
      if (!дата) return
      const список = карта.get(дата) ?? []
      список.push(отметка)
      карта.set(дата, список)
    }

    for (const задача of данные.задачи) {
      if (задача.состояние === 'отменена') continue
      добавить(задача.дата, {
        id: задача.id,
        вид: 'задача',
        название: задача.название,
        подпись: задача.время ?? 'задача',
        сделано: задача.состояние === 'сделана',
      })
    }
    for (const событие of данные.события) {
      добавить(событие.дата, {
        id: событие.id,
        вид: 'событие',
        название: событие.название,
        подпись: событие.время ?? 'весь день',
        сделано: false,
      })
    }
    for (const платёж of данные.платежи) {
      добавить(платёж.дата, {
        id: платёж.id,
        вид: 'платёж',
        название: платёж.название,
        подпись: деньги(платёж.сумма),
        сделано: платёж.оплачен,
      })
    }
    for (const обязательство of данные.обязательства) {
      if (обязательство.закрыто) continue
      добавить(обязательство.датаСледующегоПлатежа, {
        id: обязательство.id,
        вид: 'обязательство',
        название: обязательство.название,
        подпись: деньги(обязательство.минимальныйПлатёж),
        сделано: false,
      })
    }

    return карта
  }, [данные])

  if (!данные) {
    return (
      <Card>
        <Skeleton строк={6} />
      </Card>
    )
  }

  const дни = сеткаМесяца(месяц)
  const вМесяце = дни.filter((дата) => дата.startsWith(месяц))
  const отметокЗаМесяц = вМесяце.reduce(
    (итог, дата) => итог + (поДням.get(дата)?.length ?? 0),
    0,
  )
  const отметкиДня = выбранныйДень ? (поДням.get(выбранныйДень) ?? []) : []

  return (
    <div className="anim-rise space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[20px] font-semibold text-ink">Календарь</h1>
          <p className="mt-0.5 text-[13px] text-ink-3">
            Задачи, события и платежи на одной сетке
          </p>
        </div>
        <div className="flex items-center gap-2">
          <IconButton
            подпись="Предыдущий месяц"
            onClick={() => установитьМесяц(сдвинутьМесяц(месяц, -1))}
          >
            <ChevronLeft size={17} />
          </IconButton>
          <span className="min-w-[150px] text-center text-[14px] font-medium text-ink first-letter:uppercase">
            {месяцСловами(месяц)}
          </span>
          <IconButton
            подпись="Следующий месяц"
            onClick={() => установитьМесяц(сдвинутьМесяц(месяц, 1))}
          >
            <ChevronRight size={17} />
          </IconButton>
        </div>
      </div>

      <Card className="overflow-hidden">
        <CardHeader
          заголовок={`${отметокЗаМесяц} ${склонение(отметокЗаМесяц, 'запись', 'записи', 'записей')} в этом месяце`}
          подпись="Нажмите на день, чтобы увидеть подробности"
          действие={
            <div className="flex flex-wrap gap-2 text-[11px] text-ink-3">
              {(
                [
                  ['задача', 'задачи'],
                  ['событие', 'события'],
                  ['платёж', 'платежи'],
                  ['обязательство', 'долги'],
                ] as [ВидОтметки, string][]
              ).map(([вид, подпись]) => (
                <span key={вид} className="inline-flex items-center gap-1">
                  <span className={cn('h-1.5 w-1.5 rounded-full', ЦВЕТ[вид])} />
                  {подпись}
                </span>
              ))}
            </div>
          }
        />

        <div className="grid grid-cols-7 border-t border-line bg-line gap-px">
          {ДНИ_НЕДЕЛИ.map((имя) => (
            <div
              key={имя}
              className="bg-card px-2 py-1.5 text-center text-[10.5px] font-medium text-ink-3"
            >
              {имя}
            </div>
          ))}

          {дни.map((дата) => {
            const свой = дата.startsWith(месяц)
            const сегодняшний = дата === день
            const отметки = поДням.get(дата) ?? []
            return (
              <button
                key={дата}
                type="button"
                onClick={() => установитьДень(дата)}
                className={cn(
                  'flex min-h-[76px] flex-col items-start gap-1 bg-card p-1.5 text-left transition-colors',
                  'hover:bg-hover',
                  !свой && 'opacity-40',
                )}
              >
                <span
                  className={cn(
                    'tnum flex h-5 w-5 items-center justify-center rounded-full text-[11.5px]',
                    сегодняшний
                      ? 'bg-accent font-semibold text-on-accent'
                      : 'text-ink-2',
                  )}
                >
                  {Number(дата.slice(8))}
                </span>
                <span className="flex w-full flex-col gap-0.5">
                  {отметки.slice(0, 3).map((отметка) => (
                    <span
                      key={отметка.id}
                      className="flex items-center gap-1 truncate text-[10.5px] text-ink-2"
                    >
                      <span
                        className={cn(
                          'h-1.5 w-1.5 shrink-0 rounded-full',
                          ЦВЕТ[отметка.вид],
                          отметка.сделано && 'opacity-35',
                        )}
                      />
                      <span
                        className={cn(
                          'truncate',
                          отметка.сделано && 'text-ink-3 line-through',
                        )}
                      >
                        {отметка.название}
                      </span>
                    </span>
                  ))}
                  {отметки.length > 3 ? (
                    <span className="text-[10px] text-ink-3">
                      ещё {отметки.length - 3}
                    </span>
                  ) : null}
                </span>
              </button>
            )
          })}
        </div>
      </Card>

      <Dialog
        открыто={выбранныйДень !== null}
        наЗакрытие={() => установитьДень(null)}
        заголовок={выбранныйДень ? деньСловами(выбранныйДень) : ''}
        подпись={
          выбранныйДень === день
            ? 'сегодня'
            : выбранныйДень && выбранныйДень < день
              ? 'прошедший день'
              : undefined
        }
      >
        {отметкиДня.length === 0 ? (
          <EmptyState
            заголовок="В этот день ничего нет"
            подпись="Ни задач, ни событий, ни платежей."
          />
        ) : (
          <div className="divide-y divide-line">
            {отметкиДня.map((отметка) => (
              <div
                key={отметка.id}
                className="flex items-center justify-between gap-3 py-2.5"
              >
                <div className="min-w-0">
                  <p
                    className={cn(
                      'truncate text-[13.5px]',
                      отметка.сделано ? 'text-ink-3 line-through' : 'text-ink',
                    )}
                  >
                    {отметка.название}
                  </p>
                  <p className="text-[11.5px] text-ink-3">{отметка.подпись}</p>
                </div>
                <Badge тон={ТОН[отметка.вид]}>{отметка.вид}</Badge>
              </div>
            ))}
          </div>
        )}
      </Dialog>

      <p className="text-[12px] text-ink-3">
        Ближайший день с записями:{' '}
        {(() => {
          for (let шаг = 0; шаг < 90; шаг += 1) {
            const дата = сдвинутьДень(день, шаг)
            if ((поДням.get(дата)?.length ?? 0) > 0) {
              return шаг === 0 ? 'сегодня' : деньСловами(дата)
            }
          }
          return 'в ближайшие три месяца ничего не запланировано'
        })()}
      </p>
    </div>
  )
}
