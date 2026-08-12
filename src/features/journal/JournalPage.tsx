import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Lock, Plus, Trash2 } from 'lucide-react'
import { база } from '@/core/db/db'
import { SelfTalkCard } from './SelfTalkCard'
import { новаяЗапись, читатьНастройки } from '@/core/db/repo'
import type { ВидЗаписиДневника, ЗаписьДневника } from '@/core/db/types'
import { деньСловами, сегодня } from '@/core/calendar/CalendarRu'
import { склонение } from '@/core/language/Plural'
import { сейчас } from '@/core/db/RecordId'
import { useИнтерфейс } from '@/app/providers/ui'
import {
  Input,
  Select,
  Skeleton,
  Badge,
  Card,
  Button,
  IconButton,
  Dialog,
  Switch,
  Field,
  EmptyState,
  Segmented,
  Textarea,
} from '@/design-system/components'

const ВИДЫ: { ключ: ВидЗаписиДневника; подпись: string }[] = [
  { ключ: 'день', подпись: 'День' },
  { ключ: 'размышление', подпись: 'Размышление' },
  { ключ: 'подсознание', подпись: 'Подсознание' },
  { ключ: 'решение', подпись: 'Решение' },
  { ключ: 'идея', подпись: 'Идея' },
]

export function JournalPage() {
  const сообщить = useИнтерфейс((с) => с.сообщить)
  const [отбор, установитьОтбор] = useState<'все' | ВидЗаписиДневника>('все')
  const [черновик, установитьЧерновик] = useState<Partial<ЗаписьДневника> | null>(
    null,
  )

  const записи = useLiveQuery(
    () => база.journal.orderBy('дата').reverse().toArray(),
    [],
  )
  const настройки = useLiveQuery(() => читатьНастройки(), [])

  const отобранные = useMemo(() => {
    if (!записи) return []
    return отбор === 'все' ? записи : записи.filter((з) => з.вид === отбор)
  }, [записи, отбор])

  if (!записи) {
    return (
      <Card>
        <Skeleton строк={4} />
      </Card>
    )
  }

  async function сохранить() {
    if (!черновик?.текст?.trim()) return
    if (черновик.id) {
      const текущая = await база.journal.get(черновик.id)
      if (текущая) {
        await база.journal.put({
          ...текущая,
          ...черновик,
          updatedAt: сейчас(),
        } as ЗаписьДневника)
        сообщить('Запись изменена')
      }
    } else {
      await база.journal.add(
        новаяЗапись({
          дата: черновик.дата ?? сегодня(),
          вид: черновик.вид ?? 'день',
          заголовок: черновик.заголовок ?? '',
          текст: черновик.текст.trim(),
          настроение: черновик.настроение ?? null,
          сон: черновик.сон ?? null,
          личное: черновик.личное ?? true,
          утверждение: '',
          чтоЧувствую: '',
          чтоДумаю: '',
          согласие: null,
        }) as never,
      )
      сообщить('Запись сохранена')
    }
    установитьЧерновик(null)
  }

  return (
    <div className="anim-rise space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[20px] font-semibold text-ink">Дневник</h1>
          <p className="mt-0.5 text-[13px] text-ink-3">
            Обычные записи и дневник подсознания — в одной системе, разделены видом
          </p>
        </div>
        <Button
          вид="основная"
          иконка={<Plus size={16} />}
          onClick={() =>
            установитьЧерновик({ дата: сегодня(), вид: 'день', личное: true })
          }
        >
          Запись
        </Button>
      </div>

      <SelfTalkCard
        key={
          записи.find((з) => з.дата === сегодня() && з.вид === 'подсознание')?.id ??
          'новая'
        }
        записи={записи}
        своиУтверждения={настройки?.своиУтверждения ?? []}
      />

      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <Segmented
          значения={[{ ключ: 'все' as const, подпись: 'Все' }, ...ВИДЫ]}
          выбрано={отбор}
          наВыбор={установитьОтбор}
        />
      </div>

      <Card className="border-know/25">
        <div className="flex items-center gap-2.5 px-5 py-3">
          <Lock size={15} className="shrink-0 text-know" />
          <p className="text-[12.5px] text-ink-2">
            Записи дневника помечены как личные и не входят в облачную копию по
            умолчанию. Они хранятся только на этом устройстве.
          </p>
        </div>
      </Card>

      {отобранные.length === 0 ? (
        <Card>
          <EmptyState
            заголовок="Записей нет"
            подпись={`${записи.length} ${склонение(записи.length, 'запись', 'записи', 'записей')} в дневнике всего. Измените отбор или добавьте новую.`}
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {отобранные.map((запись) => (
            <Card key={запись.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[12px] text-ink-3">
                      {деньСловами(запись.дата)}
                    </span>
                    <Badge
                      тон={запись.вид === 'подсознание' ? 'знание' : 'нейтральный'}
                    >
                      {запись.вид}
                    </Badge>
                    {запись.настроение !== null ? (
                      <Badge>настроение: {запись.настроение}</Badge>
                    ) : null}
                  </div>
                  {запись.заголовок ? (
                    <h2 className="mt-1.5 text-[15px] font-semibold text-ink">
                      {запись.заголовок}
                    </h2>
                  ) : null}
                  <p className="mt-1.5 text-[13.5px] leading-relaxed whitespace-pre-wrap text-ink-2">
                    {запись.текст}
                  </p>
                </div>
                <div className="flex shrink-0 gap-0.5">
                  <IconButton
                    подпись="Изменить запись"
                    onClick={() => установитьЧерновик(запись)}
                  >
                    <span className="text-[13px]">✎</span>
                  </IconButton>
                  <IconButton
                    подпись="Удалить запись"
                    onClick={async () => {
                      await база.journal.delete(запись.id)
                      сообщить('Запись удалена')
                    }}
                  >
                    <Trash2 size={15} />
                  </IconButton>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        открыто={черновик !== null}
        наЗакрытие={() => установитьЧерновик(null)}
        заголовок={черновик?.id ? 'Изменить запись' : 'Новая запись'}
        подвал={
          <>
            <Button вид="тихая" onClick={() => установитьЧерновик(null)}>
              Отмена
            </Button>
            <Button
              вид="основная"
              onClick={сохранить}
              disabled={!черновик?.текст?.trim()}
            >
              Сохранить
            </Button>
          </>
        }
      >
        {черновик ? (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field подпись="Дата">
                <Input
                  type="date"
                  value={черновик.дата ?? сегодня()}
                  onChange={(событие) =>
                    установитьЧерновик({ ...черновик, дата: событие.target.value })
                  }
                />
              </Field>
              <Field подпись="Вид записи">
                <Select
                  value={черновик.вид ?? 'день'}
                  onChange={(событие) =>
                    установитьЧерновик({
                      ...черновик,
                      вид: событие.target.value as ВидЗаписиДневника,
                    })
                  }
                >
                  {ВИДЫ.map((вид) => (
                    <option key={вид.ключ} value={вид.ключ}>
                      {вид.подпись}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <Field подпись="Заголовок">
              <Input
                value={черновик.заголовок ?? ''}
                onChange={(событие) =>
                  установитьЧерновик({
                    ...черновик,
                    заголовок: событие.target.value,
                  })
                }
                placeholder="Необязательно"
              />
            </Field>

            <Field подпись="Текст" обязательное>
              <Textarea
                rows={8}
                value={черновик.текст ?? ''}
                onChange={(событие) =>
                  установитьЧерновик({ ...черновик, текст: событие.target.value })
                }
                autoFocus
              />
            </Field>

            <Field
              подпись="Настроение от 1 до 10"
              подсказка="Оставьте пустым, если не хотите оценивать — пустое не станет нулём"
            >
              <Input
                type="number"
                min={1}
                max={10}
                value={черновик.настроение ?? ''}
                onChange={(событие) =>
                  установитьЧерновик({
                    ...черновик,
                    настроение:
                      событие.target.value === ''
                        ? null
                        : Number(событие.target.value),
                  })
                }
              />
            </Field>

            <Switch
              включён={черновик.личное ?? true}
              наИзменение={(значение) =>
                установитьЧерновик({ ...черновик, личное: значение })
              }
              подпись="Личная запись"
              описание="Не включается в облачную копию"
            />
          </div>
        ) : null}
      </Dialog>
    </div>
  )
}
