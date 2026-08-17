import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, Trash2 } from 'lucide-react'
import { база } from '@/core/db/db'
import { новаяЗапись } from '@/core/db/repo'
import type { Сделка } from '@/core/db/types'
import { деньКратко } from '@/core/calendar/CalendarRu'
import { склонение } from '@/core/language/Plural'
import { деньги, рублиВКопейки, копейкиВРубли, процент } from '@/core/money/Money'
import { сейчас } from '@/core/db/RecordId'
import { useИнтерфейс } from '@/app/providers/ui'
import { cn } from '@/design-system/classNames'
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
  MoneyInput,
  Segmented,
  Select,
  Skeleton,
  Textarea,
} from '@/design-system/components'

type Отбор = 'все' | 'учебный' | 'реальный'

interface Черновик {
  id: string | null
  счётТипа: Сделка['счётТипа']
  инструмент: string
  направление: Сделка['направление']
  дата: string
  входЦена: string
  стопЦена: string
  цельЦена: string
  результат: string
  планСоблюдён: '' | 'да' | 'нет'
  причинаВхода: string
  вывод: string
}

function пустой(): Черновик {
  return {
    id: null,
    счётТипа: 'учебный',
    инструмент: '',
    направление: 'покупка',
    дата: сейчас().slice(0, 10),
    входЦена: '',
    стопЦена: '',
    цельЦена: '',
    результат: '',
    планСоблюдён: '',
    причинаВхода: '',
    вывод: '',
  }
}

export function TradingPage() {
  const сообщить = useИнтерфейс((с) => с.сообщить)
  const [отбор, установитьОтбор] = useState<Отбор>('все')
  const [черновик, установитьЧерновик] = useState<Черновик | null>(null)

  const сделки = useLiveQuery(() => база.trades.toArray(), [])

  const отобранные = useMemo(() => {
    if (!сделки) return []
    return сделки
      .filter((сделка) => отбор === 'все' || сделка.счётТипа === отбор)
      .sort((а, б) => б.открыта.localeCompare(а.открыта))
  }, [сделки, отбор])

  if (!сделки) {
    return (
      <Card>
        <Skeleton строк={4} />
      </Card>
    )
  }

  // Дисциплина считается только по сделкам, где отметка проставлена.
  const сОтметкой = отобранные.filter((с) => с.планСоблюдён !== null)
  const поПлану = сОтметкой.filter((с) => с.планСоблюдён === true).length
  const дисциплина = процент(поПлану, сОтметкой.length)
  const безОтметки = отобранные.length - сОтметкой.length

  const сРезультатом = отобранные.filter((с) => с.результат !== null)
  const итогРезультата = сРезультатом.reduce((и, с) => и + (с.результат ?? 0), 0)
  const прибыльных = сРезультатом.filter((с) => (с.результат ?? 0) > 0).length

  async function сохранить() {
    if (!черновик?.инструмент.trim()) return
    const поля = {
      счётТипа: черновик.счётТипа,
      инструмент: черновик.инструмент.trim(),
      направление: черновик.направление,
      открыта: `${черновик.дата}T00:00:00.000Z`,
      закрыта: null,
      входЦена: Number(черновик.входЦена) || null,
      стопЦена: Number(черновик.стопЦена) || null,
      цельЦена: Number(черновик.цельЦена) || null,
      выходЦена: null,
      объём: null,
      результат: рублиВКопейки(черновик.результат),
      планСоблюдён:
        черновик.планСоблюдён === '' ? null : черновик.планСоблюдён === 'да',
      причинаВхода: черновик.причинаВхода.trim(),
      вывод: черновик.вывод.trim(),
      снимокЭкрана: null,
    }

    if (черновик.id) {
      const текущая = await база.trades.get(черновик.id)
      if (текущая) {
        await база.trades.put({ ...текущая, ...поля, updatedAt: сейчас() })
        сообщить('Сделка изменена')
      }
    } else {
      await база.trades.add(новаяЗапись(поля) as never)
      сообщить('Сделка записана')
    }
    установитьЧерновик(null)
  }

  return (
    <div className="anim-rise space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-h2 font-semibold text-ink">Торговля</h1>
          <p className="mt-0.5 text-meta text-ink-3">
            Журнал нужен не для прибыли, а для проверки дисциплины
          </p>
        </div>
        <Button
          вид="основная"
          иконка={<Plus size={16} />}
          onClick={() => установитьЧерновик(пустой())}
        >
          Сделка
        </Button>
      </div>

      <Segmented
        значения={[
          { ключ: 'все' as const, подпись: `Все · ${сделки.length}` },
          {
            ключ: 'учебный' as const,
            подпись: `Учебные · ${сделки.filter((с) => с.счётТипа === 'учебный').length}`,
          },
          {
            ключ: 'реальный' as const,
            подпись: `Реальные · ${сделки.filter((с) => с.счётТипа === 'реальный').length}`,
          },
        ]}
        выбрано={отбор}
        наВыбор={установитьОтбор}
      />

      {отобранные.length > 0 ? (
        <Card>
          <div className="grid grid-cols-2 gap-5 p-5 lg:grid-cols-4">
            <Metric
              единица="% · дисциплина"
              подпись="План соблюдён"
              значение={дисциплина === null ? '—' : `${дисциплина}%`}
              источник={
                сОтметкой.length === 0
                  ? 'отметок нет — считать не из чего'
                  : `${поПлану} из ${сОтметкой.length} с отметкой`
              }
              тон={
                дисциплина === null
                  ? 'нейтральный'
                  : дисциплина >= 80
                    ? 'успех'
                    : дисциплина >= 50
                      ? 'внимание'
                      : 'опасность'
              }
              шкала={
                безОтметки > 0
                  ? { известно: сОтметкой.length, неизвестно: безОтметки }
                  : undefined
              }
            />
            <Metric
              единица="шт · сделки"
              подпись="Всего в отборе"
              значение={String(отобранные.length)}
              источник={`с результатом: ${сРезультатом.length}`}
            />
            <Metric
              единица="₽ · итог"
              подпись="Результат"
              счётчик={{
                число: итогРезультата,
                запись: (з) => деньги(з, { знак: true }),
              }}
              источник={
                сРезультатом.length === 0
                  ? 'результат не заполнен ни у одной'
                  : `по ${сРезультатом.length} ${склонение(сРезультатом.length, 'сделке', 'сделкам', 'сделкам')}`
              }
              тон={
                итогРезультата < 0
                  ? 'опасность'
                  : итогРезультата > 0
                    ? 'успех'
                    : 'нейтральный'
              }
            />
            <Metric
              единица="% · прибыльных"
              подпись="Закрыто в плюс"
              значение={
                сРезультатом.length === 0
                  ? '—'
                  : `${процент(прибыльных, сРезультатом.length) ?? 0}%`
              }
              источник={`${прибыльных} из ${сРезультатом.length}`}
            />
          </div>

          {безОтметки > 0 ? (
            <div className="border-t border-line px-5 py-3">
              <p className="text-caption text-ink-3">
                У {безОтметки} {склонение(безОтметки, 'сделки', 'сделок', 'сделок')}{' '}
                не отмечено, соблюдён ли план. Они не входят в процент дисциплины:
                считать неотмеченное соблюдением было бы обманом себя.
              </p>
            </div>
          ) : null}
        </Card>
      ) : null}

      <Card>
        <CardHeader заголовок="Журнал" />
        {отобранные.length === 0 ? (
          <EmptyState
            заголовок="Сделок нет"
            подпись="Записывайте вход, стоп, цель, результат и главное — соблюдён ли план."
          />
        ) : (
          <div className="divide-y divide-line border-t border-line">
            {отобранные.map((сделка) => (
              <div key={сделка.id} className="px-5 py-3.5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-meta font-medium text-ink">
                        {сделка.инструмент}
                      </span>
                      <Badge
                        тон={
                          сделка.счётТипа === 'реальный'
                            ? 'внимание'
                            : 'нейтральный'
                        }
                      >
                        {сделка.счётТипа}
                      </Badge>
                      <Badge
                        тон={
                          сделка.направление === 'покупка' ? 'успех' : 'опасность'
                        }
                      >
                        {сделка.направление}
                      </Badge>
                      {сделка.планСоблюдён === null ? (
                        <Badge>план не отмечен</Badge>
                      ) : сделка.планСоблюдён ? (
                        <Badge тон="успех">по плану</Badge>
                      ) : (
                        <Badge тон="опасность">план нарушен</Badge>
                      )}
                    </div>
                    <p className="tnum mt-1 text-caption text-ink-3">
                      {деньКратко(сделка.открыта.slice(0, 10))}
                      {сделка.входЦена !== null ? ` · вход ${сделка.входЦена}` : ''}
                      {сделка.стопЦена !== null ? ` · стоп ${сделка.стопЦена}` : ''}
                      {сделка.цельЦена !== null ? ` · цель ${сделка.цельЦена}` : ''}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'tnum text-meta font-semibold',
                        (сделка.результат ?? 0) > 0
                          ? 'text-good'
                          : (сделка.результат ?? 0) < 0
                            ? 'text-bad'
                            : 'text-ink-3',
                      )}
                    >
                      {сделка.результат === null
                        ? '—'
                        : деньги(сделка.результат, { знак: true })}
                    </span>
                    <IconButton
                      подпись="Изменить сделку"
                      onClick={() =>
                        установитьЧерновик({
                          id: сделка.id,
                          счётТипа: сделка.счётТипа,
                          инструмент: сделка.инструмент,
                          направление: сделка.направление,
                          дата: сделка.открыта.slice(0, 10),
                          входЦена: String(сделка.входЦена ?? ''),
                          стопЦена: String(сделка.стопЦена ?? ''),
                          цельЦена: String(сделка.цельЦена ?? ''),
                          результат:
                            сделка.результат === null
                              ? ''
                              : String(копейкиВРубли(сделка.результат)),
                          планСоблюдён:
                            сделка.планСоблюдён === null
                              ? ''
                              : сделка.планСоблюдён
                                ? 'да'
                                : 'нет',
                          причинаВхода: сделка.причинаВхода,
                          вывод: сделка.вывод,
                        })
                      }
                    >
                      <span className="text-meta">✎</span>
                    </IconButton>
                    <IconButton
                      подпись="Удалить сделку"
                      onClick={async () => {
                        await база.trades.delete(сделка.id)
                        сообщить('Сделка удалена')
                      }}
                    >
                      <Trash2 size={15} />
                    </IconButton>
                  </div>
                </div>

                {сделка.причинаВхода || сделка.вывод ? (
                  <div className="mt-2 space-y-1">
                    {сделка.причинаВхода ? (
                      <p className="text-caption whitespace-pre-wrap text-ink-2">
                        {сделка.причинаВхода}
                      </p>
                    ) : null}
                    {сделка.вывод ? (
                      <p className="text-caption whitespace-pre-wrap text-ink-3">
                        Вывод: {сделка.вывод}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Dialog
        открыто={черновик !== null}
        наЗакрытие={() => установитьЧерновик(null)}
        заголовок={черновик?.id ? 'Изменить сделку' : 'Новая сделка'}
        ширина="широкая"
        подвал={
          <>
            <Button вид="тихая" onClick={() => установитьЧерновик(null)}>
              Отмена
            </Button>
            <Button
              вид="основная"
              onClick={сохранить}
              disabled={!черновик?.инструмент.trim()}
            >
              Сохранить
            </Button>
          </>
        }
      >
        {черновик ? (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field подпись="Инструмент" обязательное>
                <Input
                  value={черновик.инструмент}
                  onChange={(событие) =>
                    установитьЧерновик({
                      ...черновик,
                      инструмент: событие.target.value,
                    })
                  }
                  placeholder="например EURUSD"
                  autoFocus
                />
              </Field>
              <Field подпись="Счёт">
                <Select
                  value={черновик.счётТипа}
                  onChange={(событие) =>
                    установитьЧерновик({
                      ...черновик,
                      счётТипа: событие.target.value as Сделка['счётТипа'],
                    })
                  }
                >
                  <option value="учебный">Учебный</option>
                  <option value="реальный">Реальный</option>
                </Select>
              </Field>
              <Field подпись="Направление">
                <Select
                  value={черновик.направление}
                  onChange={(событие) =>
                    установитьЧерновик({
                      ...черновик,
                      направление: событие.target.value as Сделка['направление'],
                    })
                  }
                >
                  <option value="покупка">Покупка</option>
                  <option value="продажа">Продажа</option>
                </Select>
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-4">
              <Field подпись="Дата">
                <Input
                  type="date"
                  value={черновик.дата}
                  onChange={(событие) =>
                    установитьЧерновик({ ...черновик, дата: событие.target.value })
                  }
                />
              </Field>
              <Field подпись="Вход">
                <Input
                  value={черновик.входЦена}
                  onChange={(событие) =>
                    установитьЧерновик({
                      ...черновик,
                      входЦена: событие.target.value,
                    })
                  }
                />
              </Field>
              <Field подпись="Стоп">
                <Input
                  value={черновик.стопЦена}
                  onChange={(событие) =>
                    установитьЧерновик({
                      ...черновик,
                      стопЦена: событие.target.value,
                    })
                  }
                />
              </Field>
              <Field подпись="Цель">
                <Input
                  value={черновик.цельЦена}
                  onChange={(событие) =>
                    установитьЧерновик({
                      ...черновик,
                      цельЦена: событие.target.value,
                    })
                  }
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                подпись="Результат"
                подсказка="Пустое поле — сделка ещё не закрыта"
              >
                <MoneyInput
                  value={черновик.результат}
                  onChange={(значение) =>
                    установитьЧерновик({ ...черновик, результат: значение })
                  }
                />
              </Field>
              <Field
                подпись="План соблюдён"
                подсказка="Из этих отметок считается процент дисциплины"
              >
                <Select
                  value={черновик.планСоблюдён}
                  onChange={(событие) =>
                    установитьЧерновик({
                      ...черновик,
                      планСоблюдён: событие.target
                        .value as Черновик['планСоблюдён'],
                    })
                  }
                >
                  <option value="">Не отмечено</option>
                  <option value="да">Да</option>
                  <option value="нет">Нет</option>
                </Select>
              </Field>
            </div>

            <Field подпись="Почему вошёл">
              <Textarea
                rows={3}
                value={черновик.причинаВхода}
                onChange={(событие) =>
                  установитьЧерновик({
                    ...черновик,
                    причинаВхода: событие.target.value,
                  })
                }
              />
            </Field>
            <Field подпись="Вывод">
              <Textarea
                rows={3}
                value={черновик.вывод}
                onChange={(событие) =>
                  установитьЧерновик({ ...черновик, вывод: событие.target.value })
                }
              />
            </Field>
          </div>
        ) : null}
      </Dialog>
    </div>
  )
}
