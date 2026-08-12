import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { база } from '@/core/db/db'
import { новаяЗапись } from '@/core/db/repo'
import type { Вызов, Опыт } from '@/core/db/types'
import {
  границыМесяца,
  месяцСловами,
  сдвинутьДень,
  сегодня,
} from '@/core/calendar/CalendarRu'
import { склонение } from '@/core/language/Plural'
import { процент } from '@/core/money/Money'
import { сейчас } from '@/core/db/RecordId'
import { useИнтерфейс } from '@/app/providers/ui'
import { cn } from '@/design-system/classNames'
import { useОтклик } from '@/design-system/motion/CountUp'
import { Ping } from '@/design-system/motion/Ping'
import {
  Badge,
  Button,
  Card,
  CardHeader,
  Dialog,
  EmptyState,
  Field,
  IconButton,
  Input,
  Metric,
  ProgressBar,
  Select,
  Skeleton,
  Textarea,
} from '@/design-system/components'

const СОСТОЯНИЯ: Опыт['состояние'][] = [
  'задуман',
  'в процессе',
  'получен',
  'отменён',
]

function сдвинутьМесяц(месяц: string, шаг: number): string {
  const [год, номер] = месяц.split('-').map(Number)
  const дата = new Date(год ?? 2026, (номер ?? 1) - 1 + шаг, 1)
  return `${дата.getFullYear()}-${String(дата.getMonth() + 1).padStart(2, '0')}`
}

/** Клетка отметки вызова: отклик живёт внутри клетки. */
function ChallengeDay({
  отмечен,
  будущее,
  подпись,
  наОтметку,
}: {
  отмечен: boolean
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
        aria-pressed={отмечен}
        onClick={() => {
          if (!отмечен) запустить()
          наОтметку()
        }}
        className={cn(
          'inline-flex h-7 w-7 items-center justify-center rounded-2 border',
          'transition-[background-color,border-color,transform] duration-150 active:scale-90',
          отмечен
            ? 'border-transparent bg-good text-white'
            : будущее
              ? 'border-line opacity-35'
              : 'border-line hover:border-accent hover:bg-accent-soft',
        )}
      >
        {отмечен ? (
          <Check size={13} className={отклик ? 'прочерк' : undefined} />
        ) : null}
      </button>
    </Ping>
  )
}

export function ExperiencePage() {
  const сообщить = useИнтерфейс((с) => с.сообщить)
  const [месяц, установитьМесяц] = useState(сегодня().slice(0, 7))
  const [черновикОпыта, установитьЧерновикОпыта] = useState<Partial<Опыт> | null>(
    null,
  )
  const [черновикВызова, установитьЧерновикВызова] =
    useState<Partial<Вызов> | null>(null)

  const данные = useLiveQuery(async () => {
    const [опыт, вызовы] = await Promise.all([
      база.experiences.toArray(),
      база.challenges.toArray(),
    ])
    return { опыт, вызовы }
  }, [])

  const дниМесяца = useMemo(() => {
    const границы = границыМесяца(месяц)
    const итог: string[] = []
    let дата = границы.от
    while (дата <= границы.до) {
      итог.push(дата)
      дата = сдвинутьДень(дата, 1)
    }
    return итог
  }, [месяц])

  if (!данные) {
    return (
      <Card>
        <Skeleton строк={5} />
      </Card>
    )
  }

  const день = сегодня()
  const опытМесяца = данные.опыт.filter((о) => о.месяц === месяц)
  const вызовыМесяца = данные.вызовы.filter((в) => в.месяц === месяц)
  const полученоВсего = данные.опыт.filter((о) => о.состояние === 'получен').length

  async function сохранитьОпыт() {
    if (!черновикОпыта?.название?.trim()) return
    const поля = {
      название: черновикОпыта.название.trim(),
      описание: черновикОпыта.описание ?? '',
      месяц: черновикОпыта.месяц ?? месяц,
      состояние: черновикОпыта.состояние ?? 'задуман',
      итог: черновикОпыта.итог ?? '',
      сфераId: null,
      чей: черновикОпыта.чей ?? '',
    }
    if (черновикОпыта.id) {
      const текущий = await база.experiences.get(черновикОпыта.id)
      if (текущий) {
        await база.experiences.put({ ...текущий, ...поля, updatedAt: сейчас() })
        сообщить('Опыт изменён')
      }
    } else {
      await база.experiences.add(новаяЗапись(поля) as never)
      сообщить('Опыт выбран на месяц')
    }
    установитьЧерновикОпыта(null)
  }

  async function сохранитьВызов() {
    if (!черновикВызова?.название?.trim()) return
    const поля = {
      название: черновикВызова.название.trim(),
      описание: черновикВызова.описание ?? '',
      месяц: черновикВызова.месяц ?? месяц,
      норма: черновикВызова.норма ?? 1,
      единица: черновикВызова.единица ?? 'раз',
      отметки: черновикВызова.отметки ?? {},
      завершён: черновикВызова.завершён ?? false,
    }
    if (черновикВызова.id) {
      const текущий = await база.challenges.get(черновикВызова.id)
      if (текущий) {
        await база.challenges.put({ ...текущий, ...поля, updatedAt: сейчас() })
        сообщить('Вызов изменён')
      }
    } else {
      await база.challenges.add(новаяЗапись(поля) as never)
      сообщить('Вызов заведён')
    }
    установитьЧерновикВызова(null)
  }

  async function отметитьДень(вызов: Вызов, дата: string) {
    const отметки = { ...вызов.отметки }
    if ((отметки[дата] ?? 0) > 0) delete отметки[дата]
    else отметки[дата] = вызов.норма || 1
    await база.challenges.put({ ...вызов, отметки, updatedAt: сейчас() })
  }

  return (
    <div className="anim-rise space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[20px] font-semibold text-ink">Опыт и вызовы</h1>
          <p className="mt-0.5 text-[13px] text-ink-3">
            Каждый месяц — один осознанно новый опыт и один вызов
          </p>
        </div>
        <div className="flex items-center gap-2">
          <IconButton
            подпись="Предыдущий месяц"
            onClick={() => установитьМесяц(сдвинутьМесяц(месяц, -1))}
          >
            <ChevronLeft size={17} />
          </IconButton>
          <span className="min-w-[140px] text-center text-[14px] font-medium text-ink first-letter:uppercase">
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

      <Card>
        <div className="grid grid-cols-2 gap-5 p-5 sm:grid-cols-3">
          <Metric
            единица="шт · опыт"
            подпись="Получено за всё время"
            значение={String(полученоВсего)}
            источник={`заведено всего: ${данные.опыт.length}`}
          />
          <Metric
            единица="шт · этот месяц"
            подпись="Опыт выбран"
            значение={String(опытМесяца.length)}
            источник={опытМесяца.length === 0 ? 'ещё не выбран' : 'на этот месяц'}
            тон={опытМесяца.length === 0 ? 'внимание' : 'успех'}
          />
          <Metric
            единица="шт · вызовы"
            подпись="Вызовов в месяце"
            значение={String(вызовыМесяца.length)}
            источник={`завершено: ${вызовыМесяца.filter((в) => в.завершён).length}`}
          />
        </div>
      </Card>

      {/* --- Опыт --- */}
      <Card>
        <CardHeader
          заголовок="Новый опыт месяца"
          подпись="В начале месяца — выбор, в конце — разбор"
          действие={
            <Button
              вид="основная"
              размер="малый"
              иконка={<Plus size={15} />}
              onClick={() =>
                установитьЧерновикОпыта({ месяц, состояние: 'задуман' })
              }
            >
              Опыт
            </Button>
          }
        />
        {опытМесяца.length === 0 ? (
          <EmptyState
            иконка={<Sparkles size={20} />}
            заголовок="На этот месяц опыт не выбран"
            подпись="Выучить что-то, приготовить новое блюдо, попробовать спорт, съездить туда, где не были. Одна вещь — этого достаточно."
            действие={
              <Button
                вид="контур"
                onClick={() =>
                  установитьЧерновикОпыта({ месяц, состояние: 'задуман' })
                }
              >
                Выбрать опыт
              </Button>
            }
          />
        ) : (
          <div className="divide-y divide-line border-t border-line">
            {опытМесяца.map((опыт) => (
              <div key={опыт.id} className="px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-medium text-ink">
                      {опыт.название}
                    </p>
                    {опыт.описание ? (
                      <p className="mt-1 text-[12.5px] whitespace-pre-wrap text-ink-2">
                        {опыт.описание}
                      </p>
                    ) : null}
                    <div className="mt-2">
                      <Badge
                        тон={
                          опыт.состояние === 'получен'
                            ? 'успех'
                            : опыт.состояние === 'отменён'
                              ? 'опасность'
                              : опыт.состояние === 'в процессе'
                                ? 'сведения'
                                : 'нейтральный'
                        }
                      >
                        {опыт.состояние}
                      </Badge>
                    </div>
                    {опыт.итог ? (
                      <p className="mt-2 rounded-2 bg-sunken px-3 py-2 text-[12.5px] whitespace-pre-wrap text-ink-2">
                        {опыт.итог}
                      </p>
                    ) : опыт.состояние === 'получен' ? (
                      <p className="mt-2 text-[12px] text-warn">
                        Опыт получен, но разбор не записан. Без него опыт остаётся
                        событием, а не выводом.
                      </p>
                    ) : null}
                  </div>
                  <div className="flex gap-0.5">
                    <IconButton
                      подпись="Изменить опыт"
                      onClick={() => установитьЧерновикОпыта(опыт)}
                    >
                      <span className="text-[13px]">✎</span>
                    </IconButton>
                    <IconButton
                      подпись="Удалить опыт"
                      onClick={async () => {
                        await база.experiences.delete(опыт.id)
                        сообщить('Опыт удалён')
                      }}
                    >
                      <Trash2 size={15} />
                    </IconButton>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* --- Вызовы --- */}
      <Card>
        <CardHeader
          заголовок="Вызов месяца"
          подпись="Отметка ставится нажатием на день"
          действие={
            <Button
              вид="основная"
              размер="малый"
              иконка={<Plus size={15} />}
              onClick={() =>
                установитьЧерновикВызова({ месяц, норма: 1, единица: 'раз' })
              }
            >
              Вызов
            </Button>
          }
        />
        {вызовыМесяца.length === 0 ? (
          <EmptyState
            заголовок="Вызова на этот месяц нет"
            подпись="Тридцать дней без чего-то или тридцать дней с чем-то. Отметки покажут, как оно шло на самом деле."
          />
        ) : (
          <div className="divide-y divide-line border-t border-line">
            {вызовыМесяца.map((вызов) => {
              const отмечено = дниМесяца.filter(
                (дата) => (вызов.отметки[дата] ?? 0) > 0,
              ).length
              const прошло = дниМесяца.filter((дата) => дата <= день).length
              const доля = процент(отмечено, дниМесяца.length)

              return (
                <div key={вызов.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[14px] font-medium text-ink">
                        {вызов.название}
                      </p>
                      <p className="mt-0.5 text-[12px] text-ink-3">
                        {отмечено} из {дниМесяца.length}{' '}
                        {склонение(дниМесяца.length, 'дня', 'дней', 'дней')} ·
                        прошло {прошло}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {вызов.завершён ? <Badge тон="успех">завершён</Badge> : null}
                      <IconButton
                        подпись="Изменить вызов"
                        onClick={() => установитьЧерновикВызова(вызов)}
                      >
                        <span className="text-[13px]">✎</span>
                      </IconButton>
                      <IconButton
                        подпись="Удалить вызов"
                        onClick={async () => {
                          await база.challenges.delete(вызов.id)
                          сообщить('Вызов удалён вместе с отметками')
                        }}
                      >
                        <Trash2 size={15} />
                      </IconButton>
                    </div>
                  </div>

                  <div className="mt-3">
                    <ProgressBar
                      значение={отмечено}
                      из={дниМесяца.length}
                      тон={доля !== null && доля >= 80 ? 'успех' : 'нейтральный'}
                    />
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1">
                    {дниМесяца.map((дата) => (
                      <ChallengeDay
                        key={дата}
                        отмечен={(вызов.отметки[дата] ?? 0) > 0}
                        будущее={дата > день}
                        подпись={`${вызов.название}, ${дата}`}
                        наОтметку={() => отметитьДень(вызов, дата)}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* --- Окно опыта --- */}
      <Dialog
        открыто={черновикОпыта !== null}
        наЗакрытие={() => установитьЧерновикОпыта(null)}
        заголовок={черновикОпыта?.id ? 'Изменить опыт' : 'Новый опыт'}
        подвал={
          <>
            <Button вид="тихая" onClick={() => установитьЧерновикОпыта(null)}>
              Отмена
            </Button>
            <Button
              вид="основная"
              onClick={сохранитьОпыт}
              disabled={!черновикОпыта?.название?.trim()}
            >
              Сохранить
            </Button>
          </>
        }
      >
        {черновикОпыта ? (
          <div className="space-y-4">
            <Field подпись="Что попробовать" обязательное>
              <Input
                value={черновикОпыта.название ?? ''}
                onChange={(событие) =>
                  установитьЧерновикОпыта({
                    ...черновикОпыта,
                    название: событие.target.value,
                  })
                }
                autoFocus
              />
            </Field>
            <Field подпись="Подробнее">
              <Textarea
                rows={3}
                value={черновикОпыта.описание ?? ''}
                onChange={(событие) =>
                  установитьЧерновикОпыта({
                    ...черновикОпыта,
                    описание: событие.target.value,
                  })
                }
              />
            </Field>
            <Field подпись="Состояние">
              <Select
                value={черновикОпыта.состояние ?? 'задуман'}
                onChange={(событие) =>
                  установитьЧерновикОпыта({
                    ...черновикОпыта,
                    состояние: событие.target.value as Опыт['состояние'],
                  })
                }
              >
                {СОСТОЯНИЯ.map((состояние) => (
                  <option key={состояние} value={состояние}>
                    {состояние}
                  </option>
                ))}
              </Select>
            </Field>
            <Field подпись="Разбор" подсказка="Что это дало и стоит ли повторять">
              <Textarea
                rows={4}
                value={черновикОпыта.итог ?? ''}
                onChange={(событие) =>
                  установитьЧерновикОпыта({
                    ...черновикОпыта,
                    итог: событие.target.value,
                  })
                }
              />
            </Field>
          </div>
        ) : null}
      </Dialog>

      {/* --- Окно вызова --- */}
      <Dialog
        открыто={черновикВызова !== null}
        наЗакрытие={() => установитьЧерновикВызова(null)}
        заголовок={черновикВызова?.id ? 'Изменить вызов' : 'Новый вызов'}
        подвал={
          <>
            <Button вид="тихая" onClick={() => установитьЧерновикВызова(null)}>
              Отмена
            </Button>
            <Button
              вид="основная"
              onClick={сохранитьВызов}
              disabled={!черновикВызова?.название?.trim()}
            >
              Сохранить
            </Button>
          </>
        }
      >
        {черновикВызова ? (
          <div className="space-y-4">
            <Field подпись="Вызов" обязательное>
              <Input
                value={черновикВызова.название ?? ''}
                onChange={(событие) =>
                  установитьЧерновикВызова({
                    ...черновикВызова,
                    название: событие.target.value,
                  })
                }
                placeholder="например: месяц без сахара"
                autoFocus
              />
            </Field>
            <Field подпись="Условие">
              <Textarea
                rows={3}
                value={черновикВызова.описание ?? ''}
                onChange={(событие) =>
                  установитьЧерновикВызова({
                    ...черновикВызова,
                    описание: событие.target.value,
                  })
                }
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field подпись="Норма за день">
                <Input
                  type="number"
                  min={1}
                  value={черновикВызова.норма ?? 1}
                  onChange={(событие) =>
                    установитьЧерновикВызова({
                      ...черновикВызова,
                      норма: Number(событие.target.value) || 1,
                    })
                  }
                />
              </Field>
              <Field подпись="Единица">
                <Input
                  value={черновикВызова.единица ?? 'раз'}
                  onChange={(событие) =>
                    установитьЧерновикВызова({
                      ...черновикВызова,
                      единица: событие.target.value,
                    })
                  }
                />
              </Field>
            </div>
          </div>
        ) : null}
      </Dialog>
    </div>
  )
}
