import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Pencil, Plus } from 'lucide-react'
import { база } from '@/core/db/db'
import { новаяЗапись } from '@/core/db/repo'
import type { КатегорияДенег, КлассРасхода } from '@/core/db/types'
import { деньги, копейкиВРубли, рублиВКопейки } from '@/core/money/Money'
import { границыМесяца, текущийМесяц } from '@/core/calendar/CalendarRu'
import { расходыПоКатегориям } from '@/features/finance/model/calc'
import { сейчас } from '@/core/db/RecordId'
import { использоватьИнтерфейс } from '@/app/providers/ui'
import {
  Input,
  MoneyInput,
  Select,
  Skeleton,
  Card,
  Button,
  IconButton,
  Dialog,
  Switch,
  Field,
  ProgressBar,
  CardHeader,
} from '@/design-system/components'

interface Черновик {
  id: string | null
  название: string
  вид: 'доход' | 'расход'
  лимит: string
  класс: string
  правила: string
  архив: boolean
}

export function CategoriesPage() {
  const сообщить = использоватьИнтерфейс((с) => с.сообщить)
  const [черновик, установитьЧерновик] = useState<Черновик | null>(null)
  const месяц = текущийМесяц()

  const данные = useLiveQuery(async () => {
    const [категории, операции] = await Promise.all([
      база.moneyCategories.orderBy('порядок').toArray(),
      база.operations.toArray(),
    ])
    return { категории, операции }
  }, [])

  if (!данные) {
    return (
      <Card>
        <Skeleton строк={4} />
      </Card>
    )
  }

  const границы = границыМесяца(месяц)
  const потрачено = расходыПоКатегориям(данные.операции, границы.от, границы.до)

  const расходы = данные.категории.filter((к) => к.вид === 'расход' && !к.архив)
  const доходы = данные.категории.filter((к) => к.вид === 'доход' && !к.архив)
  const вАрхиве = данные.категории.filter((к) => к.архив)

  async function сохранить() {
    if (!черновик || !черновик.название.trim()) return
    const поля = {
      название: черновик.название.trim(),
      вид: черновик.вид,
      месячныйЛимит: рублиВКопейки(черновик.лимит),
      классПоУмолчанию: (черновик.класс || null) as КлассРасхода | null,
      правила: черновик.правила
        .split(',')
        .map((правило) => правило.trim().toLowerCase())
        .filter(Boolean),
      архив: черновик.архив,
    }

    if (черновик.id) {
      const текущая = await база.moneyCategories.get(черновик.id)
      if (текущая) {
        await база.moneyCategories.put({
          ...текущая,
          ...поля,
          updatedAt: сейчас(),
        })
        сообщить('Категория обновлена')
      }
    } else {
      await база.moneyCategories.add(
        новаяЗапись({
          ...поля,
          иконка: '',
          цвет: черновик.вид === 'доход' ? 'good' : 'ink-2',
          порядок: данные?.категории.length ?? 0,
        }) as never,
      )
      сообщить('Категория добавлена')
    }
    установитьЧерновик(null)
  }

  function открыть(категория?: КатегорияДенег) {
    установитьЧерновик({
      id: категория?.id ?? null,
      название: категория?.название ?? '',
      вид: категория?.вид ?? 'расход',
      лимит:
        категория?.месячныйЛимит != null
          ? String(копейкиВРубли(категория.месячныйЛимит))
          : '',
      класс: категория?.классПоУмолчанию ?? '',
      правила: (категория?.правила ?? []).join(', '),
      архив: категория?.архив ?? false,
    })
  }

  return (
    <div className="anim-rise space-y-5">
      <Card>
        <CardHeader
          заголовок="Категории расходов"
          подпись="Лимит сравнивается с фактом за текущий месяц"
          действие={
            <Button
              вид="основная"
              размер="малый"
              иконка={<Plus size={15} />}
              onClick={() => открыть()}
            >
              Категория
            </Button>
          }
        />
        <div className="divide-y divide-line border-t border-line">
          {расходы.map((категория) => {
            const факт = потрачено.get(категория.id) ?? 0
            return (
              <div key={категория.id} className="px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] text-ink">
                      {категория.название}
                    </p>
                    <p className="mt-0.5 text-[11.5px] text-ink-3">
                      {категория.классПоУмолчанию ?? 'класс не задан'}
                      {категория.правила.length > 0
                        ? ` · правил импорта: ${категория.правила.length}`
                        : ''}
                    </p>
                  </div>
                  <div className="tnum shrink-0 text-right text-[13.5px] text-ink">
                    {деньги(факт)}
                    <span className="block text-[11px] text-ink-3">
                      {категория.месячныйЛимит === null
                        ? 'лимит не задан'
                        : `из ${деньги(категория.месячныйЛимит)}`}
                    </span>
                  </div>
                  <IconButton
                    подпись={`Изменить категорию ${категория.название}`}
                    onClick={() => открыть(категория)}
                  >
                    <Pencil size={15} />
                  </IconButton>
                </div>
                {категория.месячныйЛимит !== null && категория.месячныйЛимит > 0 ? (
                  <div className="mt-2.5">
                    <ProgressBar
                      значение={факт}
                      из={категория.месячныйЛимит}
                      тон={факт > категория.месячныйЛимит ? 'опасность' : 'успех'}
                    />
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      </Card>

      <Card>
        <CardHeader заголовок="Категории доходов" />
        <div className="flex flex-wrap gap-2 px-5 pb-5">
          {доходы.map((категория) => (
            <button
              key={категория.id}
              type="button"
              onClick={() => открыть(категория)}
              className="rounded-full border border-line px-3 py-1.5 text-[13px] text-ink-2 transition-colors hover:border-line-strong hover:text-ink"
            >
              {категория.название}
            </button>
          ))}
        </div>
      </Card>

      {вАрхиве.length > 0 ? (
        <Card>
          <CardHeader
            заголовок="В архиве"
            подпись="Категории не удаляются — они скрываются, чтобы не потерять историю"
          />
          <div className="flex flex-wrap gap-2 px-5 pb-5">
            {вАрхиве.map((категория) => (
              <button
                key={категория.id}
                type="button"
                onClick={() => открыть(категория)}
                className="rounded-full border border-line px-3 py-1.5 text-[12px] text-ink-3"
              >
                {категория.название}
              </button>
            ))}
          </div>
        </Card>
      ) : null}

      <Dialog
        открыто={черновик !== null}
        наЗакрытие={() => установитьЧерновик(null)}
        заголовок={черновик?.id ? 'Изменить категорию' : 'Новая категория'}
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

            <div className="grid gap-4 sm:grid-cols-2">
              <Field подпись="Вид">
                <Select
                  value={черновик.вид}
                  onChange={(событие) =>
                    установитьЧерновик({
                      ...черновик,
                      вид: событие.target.value as 'доход' | 'расход',
                    })
                  }
                >
                  <option value="расход">Расход</option>
                  <option value="доход">Доход</option>
                </Select>
              </Field>

              {черновик.вид === 'расход' ? (
                <Field подпись="Класс по умолчанию">
                  <Select
                    value={черновик.класс}
                    onChange={(событие) =>
                      установитьЧерновик({
                        ...черновик,
                        класс: событие.target.value,
                      })
                    }
                  >
                    <option value="">Не задан</option>
                    <option value="обязательный">Обязательный</option>
                    <option value="нужный">Нужный</option>
                    <option value="желаемый">Желаемый</option>
                  </Select>
                </Field>
              ) : null}
            </div>

            {черновик.вид === 'расход' ? (
              <Field
                подпись="Месячный лимит"
                подсказка="Пустое поле означает, что лимита нет, а не что он нулевой"
              >
                <MoneyInput
                  value={черновик.лимит}
                  onChange={(значение) =>
                    установитьЧерновик({ ...черновик, лимит: значение })
                  }
                  placeholder="не задан"
                />
              </Field>
            ) : null}

            <Field
              подпись="Слова для распознавания при импорте"
              подсказка="Через запятую. Например: пятёроч, магнит, лента"
            >
              <Input
                value={черновик.правила}
                onChange={(событие) =>
                  установитьЧерновик({ ...черновик, правила: событие.target.value })
                }
              />
            </Field>

            <Switch
              включён={черновик.архив}
              наИзменение={(значение) =>
                установитьЧерновик({ ...черновик, архив: значение })
              }
              подпись="В архиве"
              описание="Категория скрывается из выбора, но история операций сохраняется"
            />
          </div>
        ) : null}
      </Dialog>
    </div>
  )
}
