import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { CheckCircle2, FileUp, Upload } from 'lucide-react'
import { база } from '@/core/db/db'
import { новаяЗапись } from '@/core/db/repo'
import {
  подсказатьКатегорию,
  разобратьВыписку,
  type РазборВыписки,
} from '@/features/finance/model/csv'
import { деньги } from '@/core/money/Money'
import { деньКратко } from '@/core/calendar/CalendarRu'
import { склонение } from '@/core/language/Plural'
import { использоватьИнтерфейс } from '@/app/providers/ui'
import { cn } from '@/design-system/classNames'
import {
  Select,
  Badge,
  Card,
  Button,
  Metric,
  Field,
  EmptyState,
  CardHeader,
  CardBody,
} from '@/design-system/components'

interface СтрокаКИмпорту {
  отпечаток: string
  дата: string
  сумма: number
  описание: string
  категорияId: string
  дубль: boolean
  включена: boolean
}

export function ImportPage() {
  const сообщить = использоватьИнтерфейс((с) => с.сообщить)
  const [разбор, установитьРазбор] = useState<РазборВыписки | null>(null)
  const [строки, установитьСтроки] = useState<СтрокаКИмпорту[]>([])
  const [счётId, установитьСчёт] = useState('')
  const [имяФайла, установитьИмяФайла] = useState('')
  const [ошибка, установитьОшибку] = useState('')
  const [итогИмпорта, установитьИтог] = useState<{
    добавлено: number
    пропущено: number
  } | null>(null)

  const справочники = useLiveQuery(async () => {
    const [счета, категории, операции] = await Promise.all([
      база.accounts.filter((с) => !с.архив).toArray(),
      база.moneyCategories.filter((к) => !к.архив).toArray(),
      база.operations.toArray(),
    ])
    return { счета, категории, операции }
  }, [])

  const статистика = useMemo(() => {
    const дублей = строки.filter((с) => с.дубль).length
    const кВключению = строки.filter((с) => с.включена).length
    const безКатегории = строки.filter((с) => с.включена && !с.категорияId).length
    return { дублей, кВключению, безКатегории }
  }, [строки])

  async function прочитатьФайл(файл: File) {
    установитьОшибку('')
    установитьИтог(null)
    try {
      const содержимое = await файл.text()
      const результат = разобратьВыписку(содержимое)

      if (результат.строки.length === 0) {
        установитьРазбор(результат)
        установитьСтроки([])
        установитьОшибку(
          'Ни одной строки распознать не удалось. Проверьте, что в файле есть столбцы с датой и суммой.',
        )
        return
      }

      const существующие = new Set(
        (справочники?.операции ?? [])
          .map((операция) => операция.отпечатокИмпорта)
          .filter((значение): значение is string => Boolean(значение)),
      )

      установитьРазбор(результат)
      установитьИмяФайла(файл.name)
      установитьСтроки(
        результат.строки.map((строка) => {
          const дубль = существующие.has(строка.отпечаток)
          return {
            отпечаток: строка.отпечаток,
            дата: строка.дата ?? '',
            сумма: строка.сумма ?? 0,
            описание: строка.описание,
            категорияId:
              подсказатьКатегорию(строка.описание, справочники?.категории ?? []) ??
              '',
            дубль,
            включена: !дубль,
          }
        }),
      )
    } catch {
      установитьОшибку('Не удалось прочитать файл. Ожидается текстовый файл CSV.')
    }
  }

  async function импортировать() {
    const кЗаписи = строки.filter((строка) => строка.включена)
    if (кЗаписи.length === 0) return

    const записи = кЗаписи.map((строка) =>
      новаяЗапись({
        дата: строка.дата,
        тип: строка.сумма >= 0 ? 'доход' : 'расход',
        сумма: Math.abs(строка.сумма),
        счётId: счётId || null,
        счётПолучательId: null,
        категорияId: строка.категорияId || null,
        классРасхода: null,
        заметка: строка.описание,
        планId: null,
        отпечатокИмпорта: строка.отпечаток,
        разобрана: Boolean(строка.категорияId),
      }),
    )

    await база.operations.bulkAdd(записи as never)
    установитьИтог({
      добавлено: записи.length,
      пропущено: строки.length - записи.length,
    })
    установитьСтроки([])
    установитьРазбор(null)
    сообщить(`Импортировано операций: ${записи.length}`)
  }

  return (
    <div className="anim-rise space-y-5">
      <Card>
        <CardHeader
          заголовок="Импорт банковской выписки"
          подпись="Файл читается только в браузере и никуда не отправляется"
        />
        <CardBody>
          <ol className="mb-4 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-ink-3">
            {[
              'Загрузка',
              'Предпросмотр',
              'Поиск дублей',
              'Подсказка категорий',
              'Проверка',
              'Запись',
            ].map((шаг, индекс) => (
              <li key={шаг} className="flex items-center gap-1.5">
                <span className="tnum flex h-4 w-4 items-center justify-center rounded-full bg-sunken text-[10px]">
                  {индекс + 1}
                </span>
                {шаг}
              </li>
            ))}
          </ol>

          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-4 border border-dashed border-line-strong px-6 py-10 text-center transition-colors hover:border-accent hover:bg-accent-soft/40">
            <FileUp size={22} className="text-ink-3" />
            <span className="text-[13.5px] font-medium text-ink">
              Выберите файл выписки
            </span>
            <span className="text-[12px] text-ink-3">
              CSV с разделителем «;» или «,». Понимает даты вида 11.08.2026 и суммы
              вида 1 234,56
            </span>
            <input
              type="file"
              accept=".csv,text/csv,text/plain"
              className="hidden"
              onChange={(событие) => {
                const файл = событие.target.files?.[0]
                if (файл) void прочитатьФайл(файл)
                событие.target.value = ''
              }}
            />
          </label>

          {ошибка ? (
            <p className="mt-3 rounded-3 border border-bad/30 bg-bad-soft px-4 py-2.5 text-[13px] text-bad">
              {ошибка}
            </p>
          ) : null}
        </CardBody>
      </Card>

      {итогИмпорта ? (
        <Card>
          <CardBody className="pt-5">
            <div className="flex items-center gap-3">
              <CheckCircle2 size={20} className="text-good" />
              <p className="text-[13.5px] text-ink">
                Импорт завершён. Добавлено операций: {итогИмпорта.добавлено}.{' '}
                {итогИмпорта.пропущено > 0
                  ? `Пропущено: ${итогИмпорта.пропущено}.`
                  : ''}
              </p>
            </div>
          </CardBody>
        </Card>
      ) : null}

      {разбор && строки.length > 0 ? (
        <>
          <Card>
            <CardHeader заголовок="Предпросмотр" подпись={имяФайла} />
            <div className="grid grid-cols-2 gap-5 px-5 pb-5 lg:grid-cols-4">
              <Metric
                подпись="Распознано строк"
                значение={String(строки.length)}
                источник={
                  разбор.пропущено > 0
                    ? `пропущено без даты или суммы: ${разбор.пропущено}`
                    : 'все строки файла разобраны'
                }
              />
              <Metric
                подпись="Похоже на дубли"
                значение={String(статистика.дублей)}
                источник="совпал отпечаток прежнего импорта"
                тон={статистика.дублей > 0 ? 'внимание' : 'нейтральный'}
              />
              <Metric
                подпись="Будет записано"
                значение={String(статистика.кВключению)}
                тон="успех"
              />
              <Metric
                подпись="Без категории"
                значение={String(статистика.безКатегории)}
                источник="попадут в очередь разбора"
                тон={статистика.безКатегории > 0 ? 'внимание' : 'нейтральный'}
              />
            </div>

            <div className="border-t border-line px-5 py-4">
              <Field
                подпись="Счёт, к которому относится выписка"
                подсказка="Без счёта операции запишутся, но не повлияют на расчётный остаток"
                className="max-w-sm"
              >
                <Select
                  value={счётId}
                  onChange={(событие) => установитьСчёт(событие.target.value)}
                >
                  <option value="">Не выбран</option>
                  {(справочники?.счета ?? []).map((счёт) => (
                    <option key={счёт.id} value={счёт.id}>
                      {счёт.название}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          </Card>

          <Card>
            <CardHeader
              заголовок="Проверка перед записью"
              подпись={`${статистика.кВключению} из ${строки.length} ${склонение(строки.length, 'строки', 'строк', 'строк')} отмечено`}
              действие={
                <Button
                  вид="основная"
                  размер="малый"
                  иконка={<Upload size={15} />}
                  onClick={импортировать}
                  disabled={статистика.кВключению === 0}
                >
                  Импортировать
                </Button>
              }
            />

            <div className="max-h-[520px] overflow-y-auto border-t border-line">
              {строки.map((строка, индекс) => (
                <div
                  key={`${строка.отпечаток}-${индекс}`}
                  className={cn(
                    'flex flex-wrap items-center gap-3 border-b border-line px-5 py-2.5',
                    !строка.включена && 'opacity-50',
                  )}
                >
                  <input
                    type="checkbox"
                    checked={строка.включена}
                    aria-label={`Импортировать строку от ${строка.дата}`}
                    onChange={(событие) =>
                      установитьСтроки((текущие) =>
                        текущие.map((элемент, номер) =>
                          номер === индекс
                            ? { ...элемент, включена: событие.target.checked }
                            : элемент,
                        ),
                      )
                    }
                    className="h-4 w-4 shrink-0 accent-[var(--accent)]"
                  />
                  <span className="w-[54px] shrink-0 text-[12px] text-ink-3">
                    {деньКратко(строка.дата)}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[13px] text-ink">
                    {строка.описание || 'Без описания'}
                    {строка.дубль ? (
                      <Badge тон="внимание" className="ml-2">
                        возможный дубль
                      </Badge>
                    ) : null}
                  </span>
                  <select
                    value={строка.категорияId}
                    onChange={(событие) =>
                      установитьСтроки((текущие) =>
                        текущие.map((элемент, номер) =>
                          номер === индекс
                            ? { ...элемент, категорияId: событие.target.value }
                            : элемент,
                        ),
                      )
                    }
                    aria-label="Категория операции"
                    className="h-8 shrink-0 rounded-2 border border-line bg-card px-2 text-[12px] text-ink"
                  >
                    <option value="">Без категории</option>
                    {(справочники?.категории ?? [])
                      .filter((категория) =>
                        строка.сумма >= 0
                          ? категория.вид === 'доход'
                          : категория.вид === 'расход',
                      )
                      .map((категория) => (
                        <option key={категория.id} value={категория.id}>
                          {категория.название}
                        </option>
                      ))}
                  </select>
                  <span
                    className={cn(
                      'tnum w-[110px] shrink-0 text-right text-[13px] font-semibold',
                      строка.сумма >= 0 ? 'text-good' : 'text-ink',
                    )}
                  >
                    {деньги(строка.сумма, { знак: true })}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </>
      ) : разбор === null && !итогИмпорта ? (
        <Card>
          <EmptyState
            заголовок="Файл ещё не загружен"
            подпись="После загрузки вы увидите, что именно будет записано, и сможете исключить лишнее. Ничего не попадёт в базу без подтверждения."
          />
        </Card>
      ) : null}
    </div>
  )
}
