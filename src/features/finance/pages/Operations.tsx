import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { база } from '@/core/db/db'
import { новаяЗапись } from '@/core/db/repo'
import type { КлассРасхода, Операция, ТипОперации } from '@/core/db/types'
import { деньги, копейкиВРубли, рублиВКопейки } from '@/core/money/Money'
import { деньКратко, сегодня } from '@/core/calendar/CalendarRu'
import { склонение } from '@/core/language/Plural'
import { сейчас } from '@/core/db/RecordId'
import { useИнтерфейс } from '@/app/providers/ui'
import { cn } from '@/design-system/classNames'
import {
  Input,
  MoneyInput,
  Select,
  Skeleton,
  Badge,
  Card,
  Button,
  IconButton,
  Dialog,
  Field,
  EmptyState,
  Segmented,
  Textarea,
  CardHeader,
} from '@/design-system/components'

const ТИПЫ: { ключ: ТипОперации; подпись: string }[] = [
  { ключ: 'расход', подпись: 'Расход' },
  { ключ: 'доход', подпись: 'Доход' },
  { ключ: 'перевод', подпись: 'Перевод' },
  { ключ: 'возврат', подпись: 'Возврат' },
  { ключ: 'корректировка', подпись: 'Корректировка' },
]

const КЛАССЫ: { ключ: КлассРасхода; подпись: string }[] = [
  { ключ: 'обязательный', подпись: 'Обязательный' },
  { ключ: 'нужный', подпись: 'Нужный' },
  { ключ: 'желаемый', подпись: 'Желаемый' },
]

const НА_СТРАНИЦЕ = 30

interface Черновик {
  id: string | null
  дата: string
  тип: ТипОперации
  сумма: string
  счётId: string
  счётПолучательId: string
  категорияId: string
  классРасхода: string
  заметка: string
}

function пустой(): Черновик {
  return {
    id: null,
    дата: сегодня(),
    тип: 'расход',
    сумма: '',
    счётId: '',
    счётПолучательId: '',
    категорияId: '',
    классРасхода: '',
    заметка: '',
  }
}

export function OperationsPage() {
  const сообщить = useИнтерфейс((с) => с.сообщить)
  const [параметры, установитьПараметры] = useSearchParams()
  const [черновик, установитьЧерновик] = useState<Черновик | null>(null)
  const [кУдалению, установитьКУдалению] = useState<Операция | null>(null)
  const [фильтрТипа, установитьФильтрТипа] = useState<'все' | ТипОперации>('все')
  const [толькоНеразобранные, установитьТолькоНеразобранные] = useState(false)
  const [запрос, установитьЗапрос] = useState('')
  const [страница, установитьСтраницу] = useState(1)

  const данные = useLiveQuery(async () => {
    const [операции, счета, категории] = await Promise.all([
      база.operations.orderBy('дата').reverse().toArray(),
      база.accounts.filter((с) => !с.архив).toArray(),
      база.moneyCategories.filter((к) => !к.архив).toArray(),
    ])
    return { операции, счета, категории }
  }, [])

  useEffect(() => {
    if (параметры.get('создать') === '1') {
      установитьЧерновик(пустой())
      параметры.delete('создать')
      установитьПараметры(параметры, { replace: true })
    }
  }, [параметры, установитьПараметры])

  const отобранные = useMemo(() => {
    if (!данные) return []
    const низ = запрос.trim().toLowerCase()
    return данные.операции.filter((операция) => {
      if (фильтрТипа !== 'все' && операция.тип !== фильтрТипа) return false
      if (толькоНеразобранные && операция.разобрана) return false
      if (низ && !операция.заметка.toLowerCase().includes(низ)) return false
      return true
    })
  }, [данные, фильтрТипа, толькоНеразобранные, запрос])

  useEffect(() => {
    установитьСтраницу(1)
  }, [фильтрТипа, толькоНеразобранные, запрос])

  if (!данные) {
    return (
      <Card>
        <Skeleton строк={5} />
      </Card>
    )
  }

  const имяСчёта = new Map(данные.счета.map((с) => [с.id, с.название]))
  const имяКатегории = new Map(данные.категории.map((к) => [к.id, к.название]))
  const неразобрано = данные.операции.filter((о) => !о.разобрана).length
  const страниц = Math.max(1, Math.ceil(отобранные.length / НА_СТРАНИЦЕ))
  const текущаяСтраница = Math.min(страница, страниц)
  const видимые = отобранные.slice(
    (текущаяСтраница - 1) * НА_СТРАНИЦЕ,
    текущаяСтраница * НА_СТРАНИЦЕ,
  )

  const категорииВида = данные.категории.filter((категория) =>
    черновик?.тип === 'доход'
      ? категория.вид === 'доход'
      : категория.вид === 'расход',
  )

  async function сохранить() {
    if (!черновик) return
    const сумма = рублиВКопейки(черновик.сумма)
    if (сумма === null || сумма <= 0) return
    if (черновик.тип === 'перевод' && !черновик.счётПолучательId) return

    const поля = {
      дата: черновик.дата,
      тип: черновик.тип,
      сумма: Math.abs(сумма),
      счётId: черновик.счётId || null,
      счётПолучательId: черновик.счётПолучательId || null,
      категорияId: черновик.тип === 'перевод' ? null : черновик.категорияId || null,
      классРасхода: (черновик.классРасхода || null) as КлассРасхода | null,
      заметка: черновик.заметка.trim(),
      разобрана: черновик.тип === 'перевод' ? true : Boolean(черновик.категорияId),
    }

    if (черновик.id) {
      const текущая = await база.operations.get(черновик.id)
      if (текущая) {
        await база.operations.put({ ...текущая, ...поля, updatedAt: сейчас() })
        сообщить('Операция изменена')
      }
    } else {
      await база.operations.add(
        новаяЗапись({ ...поля, планId: null, отпечатокИмпорта: null }) as never,
      )
      сообщить('Операция записана')
    }
    установитьЧерновик(null)
  }

  async function удалить() {
    if (!кУдалению) return
    await база.operations.delete(кУдалению.id)
    сообщить('Операция удалена')
    установитьКУдалению(null)
  }

  return (
    <div className="anim-rise space-y-5">
      <Card>
        <CardHeader
          заголовок="Операции"
          подпись={`Всего записей: ${данные.операции.length}${
            неразобрано > 0 ? ` · без категории: ${неразобрано}` : ''
          }`}
          действие={
            <Button
              вид="основная"
              размер="малый"
              иконка={<Plus size={15} />}
              onClick={() => установитьЧерновик(пустой())}
            >
              Операция
            </Button>
          }
        />

        <div className="flex flex-wrap items-center gap-2 border-t border-line px-5 py-3">
          <Segmented
            значения={[
              { ключ: 'все' as const, подпись: 'Все' },
              ...ТИПЫ.slice(0, 3),
            ]}
            выбрано={фильтрТипа}
            наВыбор={(ключ) => установитьФильтрТипа(ключ)}
          />
          <button
            type="button"
            onClick={() => установитьТолькоНеразобранные((з) => !з)}
            className={cn(
              'rounded-2 border px-3 py-1.5 text-meta transition-colors',
              толькоНеразобранные
                ? 'border-transparent bg-warn-soft text-warn'
                : 'border-line text-ink-3 hover:text-ink-2',
            )}
          >
            Ждут категории{неразобрано > 0 ? ` · ${неразобрано}` : ''}
          </button>
          <Input
            value={запрос}
            onChange={(событие) => установитьЗапрос(событие.target.value)}
            placeholder="Поиск по комментарию"
            className="h-9 w-full sm:w-64"
          />
        </div>

        {видимые.length === 0 ? (
          <EmptyState
            заголовок={
              данные.операции.length === 0
                ? 'Операций пока нет'
                : 'Ничего не найдено'
            }
            подпись={
              данные.операции.length === 0
                ? 'Запишите первую операцию или загрузите банковскую выписку.'
                : 'Измените условия отбора.'
            }
          />
        ) : (
          <div className="divide-y divide-line border-t border-line">
            {видимые.map((операция) => {
              const знак =
                операция.тип === 'доход' || операция.тип === 'возврат'
                  ? '+'
                  : операция.тип === 'перевод'
                    ? ''
                    : '−'
              return (
                <div
                  key={операция.id}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-hover"
                >
                  <div className="w-[54px] shrink-0 text-caption text-ink-3">
                    {деньКратко(операция.дата)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-meta text-ink">
                      {операция.заметка || 'Без комментария'}
                    </p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-caption text-ink-3">
                      <span>{операция.тип}</span>
                      {операция.категорияId ? (
                        <span>· {имяКатегории.get(операция.категорияId)}</span>
                      ) : операция.тип !== 'перевод' ? (
                        <Badge тон="внимание">без категории</Badge>
                      ) : null}
                      {операция.счётId ? (
                        <span>
                          · {имяСчёта.get(операция.счётId) ?? 'счёт удалён'}
                        </span>
                      ) : null}
                      {операция.тип === 'перевод' && операция.счётПолучательId ? (
                        <span>
                          →{' '}
                          {имяСчёта.get(операция.счётПолучательId) ?? 'счёт удалён'}
                        </span>
                      ) : null}
                    </p>
                  </div>
                  <div
                    className={cn(
                      'tnum shrink-0 text-meta font-semibold',
                      операция.тип === 'доход' || операция.тип === 'возврат'
                        ? 'text-good'
                        : операция.тип === 'перевод'
                          ? 'text-ink-2'
                          : 'text-ink',
                    )}
                  >
                    {знак}
                    {деньги(операция.сумма)}
                  </div>
                  <div className="flex shrink-0 gap-0.5">
                    <IconButton
                      подпись="Изменить операцию"
                      onClick={() =>
                        установитьЧерновик({
                          id: операция.id,
                          дата: операция.дата,
                          тип: операция.тип,
                          сумма: String(копейкиВРубли(операция.сумма) ?? ''),
                          счётId: операция.счётId ?? '',
                          счётПолучательId: операция.счётПолучательId ?? '',
                          категорияId: операция.категорияId ?? '',
                          классРасхода: операция.классРасхода ?? '',
                          заметка: операция.заметка,
                        })
                      }
                    >
                      <Pencil size={15} />
                    </IconButton>
                    <IconButton
                      подпись="Удалить операцию"
                      onClick={() => установитьКУдалению(операция)}
                    >
                      <Trash2 size={15} />
                    </IconButton>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {страниц > 1 ? (
          <div className="flex items-center justify-between border-t border-line px-5 py-3">
            <span className="text-caption text-ink-3">
              {отобранные.length}{' '}
              {склонение(отобранные.length, 'операция', 'операции', 'операций')} ·
              страница {текущаяСтраница} из {страниц}
            </span>
            <div className="flex gap-2">
              <Button
                размер="малый"
                disabled={текущаяСтраница === 1}
                onClick={() => установитьСтраницу(текущаяСтраница - 1)}
              >
                Назад
              </Button>
              <Button
                размер="малый"
                disabled={текущаяСтраница === страниц}
                onClick={() => установитьСтраницу(текущаяСтраница + 1)}
              >
                Вперёд
              </Button>
            </div>
          </div>
        ) : null}
      </Card>

      <Dialog
        открыто={черновик !== null}
        наЗакрытие={() => установитьЧерновик(null)}
        заголовок={черновик?.id ? 'Изменить операцию' : 'Новая операция'}
        подпись="Перевод между своими счетами не является ни доходом, ни расходом"
        подвал={
          <>
            <Button вид="тихая" onClick={() => установитьЧерновик(null)}>
              Отмена
            </Button>
            <Button
              вид="основная"
              onClick={сохранить}
              disabled={
                !черновик ||
                (рублиВКопейки(черновик.сумма) ?? 0) <= 0 ||
                (черновик.тип === 'перевод' && !черновик.счётПолучательId)
              }
            >
              Сохранить
            </Button>
          </>
        }
      >
        {черновик ? (
          <div className="space-y-4">
            <div className="-mx-1 overflow-x-auto px-1 pb-1">
              <Segmented
                значения={ТИПЫ}
                выбрано={черновик.тип}
                наВыбор={(ключ) =>
                  установитьЧерновик({ ...черновик, тип: ключ, категорияId: '' })
                }
              />
            </div>

            <Field подпись="Сумма" обязательное>
              <MoneyInput
                value={черновик.сумма}
                onChange={(значение) =>
                  установитьЧерновик({ ...черновик, сумма: значение })
                }
                autoFocus
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field подпись="Дата">
                <Input
                  type="date"
                  value={черновик.дата}
                  onChange={(событие) =>
                    установитьЧерновик({ ...черновик, дата: событие.target.value })
                  }
                />
              </Field>

              <Field подпись={черновик.тип === 'перевод' ? 'Откуда' : 'Счёт'}>
                <Select
                  value={черновик.счётId}
                  onChange={(событие) =>
                    установитьЧерновик({
                      ...черновик,
                      счётId: событие.target.value,
                    })
                  }
                >
                  <option value="">Не выбран</option>
                  {данные.счета.map((счёт) => (
                    <option key={счёт.id} value={счёт.id}>
                      {счёт.название}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            {черновик.тип === 'перевод' ? (
              <Field подпись="Куда" обязательное>
                <Select
                  value={черновик.счётПолучательId}
                  onChange={(событие) =>
                    установитьЧерновик({
                      ...черновик,
                      счётПолучательId: событие.target.value,
                    })
                  }
                >
                  <option value="">Не выбран</option>
                  {данные.счета
                    .filter((счёт) => счёт.id !== черновик.счётId)
                    .map((счёт) => (
                      <option key={счёт.id} value={счёт.id}>
                        {счёт.название}
                      </option>
                    ))}
                </Select>
              </Field>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  подпись="Категория"
                  подсказка="Без категории операция останется в очереди разбора"
                >
                  <Select
                    value={черновик.категорияId}
                    onChange={(событие) =>
                      установитьЧерновик({
                        ...черновик,
                        категорияId: событие.target.value,
                      })
                    }
                  >
                    <option value="">Не выбрана</option>
                    {категорииВида.map((категория) => (
                      <option key={категория.id} value={категория.id}>
                        {категория.название}
                      </option>
                    ))}
                  </Select>
                </Field>

                {черновик.тип === 'расход' ? (
                  <Field подпись="Класс расхода">
                    <Select
                      value={черновик.классРасхода}
                      onChange={(событие) =>
                        установитьЧерновик({
                          ...черновик,
                          классРасхода: событие.target.value,
                        })
                      }
                    >
                      <option value="">Не указан</option>
                      {КЛАССЫ.map((класс) => (
                        <option key={класс.ключ} value={класс.ключ}>
                          {класс.подпись}
                        </option>
                      ))}
                    </Select>
                  </Field>
                ) : null}
              </div>
            )}

            <Field подпись="Комментарий">
              <Textarea
                rows={2}
                value={черновик.заметка}
                onChange={(событие) =>
                  установитьЧерновик({ ...черновик, заметка: событие.target.value })
                }
              />
            </Field>
          </div>
        ) : null}
      </Dialog>

      <Dialog
        открыто={кУдалению !== null}
        наЗакрытие={() => установитьКУдалению(null)}
        заголовок="Удалить операцию?"
        ширина="узкая"
        подвал={
          <>
            <Button вид="тихая" onClick={() => установитьКУдалению(null)}>
              Отмена
            </Button>
            <Button вид="опасная" onClick={удалить}>
              Удалить
            </Button>
          </>
        }
      >
        <p className="text-meta text-ink-2">
          Операция на сумму {деньги(кУдалению?.сумма ?? null)} будет удалена.
          Расчётные остатки счетов пересчитаются. Отменить нельзя.
        </p>
      </Dialog>
    </div>
  )
}
