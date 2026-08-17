import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, Trash2 } from 'lucide-react'
import { база } from '@/core/db/db'
import { новаяЗапись } from '@/core/db/repo'
import type { МатериалОбучения } from '@/core/db/types'
import { склонение } from '@/core/language/Plural'
import { число } from '@/core/language/Numerals'
import { сейчас } from '@/core/db/RecordId'
import { useИнтерфейс } from '@/app/providers/ui'
import { читатьНастройки } from '@/core/db/repo'
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
  Poster,
  ProgressBar,
  Select,
  Skeleton,
  Textarea,
} from '@/design-system/components'

const ВИДЫ: MaterialВид[] = ['курс', 'книга', 'видео', 'практика', 'иное']
type MaterialВид = МатериалОбучения['вид']

const СОСТОЯНИЯ: МатериалОбучения['состояние'][] = [
  'запланировано',
  'изучаю',
  'завершено',
  'брошено',
]

export function LearningPage() {
  const сообщить = useИнтерфейс((с) => с.сообщить)
  const [черновик, установитьЧерновик] = useState<Partial<МатериалОбучения> | null>(
    null,
  )

  const материалы = useLiveQuery(() => база.learning.toArray(), [])
  const настройки = useLiveQuery(() => читатьНастройки(), [])
  const показыватьПостеры = настройки?.показыватьПостеры !== false

  if (!материалы) {
    return (
      <Card>
        <Skeleton строк={4} />
      </Card>
    )
  }

  const изучаю = материалы.filter((м) => м.состояние === 'изучаю')
  const завершено = материалы.filter((м) => м.состояние === 'завершено')
  const часовВсего = материалы.reduce((итог, м) => итог + (м.часов ?? 0), 0)
  const безЧасов = материалы.filter((м) => м.часов === null).length

  async function сохранить() {
    if (!черновик?.название?.trim()) return
    if (черновик.id) {
      const текущий = await база.learning.get(черновик.id)
      if (текущий) {
        await база.learning.put({
          ...текущий,
          ...черновик,
          updatedAt: сейчас(),
        } as МатериалОбучения)
        сообщить('Материал изменён')
      }
    } else {
      await база.learning.add(
        новаяЗапись({
          название: черновик.название.trim(),
          вид: черновик.вид ?? 'иное',
          источник: черновик.источник ?? '',
          состояние: черновик.состояние ?? 'изучаю',
          прогресс: черновик.прогресс ?? 0,
          часов: черновик.часов ?? null,
          цельId: null,
          заметка: черновик.заметка ?? '',
          постер: черновик.постер ?? '',
        }) as never,
      )
      сообщить('Материал добавлен')
    }
    установитьЧерновик(null)
  }

  return (
    <div className="anim-rise space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-h2 font-semibold text-ink">Обучение</h1>
          <p className="mt-0.5 text-meta text-ink-3">
            Часы обучения — измеримая величина, и она должна быть видна
          </p>
        </div>
        <Button
          вид="основная"
          иконка={<Plus size={16} />}
          onClick={() => установитьЧерновик({ состояние: 'изучаю', вид: 'курс' })}
        >
          Материал
        </Button>
      </div>

      {материалы.length > 0 ? (
        <Card>
          <div className="grid grid-cols-2 gap-5 p-5 sm:grid-cols-3">
            <Metric
              единица="шт · материалы"
              подпись="Изучаю сейчас"
              значение={String(изучаю.length)}
              источник={`завершено: ${завершено.length}`}
            />
            <Metric
              единица="ч · всего"
              подпись="Часов учтено"
              счётчик={{ число: часовВсего, запись: (з) => число(Math.round(з)) }}
              источник={
                безЧасов > 0
                  ? `у ${безЧасов} ${склонение(безЧасов, 'материала', 'материалов', 'материалов')} часы не заполнены`
                  : 'по всем материалам'
              }
              шкала={
                безЧасов > 0
                  ? { известно: материалы.length - безЧасов, неизвестно: безЧасов }
                  : undefined
              }
            />
            <Metric
              единица="% · доля"
              подпись="Доведено до конца"
              значение={
                материалы.length > 0
                  ? `${Math.round((завершено.length / материалы.length) * 100)}%`
                  : '—'
              }
              источник={`${завершено.length} из ${материалы.length}`}
            />
          </div>
        </Card>
      ) : null}

      <Card>
        <CardHeader заголовок="Материалы" />
        {материалы.length === 0 ? (
          <EmptyState
            заголовок="Материалов пока нет"
            подпись="Добавьте курс или книгу — у каждого материала есть состояние, доля пройденного и потраченные часы."
          />
        ) : (
          <div className="divide-y divide-line border-t border-line">
            {материалы
              .sort((а, б) => а.состояние.localeCompare(б.состояние))
              .map((материал) => (
                <div
                  key={материал.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => установитьЧерновик(материал)}
                  onKeyDown={(событие) => {
                    if (событие.key === 'Enter' || событие.key === ' ') {
                      событие.preventDefault()
                      установитьЧерновик(материал)
                    }
                  }}
                  className="cursor-pointer px-5 py-3.5 transition-colors hover:bg-hover"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <Poster
                      адрес={материал.постер ?? ''}
                      подпись={материал.название}
                      показывать={показыватьПостеры}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-meta text-ink">{материал.название}</p>
                      <p className="mt-1 flex flex-wrap items-center gap-1.5 text-caption text-ink-3">
                        <Badge
                          тон={
                            материал.состояние === 'завершено'
                              ? 'успех'
                              : материал.состояние === 'брошено'
                                ? 'опасность'
                                : 'нейтральный'
                          }
                        >
                          {материал.состояние}
                        </Badge>
                        <span>{материал.вид}</span>
                        {материал.часов !== null ? (
                          <span>· {число(материал.часов)} ч</span>
                        ) : (
                          <span>· часы не заполнены</span>
                        )}
                        {материал.источник ? (
                          <span>· {материал.источник}</span>
                        ) : null}
                      </p>
                    </div>
                    <IconButton
                      подпись={`Удалить ${материал.название}`}
                      onClick={async (событие) => {
                        событие.stopPropagation()
                        await база.learning.delete(материал.id)
                        сообщить('Материал удалён')
                      }}
                    >
                      <Trash2 size={15} />
                    </IconButton>
                  </div>
                  {материал.прогресс > 0 ? (
                    <div className="mt-2.5">
                      <ProgressBar значение={материал.прогресс} из={100} />
                    </div>
                  ) : null}
                  {материал.заметка ? (
                    <p className="mt-2 line-clamp-3 text-caption leading-relaxed whitespace-pre-wrap text-ink-3">
                      {материал.заметка}
                    </p>
                  ) : null}
                </div>
              ))}
          </div>
        )}
      </Card>

      <Dialog
        открыто={черновик !== null}
        наЗакрытие={() => установитьЧерновик(null)}
        заголовок={черновик?.id ? 'Изменить материал' : 'Новый материал'}
        ширина="широкая"
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
            <div className="grid gap-4 sm:grid-cols-3">
              <Field подпись="Вид">
                <Select
                  value={черновик.вид ?? 'курс'}
                  onChange={(событие) =>
                    установитьЧерновик({
                      ...черновик,
                      вид: событие.target.value as MaterialВид,
                    })
                  }
                >
                  {ВИДЫ.map((вид) => (
                    <option key={вид} value={вид}>
                      {вид}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field подпись="Состояние">
                <Select
                  value={черновик.состояние ?? 'изучаю'}
                  onChange={(событие) =>
                    установитьЧерновик({
                      ...черновик,
                      состояние: событие.target
                        .value as МатериалОбучения['состояние'],
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
              <Field
                подпись="Часов"
                подсказка="Пустое поле — не заполнено, а не ноль"
              >
                <Input
                  type="number"
                  min={0}
                  value={черновик.часов ?? ''}
                  onChange={(событие) =>
                    установитьЧерновик({
                      ...черновик,
                      часов:
                        событие.target.value === ''
                          ? null
                          : Number(событие.target.value),
                    })
                  }
                />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field подпись="Источник">
                <Input
                  value={черновик.источник ?? ''}
                  onChange={(событие) =>
                    установитьЧерновик({
                      ...черновик,
                      источник: событие.target.value,
                    })
                  }
                  placeholder="ссылка, автор или площадка"
                />
              </Field>
              <Field подпись="Прогресс, %">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={черновик.прогресс ?? 0}
                  onChange={(событие) =>
                    установитьЧерновик({
                      ...черновик,
                      прогресс: Number(событие.target.value) || 0,
                    })
                  }
                />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
              <Field
                подпись="Обложка по адресу"
                подсказка="Обложка книги или курса. Грузится с чужого сервера"
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
                показывать={показыватьПостеры}
                className="h-[52px] w-[38px]"
              />
            </div>
            <Field подпись="Выводы и что применить">
              <Textarea
                rows={8}
                value={черновик.заметка ?? ''}
                onChange={(событие) =>
                  установитьЧерновик({ ...черновик, заметка: событие.target.value })
                }
              />
            </Field>
          </div>
        ) : null}
      </Dialog>
    </div>
  )
}
