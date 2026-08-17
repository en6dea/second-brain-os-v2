import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  Trash2,
} from 'lucide-react'
import { Link } from 'react-router-dom'
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
import { сейчас } from '@/core/db/RecordId'
import { useИнтерфейс } from '@/app/providers/ui'
import {
  Badge,
  Button,
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
  /** Куда ведёт запись, если её нужно открыть целиком. */
  ссылка: string
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
  const сообщить = useИнтерфейс((с) => с.сообщить)
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
        ссылка: '/tasks',
      })
    }
    for (const событие of данные.события) {
      добавить(событие.дата, {
        id: событие.id,
        вид: 'событие',
        название: событие.название,
        подпись: событие.время ?? 'весь день',
        сделано: false,
        ссылка: '/calendar',
      })
    }
    for (const платёж of данные.платежи) {
      добавить(платёж.дата, {
        id: платёж.id,
        вид: 'платёж',
        название: платёж.название,
        подпись: деньги(платёж.сумма),
        сделано: платёж.оплачен,
        ссылка: '/finance/budget',
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
        ссылка: '/obligations',
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

  /* --- Действия над записью дня --- */

  async function переключитьЗадачу(id: string) {
    const задача = await база.tasks.get(id)
    if (!задача) return
    const сделана = задача.состояние === 'сделана'
    await база.tasks.put({
      ...задача,
      состояние: сделана ? 'новая' : 'сделана',
      выполненаВ: сделана ? null : сейчас(),
      updatedAt: сейчас(),
    })
    сообщить(сделана ? 'Задача вернулась в работу' : 'Задача выполнена')
  }

  async function перенестиЗадачу(id: string, дней: number) {
    const задача = await база.tasks.get(id)
    if (!задача) return
    await база.tasks.put({
      ...задача,
      дата: сдвинутьДень(задача.дата ?? день, дней),
      переносов: задача.переносов + 1,
      updatedAt: сейчас(),
    })
    установитьДень(null)
    сообщить(
      задача.переносов + 1 >= 3
        ? `Перенесено. Это уже ${задача.переносов + 1}-й перенос — возможно, задача слишком крупная.`
        : дней === 1
          ? 'Перенесено на завтра'
          : 'Перенесено на неделю вперёд',
    )
  }

  async function переключитьПлатёж(id: string) {
    const платёж = await база.plannedPayments.get(id)
    if (!платёж) return
    await база.plannedPayments.put({
      ...платёж,
      оплачен: !платёж.оплачен,
      updatedAt: сейчас(),
    })
    сообщить(
      платёж.оплачен
        ? 'Отметка оплаты снята'
        : 'Отмечено оплаченным. Операция при этом не создаётся: план не равен расходу',
    )
  }

  async function удалить(отметка: ОтметкаДня) {
    switch (отметка.вид) {
      case 'задача':
        await база.tasks.delete(отметка.id)
        break
      case 'событие':
        await база.events.delete(отметка.id)
        break
      case 'платёж':
        await база.plannedPayments.delete(отметка.id)
        break
      case 'обязательство': // Обязательство не удаляем: у него своя история платежей.
      // Убираем только дату ближайшего платежа.
      {
        const обязательство = await база.obligations.get(отметка.id)
        if (обязательство) {
          await база.obligations.put({
            ...обязательство,
            датаСледующегоПлатежа: null,
            updatedAt: сейчас(),
          })
        }
        сообщить('Дата платежа убрана. Само обязательство осталось')
        установитьДень(null)
        return
      }
    }
    сообщить('Удалено')
    установитьДень(null)
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
          <h1 className="text-h2 font-semibold text-ink">Календарь</h1>
          <p className="mt-0.5 text-meta text-ink-3">
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
          <span className="min-w-[150px] text-center text-meta font-medium text-ink first-letter:uppercase">
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
            <div className="flex flex-wrap gap-2 text-micro text-ink-3">
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
              className="bg-card px-2 py-1.5 text-center text-micro font-medium text-ink-3"
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
                    'tnum flex h-5 w-5 items-center justify-center rounded-full text-caption',
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
                      className="flex items-center gap-1 truncate text-micro text-ink-2"
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
                    <span className="text-micro text-ink-3">
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
              <div key={отметка.id} className="py-2.5">
                <div className="flex items-center justify-between gap-3">
                  <Link
                    to={отметка.ссылка}
                    onClick={() => установитьДень(null)}
                    className="min-w-0 flex-1"
                  >
                    <p
                      className={cn(
                        'truncate text-meta hover:text-accent',
                        отметка.сделано ? 'text-ink-3 line-through' : 'text-ink',
                      )}
                    >
                      {отметка.название}
                    </p>
                    <p className="text-caption text-ink-3">{отметка.подпись}</p>
                  </Link>
                  <Badge тон={ТОН[отметка.вид]}>{отметка.вид}</Badge>
                </div>

                {/* Действия прямо здесь: чтобы не уходить в раздел ради галочки */}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {отметка.вид === 'задача' ? (
                    <>
                      <Button
                        размер="малый"
                        иконка={<Check size={14} />}
                        onClick={() => переключитьЗадачу(отметка.id)}
                      >
                        {отметка.сделано ? 'Вернуть в работу' : 'Выполнить'}
                      </Button>
                      <Button
                        размер="малый"
                        иконка={<ChevronsRight size={14} />}
                        onClick={() => перенестиЗадачу(отметка.id, 1)}
                      >
                        На завтра
                      </Button>
                      <Button
                        размер="малый"
                        onClick={() => перенестиЗадачу(отметка.id, 7)}
                      >
                        На неделю
                      </Button>
                    </>
                  ) : null}

                  {отметка.вид === 'платёж' ? (
                    <Button
                      размер="малый"
                      иконка={<Check size={14} />}
                      onClick={() => переключитьПлатёж(отметка.id)}
                    >
                      {отметка.сделано
                        ? 'Снять отметку оплаты'
                        : 'Отметить оплаченным'}
                    </Button>
                  ) : null}

                  <Button
                    размер="малый"
                    вид="опасная"
                    иконка={<Trash2 size={14} />}
                    onClick={() => удалить(отметка)}
                  >
                    Удалить
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Dialog>

      <p className="text-caption text-ink-3">
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
