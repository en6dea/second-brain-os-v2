import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { база } from '@/core/db/db'
import { новаяЗапись } from '@/core/db/repo'
import {
  объяснитьРасхождение,
  расчётныйОстаток,
} from '@/features/finance/model/calc'
import { деньги, рублиВКопейки } from '@/core/money/Money'
import { деньСловами, сегодня } from '@/core/calendar/CalendarRu'
import { сейчас } from '@/core/db/RecordId'
import { useИнтерфейс } from '@/app/providers/ui'
import {
  MoneyInput,
  Select,
  Skeleton,
  Card,
  Button,
  Metric,
  Field,
  EmptyState,
  CardHeader,
  CardBody,
} from '@/design-system/components'

export function ReconciliationPage() {
  const сообщить = useИнтерфейс((с) => с.сообщить)
  const [счётId, установитьСчёт] = useState('')
  const [фактический, установитьФактический] = useState('')
  const [итог, установитьИтог] = useState<ReturnType<
    typeof объяснитьРасхождение
  > | null>(null)

  const данные = useLiveQuery(async () => {
    const [счета, операции, сверки] = await Promise.all([
      база.accounts.filter((с) => !с.архив).toArray(),
      база.operations.toArray(),
      база.reconciliations.reverse().limit(10).toArray(),
    ])
    return { счета, операции, сверки }
  }, [])

  if (!данные) {
    return (
      <Card>
        <Skeleton строк={3} />
      </Card>
    )
  }

  const счёт = данные.счета.find((с) => с.id === счётId) ?? null
  const расчёт = счёт ? расчётныйОстаток(счёт, данные.операции) : null
  const операцииСчёта = данные.операции.filter(
    (операция) =>
      операция.счётId === счётId || операция.счётПолучательId === счётId,
  )

  function сверить() {
    if (!счёт) return
    const сумма = рублиВКопейки(фактический)
    if (сумма === null) return

    const дубли = найтиВозможныеДубли(операцииСчёта)

    установитьИтог(
      объяснитьРасхождение({
        фактический: сумма,
        расчётный: расчёт,
        неразобранныхОпераций: операцииСчёта.filter((о) => !о.разобрана).length,
        переводовЗаПериод: операцииСчёта.filter((о) => о.тип === 'перевод').length,
        остатокНеПодтверждён:
          !счёт.подтверждён ||
          Date.now() - new Date(счёт.подтверждён).getTime() > 30 * 86_400_000,
        возможныхДублей: дубли,
      }),
    )
  }

  async function принятьФакт() {
    if (!счёт || !итог) return
    const сумма = рублиВКопейки(фактический)
    if (сумма === null) return

    await база.reconciliations.add(
      новаяЗапись({
        счётId: счёт.id,
        дата: сегодня(),
        фактическийОстаток: сумма,
        расчётныйОстаток: расчёт ?? 0,
        расхождение: итог.расхождение,
        объяснение: итог.причины.join(' '),
        закрыта: true,
      }) as never,
    )

    await база.accounts.put({
      ...счёт,
      фактическийОстаток: сумма,
      подтверждён: сейчас(),
      updatedAt: сейчас(),
    })

    сообщить('Остаток подтверждён, сверка сохранена')
    установитьИтог(null)
    установитьФактический('')
  }

  return (
    <div className="anim-rise space-y-5">
      <Card>
        <CardHeader
          заголовок="Сверка остатка"
          подпись="Сравниваем то, что показывает банк, с тем, что насчитала система"
        />
        <CardBody>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field подпись="Счёт">
              <Select
                value={счётId}
                onChange={(событие) => {
                  установитьСчёт(событие.target.value)
                  установитьИтог(null)
                }}
              >
                <option value="">Выберите счёт</option>
                {данные.счета.map((элемент) => (
                  <option key={элемент.id} value={элемент.id}>
                    {элемент.название}
                  </option>
                ))}
              </Select>
            </Field>

            <Field
              подпись="Фактический остаток по данным банка"
              подсказка="Посмотрите в приложении банка на текущий момент"
            >
              <MoneyInput
                value={фактический}
                onChange={установитьФактический}
                placeholder="0"
              />
            </Field>
          </div>

          <div className="mt-4">
            <Button
              вид="основная"
              onClick={сверить}
              disabled={!счёт || рублиВКопейки(фактический) === null}
            >
              Сверить
            </Button>
          </div>
        </CardBody>
      </Card>

      {счёт ? (
        <Card>
          <div className="grid grid-cols-2 gap-5 p-5 sm:grid-cols-3">
            <Metric
              подпись="Подтверждённый остаток"
              значение={деньги(счёт.фактическийОстаток)}
              источник={
                счёт.подтверждён
                  ? `подтверждён ${деньСловами(счёт.подтверждён.slice(0, 10))}`
                  : 'никогда не подтверждался'
              }
            />
            <Metric
              подпись="Расчётный остаток"
              значение={деньги(расчёт)}
              источник={`операций по счёту: ${операцииСчёта.length}`}
            />
            <Metric
              подпись="Ждут категории"
              значение={String(операцииСчёта.filter((о) => !о.разобрана).length)}
              тон={
                операцииСчёта.some((о) => !о.разобрана) ? 'внимание' : 'нейтральный'
              }
            />
          </div>
        </Card>
      ) : null}

      {итог ? (
        <Card className={итог.совпало ? 'border-good/40' : 'border-warn/40'}>
          <CardBody className="pt-5">
            <div className="flex items-start gap-3">
              {итог.совпало ? (
                <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-good" />
              ) : (
                <AlertTriangle size={20} className="mt-0.5 shrink-0 text-warn" />
              )}
              <div className="min-w-0">
                <p className="text-[15px] font-semibold text-ink">
                  {итог.совпало
                    ? 'Всё сходится'
                    : `Расхождение ${деньги(итог.расхождение, { знак: true })}`}
                </p>
                {итог.причины.length > 0 ? (
                  <ul className="mt-2 space-y-1.5">
                    {итог.причины.map((причина) => (
                      <li key={причина} className="text-[13px] text-ink-2">
                        · {причина}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1 text-[13px] text-ink-2">
                    Расчётный остаток совпал с фактическим. Ничего исправлять не
                    нужно.
                  </p>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button вид="основная" размер="малый" onClick={принятьФакт}>
                    Принять остаток банка и подтвердить
                  </Button>
                  <Button размер="малый" onClick={() => установитьИтог(null)}>
                    Сначала разберусь
                  </Button>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardHeader заголовок="История сверок" />
        {данные.сверки.length === 0 ? (
          <EmptyState
            заголовок="Сверок ещё не было"
            подпись="Сверяйте остаток раз в неделю — так расхождение находится, пока его причина ещё помнится."
          />
        ) : (
          <div className="divide-y divide-line border-t border-line">
            {данные.сверки.map((сверка) => {
              const имя =
                данные.счета.find((с) => с.id === сверка.счётId)?.название ??
                'счёт удалён'
              return (
                <div
                  key={сверка.id}
                  className="flex items-center justify-between gap-3 px-5 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[13.5px] text-ink">{имя}</p>
                    <p className="text-[11.5px] text-ink-3">
                      {деньСловами(сверка.дата)}
                    </p>
                  </div>
                  <span
                    className={
                      сверка.расхождение === 0
                        ? 'tnum text-[13px] text-good'
                        : 'tnum text-[13px] text-warn'
                    }
                  >
                    {сверка.расхождение === 0
                      ? 'сошлось'
                      : деньги(сверка.расхождение, { знак: true })}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}

/** Операции с одинаковой датой и суммой — кандидаты в дубли. */
function найтиВозможныеДубли(операции: { дата: string; сумма: number }[]): number {
  const счётчик = new Map<string, number>()
  for (const операция of операции) {
    const ключ = `${операция.дата}|${операция.сумма}`
    счётчик.set(ключ, (счётчик.get(ключ) ?? 0) + 1)
  }
  let дублей = 0
  for (const количество of счётчик.values()) {
    if (количество > 1) дублей += количество - 1
  }
  return дублей
}
