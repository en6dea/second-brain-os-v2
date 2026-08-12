import { useState } from 'react'
import { Check, Lightbulb, Plus, Trash2 } from 'lucide-react'
import type {
  Замысел,
  ПунктЗамысла,
  СостояниеЗамысла,
  ВидЗамысла,
} from '@/core/db/types'
import { новыйId } from '@/core/db/RecordId'
import { деньгиКратко, копейкиВРубли, рублиВКопейки } from '@/core/money/Money'
import { откладыватьВНеделю, подсказкиПунктов, свестиЗамысел } from './model/Planner'
import { cn } from '@/design-system/classNames'
import {
  Button,
  Dialog,
  Field,
  IconButton,
  Input,
  MoneyInput,
  Select,
  Textarea,
} from '@/design-system/components'

const ВИДЫ: ВидЗамысла[] = ['покупка', 'поездка', 'проект', 'событие', 'план']
const СОСТОЯНИЯ: СостояниеЗамысла[] = [
  'обдумываю',
  'готовлюсь',
  'в работе',
  'сделано',
  'отменено',
]

/** Копейки в строку рублей для поля ввода. Пусто — «не решено». */
function вРубли(значение: number | null | undefined): string {
  return значение === null || значение === undefined
    ? ''
    : String(копейкиВРубли(значение) ?? '')
}

function собрать(черновик: Partial<Замысел>): Замысел {
  return {
    id: черновик.id ?? '',
    createdAt: черновик.createdAt ?? '',
    updatedAt: черновик.updatedAt ?? '',
    название: черновик.название ?? '',
    вид: черновик.вид ?? 'план',
    зачем: черновик.зачем ?? '',
    состояние: черновик.состояние ?? 'обдумываю',
    датаЦели: черновик.датаЦели ?? null,
    датаОкончания: черновик.датаОкончания ?? null,
    бюджет: черновик.бюджет ?? null,
    отложено: черновик.отложено ?? null,
    пункты: черновик.пункты ?? [],
    сфераId: черновик.сфераId ?? null,
    цельId: черновик.цельId ?? null,
    заметка: черновик.заметка ?? '',
    итог: черновик.итог ?? '',
  }
}

/**
 * Окно замысла.
 *
 * Список пунктов правится прямо здесь, а подсказки предлагают то, о чём в
 * замысле этого вида обычно забывают. Подсказка не добавляется сама: решает
 * человек, иначе список зарастает чужими пунктами.
 */
export function IntentionDialog({
  черновик,
  наЗакрытие,
  наСохранение,
  наУдаление,
}: {
  черновик: Partial<Замысел> | null
  наЗакрытие: () => void
  наСохранение: (замысел: Partial<Замысел>) => Promise<void>
  наУдаление: (id: string) => Promise<void>
}) {
  // Суммы живут в строках ввода и оттуда же берутся расчётами. Пустая строка
  // означает «не решено» — это не ноль. Начальные значения берутся из записи
  // один раз: окно пересоздаётся по ключу из родителя, эффект не нужен.
  const [бюджет, установитьБюджет] = useState(вРубли(черновик?.бюджет))
  const [отложено, установитьОтложено] = useState(вРубли(черновик?.отложено))
  const [новыйПункт, установитьНовыйПункт] = useState('')
  const [правки, установитьПравки] = useState<Partial<Замысел>>({})

  const текущий: Замысел = {
    ...собрать({ ...черновик, ...правки }),
    бюджет: бюджет.trim() === '' ? null : рублиВКопейки(бюджет),
    отложено: отложено.trim() === '' ? null : рублиВКопейки(отложено),
  }
  const сводка = свестиЗамысел(текущий)
  const вНеделю = откладыватьВНеделю(текущий)
  const подсказки = подсказкиПунктов(
    текущий.вид,
    текущий.пункты.map((пункт) => пункт.название),
  )

  function изменить(поля: Partial<Замысел>) {
    установитьПравки((текущие) => ({ ...текущие, ...поля }))
  }

  /**
   * Правка списка пунктов.
   *
   * Считается от предыдущего состояния, а не от того, что нарисовано сейчас.
   * Два быстрых нажатия подряд попадают в один такт отрисовки, и вычисление
   * от нарисованного теряло первый добавленный пункт.
   */
  function изменитьПункты(
    преобразование: (пункты: ПунктЗамысла[]) => ПунктЗамысла[],
  ) {
    установитьПравки((текущие) => ({
      ...текущие,
      пункты: преобразование(текущие.пункты ?? черновик?.пункты ?? []),
    }))
  }

  function изменитьПункт(id: string, поля: Partial<ПунктЗамысла>) {
    изменитьПункты((пункты) =>
      пункты.map((пункт) => (пункт.id === id ? { ...пункт, ...поля } : пункт)),
    )
  }

  function добавитьПункт(название: string) {
    const очищено = название.trim()
    if (!очищено) return
    изменитьПункты((пункты) => [
      ...пункты,
      {
        id: новыйId(),
        название: очищено,
        выполнен: false,
        срок: null,
        стоимость: null,
        заметка: '',
      },
    ])
    установитьНовыйПункт('')
  }

  return (
    <Dialog
      открыто={черновик !== null}
      наЗакрытие={() => {
        установитьПравки({})
        наЗакрытие()
      }}
      заголовок={черновик?.id ? 'Замысел' : 'Новый замысел'}
      подпись="Приложение считает только то, что вы вписали"
      ширина="широкая"
      подвал={
        <>
          {черновик?.id ? (
            <Button
              вид="опасная"
              размер="малый"
              onClick={() => void наУдаление(черновик.id as string)}
            >
              Удалить
            </Button>
          ) : null}
          <Button
            вид="тихая"
            onClick={() => {
              установитьПравки({})
              наЗакрытие()
            }}
          >
            Отменить
          </Button>
          <Button
            вид="основная"
            disabled={!текущий.название.trim()}
            onClick={async () => {
              await наСохранение({ ...текущий, id: черновик?.id })
              установитьПравки({})
            }}
          >
            Сохранить
          </Button>
        </>
      }
    >
      {черновик ? (
        <div className="space-y-4">
          <Field подпись="Что задумано" обязательное>
            <Input
              value={текущий.название}
              autoFocus
              onChange={(событие) => изменить({ название: событие.target.value })}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field подпись="Вид" подсказка="меняет подсказки пунктов">
              <Select
                value={текущий.вид}
                onChange={(событие) =>
                  изменить({ вид: событие.target.value as ВидЗамысла })
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
                value={текущий.состояние}
                onChange={(событие) =>
                  изменить({ состояние: событие.target.value as СостояниеЗамысла })
                }
              >
                {СОСТОЯНИЯ.map((состояние) => (
                  <option key={состояние} value={состояние}>
                    {состояние}
                  </option>
                ))}
              </Select>
            </Field>
            <Field подпись="К какому дню">
              <Input
                type="date"
                value={текущий.датаЦели ?? ''}
                onChange={(событие) =>
                  изменить({ датаЦели: событие.target.value || null })
                }
              />
            </Field>
          </div>

          <Field подпись="Зачем это нужно">
            <Textarea
              rows={2}
              value={текущий.зачем}
              onChange={(событие) => изменить({ зачем: событие.target.value })}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field подпись="Готовы потратить" подсказка="пусто — сумма не решена">
              <MoneyInput value={бюджет} onChange={установитьБюджет} />
            </Field>
            <Field подпись="Уже отложено">
              <MoneyInput value={отложено} onChange={установитьОтложено} />
            </Field>
          </div>

          {вНеделю !== null && вНеделю > 0 ? (
            <p className="rounded-3 border border-accent-line bg-accent-soft px-4 py-3 text-[13px] leading-relaxed text-ink-2">
              Чтобы успеть к сроку, откладывать по{' '}
              <span className="tnum font-semibold text-ink">
                {деньгиКратко(вНеделю)}
              </span>{' '}
              в неделю. Считается из бюджета, отложенного и числа дней до даты.
            </p>
          ) : null}

          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-[13px] font-medium text-ink">Пункты</p>
              <span className="text-[12px] text-ink-3">
                {сводка.всегоПунктов === 0
                  ? 'ни одного'
                  : `${сводка.выполнено} из ${сводка.всегоПунктов}`}
              </span>
            </div>

            <ul className="space-y-1.5">
              {текущий.пункты.map((пункт) => (
                <li
                  key={пункт.id}
                  className="flex flex-wrap items-center gap-2 rounded-2 border border-line px-2.5 py-2"
                >
                  <button
                    type="button"
                    aria-label={`Отметить пункт «${пункт.название}»`}
                    aria-pressed={пункт.выполнен}
                    onClick={() => изменитьПункт(пункт.id, { выполнен: !пункт.выполнен })}
                    className={cn(
                      'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-[7px] border transition-colors',
                      пункт.выполнен
                        ? 'border-transparent bg-good text-white'
                        : 'border-line hover:border-accent',
                    )}
                  >
                    {пункт.выполнен ? <Check size={12} /> : null}
                  </button>

                  <input
                    value={пункт.название}
                    onChange={(событие) =>
                      изменитьПункт(пункт.id, { название: событие.target.value })
                    }
                    aria-label="Название пункта"
                    className={cn(
                      'min-w-0 flex-1 bg-transparent text-[13px] text-ink outline-none',
                      пункт.выполнен && 'text-ink-3 line-through',
                    )}
                  />

                  <input
                    type="date"
                    value={пункт.срок ?? ''}
                    onChange={(событие) =>
                      изменитьПункт(пункт.id, { срок: событие.target.value || null })
                    }
                    aria-label="Срок пункта"
                    className="h-7 shrink-0 rounded-2 border border-line bg-card px-2 text-[12px] text-ink-2"
                  />

                  <input
                    inputMode="decimal"
                    placeholder="₽"
                    value={
                      пункт.стоимость === null
                        ? ''
                        : String(копейкиВРубли(пункт.стоимость) ?? '')
                    }
                    onChange={(событие) =>
                      изменитьПункт(пункт.id, {
                        стоимость:
                          событие.target.value.trim() === ''
                            ? null
                            : рублиВКопейки(событие.target.value),
                      })
                    }
                    aria-label="Стоимость пункта"
                    className="tnum h-7 w-[86px] shrink-0 rounded-2 border border-line bg-card px-2 text-right text-[12px] text-ink"
                  />

                  <IconButton
                    подпись="Убрать пункт"
                    onClick={() =>
                      изменитьПункты((пункты) =>
                        пункты.filter((элемент) => элемент.id !== пункт.id),
                      )
                    }
                  >
                    <Trash2 size={14} />
                  </IconButton>
                </li>
              ))}
            </ul>

            <div className="mt-2 flex gap-2">
              <Input
                value={новыйПункт}
                placeholder="Новый пункт"
                onChange={(событие) => установитьНовыйПункт(событие.target.value)}
                onKeyDown={(событие) => {
                  if (событие.key === 'Enter') {
                    событие.preventDefault()
                    добавитьПункт(новыйПункт)
                  }
                }}
              />
              <Button
                вид="обычная"
                иконка={<Plus size={15} />}
                onClick={() => добавитьПункт(новыйПункт)}
              >
                Добавить
              </Button>
            </div>
          </div>

          {подсказки.length > 0 ? (
            <div className="rounded-3 border border-line bg-sunken p-4">
              <p className="mb-2 flex items-center gap-1.5 text-[12.5px] font-medium text-ink">
                <Lightbulb size={14} className="text-accent" />
                Часто забывают в замысле вида «{текущий.вид}»
              </p>
              <div className="flex flex-wrap gap-1.5">
                {подсказки.map((подсказка) => (
                  <button
                    key={подсказка}
                    type="button"
                    onClick={() => добавитьПункт(подсказка)}
                    className="rounded-2 border border-line bg-card px-2.5 py-1.5 text-[12px] text-ink-2 transition-colors hover:border-accent-line hover:bg-accent-soft hover:text-ink"
                  >
                    + {подсказка}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {сводка.замечания.length > 0 ? (
            <ul className="space-y-1">
              {сводка.замечания.map((текст) => (
                <li key={текст} className="text-[12.5px] text-ink-3">
                  {текст}
                </li>
              ))}
            </ul>
          ) : null}

          <Field подпись="Заметка">
            <Textarea
              rows={2}
              value={текущий.заметка}
              onChange={(событие) => изменить({ заметка: событие.target.value })}
            />
          </Field>
        </div>
      ) : null}
    </Dialog>
  )
}
