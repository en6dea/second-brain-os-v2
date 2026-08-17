import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Briefcase, Plus, Trash2 } from 'lucide-react'
import { база } from '@/core/db/db'
import { новаяЗапись } from '@/core/db/repo'
import type { СостояниеПроекта } from '@/core/db/types'
import { деньСловами, днейДо } from '@/core/calendar/CalendarRu'
import { склонение } from '@/core/language/Plural'
import { процент } from '@/core/money/Money'
import { сейчас } from '@/core/db/RecordId'
import { useИнтерфейс } from '@/app/providers/ui'
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
  Segmented,
  Select,
  Skeleton,
  Textarea,
} from '@/design-system/components'

const СОСТОЯНИЯ: { ключ: СостояниеПроекта; подпись: string }[] = [
  { ключ: 'активен', подпись: 'Активен' },
  { ключ: 'завершён', подпись: 'Завершён' },
  { ключ: 'заморожен', подпись: 'Заморожен' },
]

interface Черновик {
  id: string | null
  название: string
  описание: string
  состояние: СостояниеПроекта
  срок: string
  целиId: string[]
}

function пустой(): Черновик {
  return {
    id: null,
    название: '',
    описание: '',
    состояние: 'активен',
    срок: '',
    целиId: [],
  }
}

export function ProjectsPage() {
  const сообщить = useИнтерфейс((с) => с.сообщить)
  const [отбор, установитьОтбор] = useState<'активен' | 'все'>('активен')
  const [черновик, установитьЧерновик] = useState<Черновик | null>(null)

  const данные = useLiveQuery(async () => {
    const [проекты, задачи, цели] = await Promise.all([
      база.projects.toArray(),
      база.tasks.toArray(),
      база.goals.toArray(),
    ])
    return { проекты, задачи, цели }
  }, [])

  const отобранные = useMemo(() => {
    if (!данные) return []
    return данные.проекты
      .filter((проект) => отбор === 'все' || проект.состояние === 'активен')
      .sort((а, б) => (а.срок ?? '9999').localeCompare(б.срок ?? '9999'))
  }, [данные, отбор])

  if (!данные) {
    return (
      <Card>
        <Skeleton строк={4} />
      </Card>
    )
  }

  const задачиПроекта = (проектId: string) =>
    данные.задачи.filter((задача) => задача.проектId === проектId)

  const активных = данные.проекты.filter((п) => п.состояние === 'активен').length
  const безЗадач = данные.проекты.filter(
    (п) => п.состояние === 'активен' && задачиПроекта(п.id).length === 0,
  ).length

  async function сохранить() {
    if (!черновик?.название.trim()) return
    const поля = {
      название: черновик.название.trim(),
      описание: черновик.описание.trim(),
      состояние: черновик.состояние,
      срок: черновик.срок || null,
      целиId: черновик.целиId,
      сфераId: null,
    }
    if (черновик.id) {
      const текущий = await база.projects.get(черновик.id)
      if (текущий) {
        await база.projects.put({ ...текущий, ...поля, updatedAt: сейчас() })
        сообщить('Проект изменён')
      }
    } else {
      await база.projects.add(новаяЗапись(поля) as never)
      сообщить('Проект создан')
    }
    установитьЧерновик(null)
  }

  return (
    <div className="anim-rise space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-h2 font-semibold text-ink">Проекты</h1>
          <p className="mt-0.5 text-meta text-ink-3">
            Между целью и задачей: набор дел с результатом и сроком
          </p>
        </div>
        <Button
          вид="основная"
          иконка={<Plus size={16} />}
          onClick={() => установитьЧерновик(пустой())}
        >
          Проект
        </Button>
      </div>

      {данные.проекты.length > 0 ? (
        <Card>
          <div className="grid grid-cols-2 gap-5 p-5 sm:grid-cols-3">
            <Metric
              единица="шт · проекты"
              подпись="Активных"
              значение={String(активных)}
              источник={`всего заведено: ${данные.проекты.length}`}
            />
            <Metric
              единица="шт · задачи"
              подпись="Привязано к проектам"
              значение={String(
                данные.задачи.filter((з) => з.проектId !== null).length,
              )}
              источник={`из ${данные.задачи.length} задач всего`}
            />
            <Metric
              единица="шт · пусто"
              подпись="Проектов без задач"
              значение={String(безЗадач)}
              источник="проект без задач — это намерение"
              тон={безЗадач > 0 ? 'внимание' : 'успех'}
            />
          </div>
        </Card>
      ) : null}

      <Segmented
        значения={[
          { ключ: 'активен' as const, подпись: `Активные · ${активных}` },
          { ключ: 'все' as const, подпись: `Все · ${данные.проекты.length}` },
        ]}
        выбрано={отбор}
        наВыбор={установитьОтбор}
      />

      {отобранные.length === 0 ? (
        <Card>
          <EmptyState
            иконка={<Briefcase size={20} />}
            заголовок={
              данные.проекты.length === 0 ? 'Проектов нет' : 'В этом отборе пусто'
            }
            подпись="Цель отвечает на «зачем», проект — на «что именно сделать». Задачи внутри проекта складываются в результат."
            действие={
              данные.проекты.length === 0 ? (
                <Button вид="контур" onClick={() => установитьЧерновик(пустой())}>
                  Создать первый проект
                </Button>
              ) : null
            }
          />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {отобранные.map((проект) => {
            const задачи = задачиПроекта(проект.id)
            const сделано = задачи.filter((з) => з.состояние === 'сделана').length
            const доля = процент(сделано, задачи.length)
            const дней = днейДо(проект.срок)
            const цели = данные.цели.filter((ц) => проект.целиId.includes(ц.id))

            return (
              <Card key={проект.id}>
                <CardHeader
                  заголовок={проект.название}
                  подпись={проект.описание || 'Описания нет'}
                  действие={
                    <div className="flex gap-0.5">
                      <IconButton
                        подпись="Изменить проект"
                        onClick={() =>
                          установитьЧерновик({
                            id: проект.id,
                            название: проект.название,
                            описание: проект.описание,
                            состояние: проект.состояние,
                            срок: проект.срок ?? '',
                            целиId: проект.целиId,
                          })
                        }
                      >
                        <span className="text-meta">✎</span>
                      </IconButton>
                      <IconButton
                        подпись="Удалить проект"
                        onClick={async () => {
                          await база.projects.delete(проект.id)
                          сообщить('Проект удалён. Задачи остались.')
                        }}
                      >
                        <Trash2 size={15} />
                      </IconButton>
                    </div>
                  }
                />
                <div className="space-y-3 px-5 pb-5">
                  {задачи.length > 0 ? (
                    <div>
                      <div className="mb-1.5 flex items-baseline justify-between text-caption">
                        <span className="text-ink-3">Задачи</span>
                        <span className="tnum text-ink-2">
                          {сделано} из {задачи.length} · {доля ?? 0}%
                        </span>
                      </div>
                      <ProgressBar
                        значение={сделано}
                        из={задачи.length}
                        тон={доля === 100 ? 'успех' : 'нейтральный'}
                      />
                    </div>
                  ) : (
                    <p className="rounded-2 bg-warn-soft px-3 py-2 text-caption text-warn">
                      У проекта нет ни одной задачи. Пока это только намерение.
                    </p>
                  )}

                  <div className="flex flex-wrap gap-1.5">
                    <Badge
                      тон={
                        проект.состояние === 'завершён'
                          ? 'успех'
                          : проект.состояние === 'заморожен'
                            ? 'нейтральный'
                            : 'сведения'
                      }
                    >
                      {проект.состояние}
                    </Badge>
                    {проект.срок ? (
                      <Badge
                        тон={
                          дней !== null && дней < 0
                            ? 'опасность'
                            : дней !== null && дней <= 14
                              ? 'внимание'
                              : 'нейтральный'
                        }
                      >
                        {дней !== null && дней < 0
                          ? `просрочен на ${Math.abs(дней)} ${склонение(Math.abs(дней), 'день', 'дня', 'дней')}`
                          : `до ${деньСловами(проект.срок)}`}
                      </Badge>
                    ) : (
                      <Badge>без срока</Badge>
                    )}
                    {цели.map((цель) => (
                      <Badge key={цель.id} тон="знание">
                        цель: {цель.название}
                      </Badge>
                    ))}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog
        открыто={черновик !== null}
        наЗакрытие={() => установитьЧерновик(null)}
        заголовок={черновик?.id ? 'Изменить проект' : 'Новый проект'}
        ширина="широкая"
        подвал={
          <>
            <Button вид="тихая" onClick={() => установитьЧерновик(null)}>
              Отмена
            </Button>
            <Button
              вид="основная"
              onClick={сохранить}
              disabled={!черновик?.название.trim()}
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
                value={черновик.название}
                onChange={(событие) =>
                  установитьЧерновик({
                    ...черновик,
                    название: событие.target.value,
                  })
                }
                autoFocus
              />
            </Field>
            <Field
              подпись="Какой результат должен получиться"
              подсказка="Проект заканчивается результатом, а не датой"
            >
              <Textarea
                rows={3}
                value={черновик.описание}
                onChange={(событие) =>
                  установитьЧерновик({
                    ...черновик,
                    описание: событие.target.value,
                  })
                }
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field подпись="Состояние">
                <Select
                  value={черновик.состояние}
                  onChange={(событие) =>
                    установитьЧерновик({
                      ...черновик,
                      состояние: событие.target.value as СостояниеПроекта,
                    })
                  }
                >
                  {СОСТОЯНИЯ.map((состояние) => (
                    <option key={состояние.ключ} value={состояние.ключ}>
                      {состояние.подпись}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field подпись="Срок">
                <Input
                  type="date"
                  value={черновик.срок}
                  onChange={(событие) =>
                    установитьЧерновик({ ...черновик, срок: событие.target.value })
                  }
                />
              </Field>
            </div>

            <Field
              подпись="Связать с целями"
              подсказка="Проект без цели — работа ради работы"
            >
              <div className="flex flex-wrap gap-1.5">
                {данные.цели.filter((ц) => ц.состояние === 'активна').length ===
                0 ? (
                  <p className="text-caption text-ink-3">
                    Активных целей нет — сначала создайте цель.
                  </p>
                ) : (
                  данные.цели
                    .filter((ц) => ц.состояние === 'активна')
                    .map((цель) => {
                      const выбрана = черновик.целиId.includes(цель.id)
                      return (
                        <button
                          key={цель.id}
                          type="button"
                          onClick={() =>
                            установитьЧерновик({
                              ...черновик,
                              целиId: выбрана
                                ? черновик.целиId.filter((id) => id !== цель.id)
                                : [...черновик.целиId, цель.id],
                            })
                          }
                          className={
                            выбрана
                              ? 'rounded-full border border-transparent bg-accent-soft px-3 py-1.5 text-caption text-accent'
                              : 'rounded-full border border-line px-3 py-1.5 text-caption text-ink-2 hover:border-line-strong'
                          }
                        >
                          {цель.название}
                        </button>
                      )
                    })
                )}
              </div>
            </Field>
          </div>
        ) : null}
      </Dialog>
    </div>
  )
}
