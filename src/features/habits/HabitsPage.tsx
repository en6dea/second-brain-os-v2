import { useState } from 'react'
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
import { использоватьИнтерфейс } from '@/app/providers/ui'
import { cn } from '@/design-system/classNames'
import {
  Input,
  Select,
  Skeleton,
  Card,
  Button,
  IconButton,
  Metric,
  Dialog,
  Field,
  EmptyState,
  CardHeader,
} from '@/design-system/components'

const ДНИ = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

export function HabitsPage() {
  const сообщить = использоватьИнтерфейс((с) => с.сообщить)
  const день = сегодня()
  const [черновик, установитьЧерновик] = useState<Partial<Привычка> | null>(null)

  const привычки = useLiveQuery(() => база.habits.toArray(), [])
  const цели = useLiveQuery(() => база.goals.toArray(), [])

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
          дниНедели: [],
          разВНеделю: черновик.разВНеделю ?? null,
          норма: черновик.норма ?? 1,
          единица: черновик.единица ?? 'раз',
          цельId: черновик.цельId ?? null,
          сфераId: null,
          активна: true,
          отметки: {},
        }) as never,
      )
      сообщить('Привычка добавлена')
    }
    установитьЧерновик(null)
  }

  return (
    <div className="anim-rise space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[20px] font-semibold text-ink">Привычки</h1>
          <p className="mt-0.5 text-[13px] text-ink-3">
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
                  <th className="px-5 py-2 text-left text-[11px] font-medium text-ink-3">
                    Привычка
                  </th>
                  {дниНедели.map((дата, индекс) => (
                    <th
                      key={дата}
                      className={cn(
                        'w-10 py-2 text-center text-[11px] font-medium',
                        дата === день ? 'text-accent' : 'text-ink-3',
                      )}
                    >
                      {ДНИ[индекс]}
                    </th>
                  ))}
                  <th className="w-16 px-3 py-2 text-right text-[11px] font-medium text-ink-3">
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
                      <button
                        type="button"
                        onClick={() => установитьЧерновик(привычка)}
                        className="max-w-[220px] truncate text-left text-[13.5px] text-ink hover:text-accent"
                      >
                        {привычка.название}
                      </button>
                      <span className="block text-[11px] text-ink-3">
                        {привычка.норма} {привычка.единица} · {привычка.частота}
                      </span>
                    </td>
                    {дниНедели.map((дата) => {
                      const отмечено = (привычка.отметки[дата] ?? 0) > 0
                      const будущее = дата > день
                      return (
                        <td key={дата} className="py-2.5 text-center">
                          <button
                            type="button"
                            disabled={будущее}
                            onClick={() => отметить(привычка, дата)}
                            aria-label={`${привычка.название}, ${дата}`}
                            className={cn(
                              'inline-flex h-7 w-7 items-center justify-center rounded-2 border transition-colors',
                              отмечено
                                ? 'border-transparent bg-good text-white'
                                : будущее
                                  ? 'border-line opacity-35'
                                  : 'border-line hover:border-accent',
                            )}
                          >
                            {отмечено ? <Check size={14} /> : null}
                          </button>
                        </td>
                      )
                    })}
                    <td className="tnum px-3 py-2.5 text-right text-[13px] text-ink-2">
                      {длинаСерии(привычка, день)}
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
