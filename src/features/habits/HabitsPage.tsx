import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Check, Plus, Trash2 } from 'lucide-react'
import { база } from '@/core/db/db'
import { новаяЗапись } from '@/core/db/repo'
import type { Привычка } from '@/core/db/types'
import { длинаСерии } from '@/core/signals/engine'
import { границыНедели, сдвинутьДень, сегодня } from '@/core/calendar/CalendarRu'
import { склонение } from '@/core/language/Plural'
import { процент } from '@/core/money/Money'
import { сейчас } from '@/core/db/RecordId'
import { useИнтерфейс } from '@/app/providers/ui'
import { читатьНастройки } from '@/core/db/repo'
import { cn } from '@/design-system/classNames'
import { useОтклик } from '@/design-system/motion/CountUp'
import { Ping } from '@/design-system/motion/Ping'
import {
  Input,
  Select,
  Skeleton,
  Card,
  Button,
  IconButton,
  Metric,
  Poster,
  Dialog,
  Field,
  EmptyState,
  CardHeader,
} from '@/design-system/components'
import { useСигналыПоРазделам } from '@/features/signals/useSignals'
import { SignalsStrip } from '@/features/signals/SignalsStrip'

const ДНИ = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

/**
 * Клетка недельной сетки.
 *
 * Отметка отзывается импульсом, галочка прочерчивается. Отклик живёт внутри
 * клетки: соседние ячейки при этом не перерисовываются.
 */
function HabitCell({
  отмечено,
  будущее,
  подпись,
  наОтметку,
}: {
  отмечено: boolean
  будущее: boolean
  подпись: string
  наОтметку: () => void
}) {
  const [отклик, запустить] = useОтклик(900)

  return (
    <Ping активен={отклик} тон="успех">
      <button
        type="button"
        disabled={будущее}
        aria-label={подпись}
        aria-pressed={отмечено}
        onClick={() => {
          if (!отмечено) запустить()
          наОтметку()
        }}
        className={cn(
          'inline-flex h-7 w-7 items-center justify-center rounded-2 border',
          'transition-[background-color,border-color,transform] duration-150',
          'active:scale-90',
          отмечено
            ? 'border-transparent bg-good text-white'
            : будущее
              ? 'border-line opacity-35'
              : 'border-line hover:border-accent hover:bg-accent-soft',
        )}
      >
        {отмечено ? (
          <Check size={14} className={отклик ? 'прочерк' : undefined} />
        ) : null}
      </button>
    </Ping>
  )
}

/** Серия дней. При росте число подпрыгивает и на миг зеленеет. */
function StreakCount({ длина }: { длина: number }) {
  const предыдущая = useRef(длина)
  const [подрос, установитьПодрос] = useState(false)

  useEffect(() => {
    if (длина > предыдущая.current) {
      установитьПодрос(true)
      const таймер = setTimeout(() => установитьПодрос(false), 640)
      предыдущая.current = длина
      return () => clearTimeout(таймер)
    }
    предыдущая.current = длина
  }, [длина])

  return <span className={подрос ? 'подрос' : undefined}>{длина}</span>
}

export function HabitsPage() {
  const сообщить = useИнтерфейс((с) => с.сообщить)
  const день = сегодня()
  const [черновик, установитьЧерновик] = useState<Partial<Привычка> | null>(null)
  const сигналы = useСигналыПоРазделам(['Привычки'])

  const привычки = useLiveQuery(() => база.habits.toArray(), [])
  const цели = useLiveQuery(() => база.goals.toArray(), [])
  const настройки = useLiveQuery(() => читатьНастройки(), [])
  const показыватьПостеры = настройки?.показыватьПостеры !== false

  if (!привычки) {
    return (
      <Card>
        <Skeleton строк={4} />
      </Card>
    )
  }

  const активные = привычки.filter((п) => п.активна)
  const неделя = границыНедели(день)
  const дниНедели = Array.from({ length: 7 }, (_, шаг) =>
    сдвинутьДень(неделя.от, шаг),
  )

  const отмеченоЗаНеделю = активные.reduce(
    (итог, привычка) =>
      итог + дниНедели.filter((дата) => (привычка.отметки[дата] ?? 0) > 0).length,
    0,
  )
  const возможноЗаНеделю = активные.length * 7
  const выполнениеНедели = процент(отмеченоЗаНеделю, возможноЗаНеделю)

  async function отметить(привычка: Привычка, дата: string) {
    const отметки = { ...привычка.отметки }
    if ((отметки[дата] ?? 0) > 0) delete отметки[дата]
    else отметки[дата] = привычка.норма || 1
    await база.habits.put({ ...привычка, отметки, updatedAt: сейчас() })
  }

  async function сохранить() {
    if (!черновик?.название?.trim()) return
    if (черновик.id) {
      const текущая = await база.habits.get(черновик.id)
      if (текущая) {
        await база.habits.put({
          ...текущая,
          ...черновик,
          updatedAt: сейчас(),
        } as Привычка)
        сообщить('Привычка изменена')
      }
    } else {
      await база.habits.add(
        новаяЗапись({
          название: черновик.название.trim(),
          иконка: '',
          цвет: 'accent',
          частота: черновик.частота ?? 'ежедневно',
          дниНедели: черновик.дниНедели ?? [],
          разВНеделю: черновик.разВНеделю ?? null,
          норма: черновик.норма ?? 1,
          единица: черновик.единица ?? 'раз',
          цельId: черновик.цельId ?? null,
          сфераId: null,
          активна: true,
          постер: черновик.постер ?? '',
          отметки: {},
        }) as never,
      )
      сообщить('Привычка добавлена')
    }
    установитьЧерновик(null)
  }

  return (
    <div className="anim-rise space-y-5">
      {сигналы && сигналы.length > 0 ? <SignalsStrip сигналы={сигналы} /> : null}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-h2 font-semibold text-ink">Привычки</h1>
          <p className="mt-0.5 text-meta text-ink-3">
            {активные.length}{' '}
            {склонение(активные.length, 'активная', 'активные', 'активных')}
          </p>
        </div>
        <Button
          вид="основная"
          иконка={<Plus size={16} />}
          onClick={() => установитьЧерновик({ частота: 'ежедневно', норма: 1 })}
        >
          Привычка
        </Button>
      </div>

      {активные.length > 0 ? (
        <Card>
          <div className="grid grid-cols-2 gap-5 p-5 sm:grid-cols-3">
            <Metric
              подпись="Выполнение недели"
              значение={выполнениеНедели === null ? '—' : `${выполнениеНедели}%`}
              источник={`${отмеченоЗаНеделю} из ${возможноЗаНеделю} отметок`}
            />
            <Metric
              подпись="Отмечено сегодня"
              значение={`${активные.filter((п) => (п.отметки[день] ?? 0) > 0).length}/${активные.length}`}
            />
            <Metric
              подпись="Лучшая серия сейчас"
              значение={String(
                активные.reduce(
                  (итог, привычка) => Math.max(итог, длинаСерии(привычка, день)),
                  0,
                ),
              )}
              источник="дней подряд без пропуска"
            />
          </div>
        </Card>
      ) : null}

      <Card>
        <CardHeader
          заголовок="Неделя"
          подпись="Отметка ставится нажатием на день"
        />
        {активные.length === 0 ? (
          <EmptyState
            заголовок="Привычек пока нет"
            подпись="Привычка — это то, что двигает цель каждый день. Начните с одной."
            действие={
              <Button
                вид="контур"
                onClick={() =>
                  установитьЧерновик({ частота: 'ежедневно', норма: 1 })
                }
              >
                Добавить привычку
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto border-t border-line">
            <table className="w-full min-w-[520px]">
              <thead>
                <tr className="border-b border-line">
                  <th className="px-5 py-2 text-left text-micro font-medium text-ink-3">
                    Привычка
                  </th>
                  {дниНедели.map((дата, индекс) => (
                    <th
                      key={дата}
                      className={cn(
                        'w-10 py-2 text-center text-micro font-medium',
                        дата === день ? 'text-accent' : 'text-ink-3',
                      )}
                    >
                      {ДНИ[индекс]}
                    </th>
                  ))}
                  <th className="w-16 px-3 py-2 text-right text-micro font-medium text-ink-3">
                    Серия
                  </th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {активные.map((привычка) => (
                  <tr
                    key={привычка.id}
                    className="border-b border-line last:border-0"
                  >
                    <td className="px-5 py-2.5">
                      <span className="flex items-center gap-2">
                        {привычка.постер ? (
                          <Poster
                            адрес={привычка.постер}
                            подпись={привычка.название}
                            размер="значок"
                            показывать={показыватьПостеры}
                            className="h-10 w-10"
                          />
                        ) : null}
                        <button
                          type="button"
                          onClick={() => установитьЧерновик(привычка)}
                          className="max-w-[200px] truncate text-left text-meta text-ink hover:text-accent"
                        >
                          {привычка.название}
                        </button>
                      </span>
                      <span className="block text-micro text-ink-3">
                        {привычка.норма} {привычка.единица} · {привычка.частота}
                      </span>
                    </td>
                    {дниНедели.map((дата) => (
                      <td key={дата} className="py-2.5 text-center">
                        <HabitCell
                          отмечено={(привычка.отметки[дата] ?? 0) > 0}
                          будущее={дата > день}
                          подпись={`${привычка.название}, ${дата}`}
                          наОтметку={() => отметить(привычка, дата)}
                        />
                      </td>
                    ))}
                    <td className="tnum px-3 py-2.5 text-right text-meta text-ink-2">
                      <StreakCount длина={длинаСерии(привычка, день)} />
                    </td>
                    <td className="px-2">
                      <IconButton
                        подпись={`Удалить привычку ${привычка.название}`}
                        onClick={async () => {
                          await база.habits.delete(привычка.id)
                          сообщить('Привычка удалена вместе с отметками')
                        }}
                      >
                        <Trash2 size={14} />
                      </IconButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {активные.length > 0 ? (
        <Card>
          <CardHeader
            заголовок="Последние восемь недель"
            подпись="Доля отмеченных дней в каждой неделе — видно, где привычка просела"
          />
          <div className="divide-y divide-line border-t border-line">
            {активные.map((привычка) => {
              const недели = Array.from({ length: 8 }, (_, шаг) => {
                const конецНедели = сдвинутьДень(неделя.от, (шаг - 7) * 7 + 6)
                const началоНедели = сдвинутьДень(конецНедели, -6)
                let отмечено = 0
                let прошло = 0
                for (let д = 0; д < 7; д += 1) {
                  const дата = сдвинутьДень(началоНедели, д)
                  if (дата > день) continue
                  прошло += 1
                  if ((привычка.отметки[дата] ?? 0) > 0) отмечено += 1
                }
                return { началоНедели, конецНедели, отмечено, прошло }
              })

              return (
                <div key={привычка.id} className="px-5 py-3.5">
                  <div className="mb-2 flex items-baseline justify-between gap-3">
                    <span className="truncate text-meta text-ink">
                      {привычка.название}
                    </span>
                    <span className="tnum text-caption text-ink-3">
                      за 8 недель: {недели.reduce((и, н) => и + н.отмечено, 0)} из{' '}
                      {недели.reduce((и, н) => и + н.прошло, 0)}
                    </span>
                  </div>
                  <div className="flex items-end gap-1">
                    {недели.map((н) => {
                      const доля = н.прошло > 0 ? н.отмечено / н.прошло : 0
                      const текущая = н.конецНедели >= неделя.от
                      return (
                        <span
                          key={н.началоНедели}
                          title={`${н.началоНедели} — ${н.конецНедели}: ${н.отмечено} из ${н.прошло}`}
                          className="flex flex-1 flex-col items-center gap-1"
                        >
                          <span className="flex h-9 w-full items-end overflow-hidden rounded-[4px] bg-sunken">
                            <span
                              className={cn(
                                'w-full rounded-[4px] transition-[height] duration-500',
                                н.прошло === 0
                                  ? ''
                                  : доля >= 0.8
                                    ? 'bg-good'
                                    : доля >= 0.4
                                      ? 'bg-warn'
                                      : 'bg-bad',
                              )}
                              style={{ height: `${Math.round(доля * 100)}%` }}
                            />
                          </span>
                          <span
                            className={cn(
                              'text-micro',
                              текущая ? 'text-accent' : 'text-ink-3',
                            )}
                          >
                            {н.началоНедели.slice(8)}.{н.началоНедели.slice(5, 7)}
                          </span>
                        </span>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      ) : null}

      <Dialog
        открыто={черновик !== null}
        наЗакрытие={() => установитьЧерновик(null)}
        заголовок={черновик?.id ? 'Изменить привычку' : 'Новая привычка'}
        подвал={
          <>
            <Button вид="тихая" onClick={() => установитьЧерновик(null)}>
              Отмена
            </Button>
            <Button
              вид="основная"
              onClick={сохранить}
              disabled={!черновик?.название?.trim()}
            >
              Сохранить
            </Button>
          </>
        }
      >
        {черновик ? (
          <div className="space-y-4">
            <Field подпись="Название" обязательное>
              <Input
                value={черновик.название ?? ''}
                onChange={(событие) =>
                  установитьЧерновик({
                    ...черновик,
                    название: событие.target.value,
                  })
                }
                autoFocus
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field подпись="Норма за раз">
                <Input
                  type="number"
                  min={1}
                  value={черновик.норма ?? 1}
                  onChange={(событие) =>
                    установитьЧерновик({
                      ...черновик,
                      норма: Number(событие.target.value) || 1,
                    })
                  }
                />
              </Field>
              <Field подпись="Единица">
                <Input
                  value={черновик.единица ?? 'раз'}
                  onChange={(событие) =>
                    установитьЧерновик({
                      ...черновик,
                      единица: событие.target.value,
                    })
                  }
                  placeholder="раз, минут, страниц"
                />
              </Field>
            </div>
            <Field подпись="Частота">
              <Select
                value={черновик.частота ?? 'ежедневно'}
                onChange={(событие) =>
                  установитьЧерновик({
                    ...черновик,
                    частота: событие.target.value as Привычка['частота'],
                  })
                }
              >
                <option value="ежедневно">Ежедневно</option>
                <option value="по дням недели">По дням недели</option>
                <option value="сколько-то раз в неделю">
                  Сколько-то раз в неделю
                </option>
              </Select>
            </Field>
            {черновик.частота === 'по дням недели' ? (
              <Field подпись="Дни" подсказка="Хотя бы один день">
                <div className="flex flex-wrap gap-1.5">
                  {ДНИ.map((подпись, индекс) => {
                    const номер = индекс + 1
                    const выбран = (черновик.дниНедели ?? []).includes(номер)
                    return (
                      <button
                        key={номер}
                        type="button"
                        aria-pressed={выбран}
                        onClick={() =>
                          установитьЧерновик({
                            ...черновик,
                            дниНедели: выбран
                              ? (черновик.дниНедели ?? []).filter((д) => д !== номер)
                              : [...(черновик.дниНедели ?? []), номер].sort(
                                  (а, б) => а - б,
                                ),
                          })
                        }
                        className={cn(
                          'h-11 min-w-11 rounded-2 border px-2 text-meta transition-colors',
                          выбран
                            ? 'border-transparent bg-accent text-on-accent'
                            : 'border-line text-ink-2 hover:border-accent hover:bg-accent-soft',
                        )}
                      >
                        {подпись}
                      </button>
                    )
                  })}
                </div>
              </Field>
            ) : null}
            {черновик.частота === 'сколько-то раз в неделю' ? (
              <Field подпись="Раз в неделю">
                <Input
                  type="number"
                  min={1}
                  max={7}
                  value={черновик.разВНеделю ?? 3}
                  onChange={(событие) =>
                    установитьЧерновик({
                      ...черновик,
                      разВНеделю: Number(событие.target.value) || 1,
                    })
                  }
                />
              </Field>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
              <Field
                подпись="Картинка по адресу"
                подсказка="Грузится с чужого сервера"
              >
                <Input
                  value={черновик.постер ?? ''}
                  onChange={(событие) =>
                    установитьЧерновик({
                      ...черновик,
                      постер: событие.target.value,
                    })
                  }
                  placeholder="https://…"
                />
              </Field>
              <Poster
                адрес={черновик.постер ?? ''}
                подпись="Предпросмотр"
                размер="значок"
                показывать={показыватьПостеры}
              />
            </div>
            <Field
              подпись="Связать с целью"
              подсказка="Привычка без цели быстро теряет смысл"
            >
              <Select
                value={черновик.цельId ?? ''}
                onChange={(событие) =>
                  установитьЧерновик({
                    ...черновик,
                    цельId: событие.target.value || null,
                  })
                }
              >
                <option value="">Без цели</option>
                {(цели ?? [])
                  .filter((цель) => цель.состояние === 'активна')
                  .map((цель) => (
                    <option key={цель.id} value={цель.id}>
                      {цель.название}
                    </option>
                  ))}
              </Select>
            </Field>
          </div>
        ) : null}
      </Dialog>
    </div>
  )
}
