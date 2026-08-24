import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Circle, Focus, MoonStar, Timer, Zap } from 'lucide-react'
import { база } from '@/core/db/db'
import {
  оценитьЗагрузку,
  собратьПланДня,
  РАЗДЕЛ_ПО_ВИДУ,
  type ЧерновикПункта,
} from '@/core/day/dayPlan'
import { новаяЗапись } from '@/core/db/repo'
import { новыйId, сейчас } from '@/core/db/RecordId'
import { сегодня } from '@/core/calendar/CalendarRu'
import {
  Card,
  CardHeader,
  CardBody,
  CheckMark,
  Skeleton,
  Button,
  Field,
  Input,
  Segmented,
  Select,
  Dialog,
} from '@/design-system/components'
import { cn } from '@/design-system/classNames'
import { ЗНАЧОК } from '@/design-system/iconSize'
import type { ПунктПлана, УровеньЭнергии } from '@/core/db/types'
import { FocusDialog } from './FocusDialog'

type ЭнергияСтрокой = '1' | '2' | '3' | '4' | '5'

const УРОВНИ_ЭНЕРГИИ: Array<{ ключ: ЭнергияСтрокой; подпись: string }> = [
  { ключ: '1', подпись: '1' },
  { ключ: '2', подпись: '2' },
  { ключ: '3', подпись: '3' },
  { ключ: '4', подпись: '4' },
  { ключ: '5', подпись: '5' },
]

function ключПункта(пункт: Pick<ЧерновикПункта, 'вид' | 'записьId'>): string {
  return `${пункт.вид}:${пункт.записьId}`
}

function разобратьСон(значение: string): number | null | undefined {
  if (значение.trim() === '') return null
  const часов = Number(значение.replace(',', '.'))
  if (!Number.isFinite(часов) || часов < 0 || часов > 24) return undefined
  return часов
}

function DayCheckInFields({
  энергия,
  наЭнергию,
  сон,
  наСон,
  ошибкаСна,
  доступно,
  наДоступно,
}: {
  энергия: ЭнергияСтрокой
  наЭнергию: (значение: ЭнергияСтрокой) => void
  сон: string
  наСон: (значение: string) => void
  ошибкаСна: string
  доступно: string
  наДоступно: (значение: string) => void
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <p className="mb-1.5 text-body font-medium text-ink-2">Энергия сейчас</p>
        <Segmented
          значения={УРОВНИ_ЭНЕРГИИ}
          выбрано={энергия}
          наВыбор={наЭнергию}
          размер="поле"
        />
        <p className="mt-1 text-meta text-ink-3">
          {подписьЭнергии(Number(энергия) as УровеньЭнергии)}
        </p>
      </div>
      <Field подпись="Сон, часов" подсказка="Необязательно" ошибка={ошибкаСна}>
        <Input
          value={сон}
          inputMode="decimal"
          placeholder="Например, 7,5"
          onChange={(событие) => наСон(событие.target.value)}
        />
      </Field>
      <Field подпись="Времени на главное" подсказка="Лимит, а не обещание">
        <Select
          value={доступно}
          onChange={(событие) => наДоступно(событие.target.value)}
        >
          <option value="60">1 час</option>
          <option value="120">2 часа</option>
          <option value="180">3 часа</option>
          <option value="240">4 часа</option>
          <option value="360">6 часов</option>
        </Select>
      </Field>
    </div>
  )
}

/**
 * План на день — короткий список из `core/day/dayPlan.ts`, собранный без
 * внешних сервисов и без сети. До подтверждения это только локальный черновик:
 * открытие страницы не должно само создавать записи от имени человека.
 *
 * Отметка задачи и привычки отражается и в самой записи — иначе появились
 * бы два источника правды о том, сделано что-то или нет.
 */
export function DayPlanCard() {
  const день = сегодня()
  const перейти = useNavigate()
  const [сохраняется, установитьСохраняется] = useState(false)
  const [энергия, установитьЭнергию] = useState<ЭнергияСтрокой>('3')
  const [сон, установитьСон] = useState('')
  const [ошибкаСна, установитьОшибкуСна] = useState('')
  const [доступно, установитьДоступно] = useState('180')
  const [исключены, установитьИсключённые] = useState<Set<string>>(() => new Set())
  const [фокус, установитьФокус] = useState<ПунктПлана | null>(null)
  const [контекстОткрыт, установитьКонтекстОткрыт] = useState(false)

  const данные = useLiveQuery(async () => {
    const [задачи, цели, привычки, обязательства, входящие, план] =
      await Promise.all([
        база.tasks.toArray(),
        база.goals.toArray(),
        база.habits.toArray(),
        база.obligations.toArray(),
        база.inbox.toArray(),
        база.dayPlans.where('день').equals(день).first(),
      ])
    return { задачи, цели, привычки, обязательства, входящие, план }
  }, [день])

  if (!данные) {
    return (
      <Card>
        <Skeleton строк={3} />
      </Card>
    )
  }

  const план = данные.план
  const черновик = план
    ? []
    : собратьПланДня(
        {
          задачи: данные.задачи,
          цели: данные.цели,
          привычки: данные.привычки,
          обязательства: данные.обязательства,
          замыслы: [],
          входящие: данные.входящие,
        },
        день,
        new Date().getHours(),
      )

  const выбранныйЧерновик = черновик.filter(
    (пункт) => !исключены.has(ключПункта(пункт)),
  )
  const доступноМинут = Number(доступно)
  const загрузка = оценитьЗагрузку(выбранныйЧерновик, доступноМинут)

  function переключитьПунктЧерновика(пункт: ЧерновикПункта) {
    const ключ = ключПункта(пункт)
    установитьИсключённые((текущие) => {
      const следующие = new Set(текущие)
      if (следующие.has(ключ)) следующие.delete(ключ)
      else следующие.add(ключ)
      return следующие
    })
  }

  async function принятьПлан() {
    if (план || выбранныйЧерновик.length === 0 || сохраняется) return
    const сонЧасов = разобратьСон(сон)
    if (сонЧасов === undefined) {
      установитьОшибкуСна('Укажите число от 0 до 24 или оставьте поле пустым')
      return
    }
    const пункты: ПунктПлана[] = выбранныйЧерновик.map((пункт, индекс) => ({
      ...пункт,
      id: новыйId(),
      порядок: индекс,
      выполнен: false,
    }))
    установитьСохраняется(true)
    try {
      await база.transaction('rw', база.dayPlans, async () => {
        const ужеЕсть = await база.dayPlans.where('день').equals(день).first()
        if (!ужеЕсть) {
          await база.dayPlans.add(
            новаяЗапись({
              день,
              пункты,
              чекИн: {
                энергия: Number(энергия) as УровеньЭнергии,
                сонЧасов,
                доступноМинут,
              },
            }) as never,
          )
        }
      })
    } finally {
      установитьСохраняется(false)
    }
  }

  async function сохранитьКонтекстПлана() {
    if (!план || план.чекИн || сохраняется) return
    const сонЧасов = разобратьСон(сон)
    if (сонЧасов === undefined) {
      установитьОшибкуСна('Укажите число от 0 до 24 или оставьте поле пустым')
      return
    }

    let сохранено = false
    установитьСохраняется(true)
    try {
      await база.transaction('rw', база.dayPlans, async () => {
        const текущий = await база.dayPlans.get(план.id)
        if (!текущий || текущий.чекИн) return
        await база.dayPlans.put({
          ...текущий,
          чекИн: {
            энергия: Number(энергия) as УровеньЭнергии,
            сонЧасов,
            доступноМинут,
          },
          updatedAt: сейчас(),
        })
        сохранено = true
      })
    } finally {
      установитьСохраняется(false)
    }
    if (сохранено) установитьКонтекстОткрыт(false)
  }

  if (!план) {
    return (
      <Card className="plan-surface flex h-full flex-col">
        <CardHeader
          заголовок="Настройка дня"
          подпись={
            черновик.length === 0
              ? 'Система не придумывает дела для заполнения экрана'
              : `${выбранныйЧерновик.length} из ${черновик.length} выбрано · пока не сохранено`
          }
        />
        <CardBody className="flex flex-1 flex-col">
          {черновик.length === 0 ? (
            <div className="flex flex-1 flex-col justify-center py-4">
              <p className="text-meta leading-relaxed text-ink-2">
                Добавьте задачу, привычку или обязательство — и здесь появится
                короткий, объяснимый черновик дня.
              </p>
              <Link
                to="/quick"
                className="mt-4 inline-flex min-h-11 items-center gap-2 self-start text-meta font-medium text-accent"
              >
                Быстро зафиксировать
                <ArrowRight size={16} />
              </Link>
            </div>
          ) : (
            <>
              <div className="border-b border-line pb-5">
                <DayCheckInFields
                  энергия={энергия}
                  наЭнергию={установитьЭнергию}
                  сон={сон}
                  наСон={(значение) => {
                    установитьСон(значение)
                    установитьОшибкуСна('')
                  }}
                  ошибкаСна={ошибкаСна}
                  доступно={доступно}
                  наДоступно={установитьДоступно}
                />
              </div>

              <div
                className={cn(
                  'mt-4 rounded-3 border p-3',
                  загрузка.превышениеМинут > 0
                    ? 'border-warn/40 bg-warn/8'
                    : 'border-line bg-sunken/55',
                )}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-meta font-medium text-ink-2">
                    Известная нагрузка: {загрузка.известноМинут} из {доступноМинут}{' '}
                    мин
                  </p>
                  {загрузка.безОценки > 0 ? (
                    <span className="text-caption text-ink-3">
                      без оценки времени: {загрузка.безОценки}
                    </span>
                  ) : null}
                </div>
                <p
                  className={cn(
                    'mt-1 text-caption leading-relaxed',
                    загрузка.превышениеМинут > 0 ? 'text-warn' : 'text-ink-3',
                  )}
                >
                  {загрузка.превышениеМинут > 0
                    ? `Уже известная часть больше лимита на ${загрузка.превышениеМинут} мин. Снимите лишний пункт до принятия.`
                    : Number(энергия) <= 2 && выбранныйЧерновик.length > 3
                      ? 'Энергия низкая: разумно оставить не больше трёх пунктов.'
                      : 'Неизвестное время не превращается в подставную оценку.'}
                </p>
              </div>

              <ul className="flex-1 divide-y divide-line">
                {черновик.map((пункт) => (
                  <li key={ключПункта(пункт)} className="flex gap-3 py-3">
                    <CheckMark
                      отмечено={!исключены.has(ключПункта(пункт))}
                      подпись={`Включить «${пункт.заголовок}» в план`}
                      наПереключение={() => переключитьПунктЧерновика(пункт)}
                      className="mt-0.5"
                    />
                    <span
                      className={cn(
                        'min-w-0',
                        исключены.has(ключПункта(пункт)) && 'opacity-50',
                      )}
                    >
                      <span className="block text-meta font-medium text-ink">
                        {пункт.заголовок}
                      </span>
                      <span className="mt-0.5 block text-caption leading-snug text-ink-3">
                        {пункт.зачем}
                      </span>
                      <span className="mt-1 block text-micro text-ink-3">
                        {пункт.ожидаемоМинут === null
                          ? 'Время не указано в источнике'
                          : `${пункт.ожидаемоМинут} мин · из исходной записи`}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 border-t border-line pt-4">
                <Button
                  вид="основная"
                  наВсюШирину
                  disabled={сохраняется || выбранныйЧерновик.length === 0}
                  onClick={() => void принятьПлан()}
                >
                  {сохраняется
                    ? 'Сохраняю…'
                    : `Принять план · ${выбранныйЧерновик.length}`}
                </Button>
                <p className="mt-2 text-center text-micro text-ink-3">
                  Только после подтверждения план сохранится в ваших данных
                </p>
              </div>
            </>
          )}
        </CardBody>
      </Card>
    )
  }

  async function переключить(пункт: ПунктПлана) {
    if (!план) return

    if (пункт.вид === 'задача') {
      await база.transaction('rw', база.dayPlans, база.tasks, async () => {
        const [текущийПлан, задача] = await Promise.all([
          база.dayPlans.get(план.id),
          база.tasks.get(пункт.записьId),
        ])
        const текущийПункт = текущийПлан?.пункты.find((п) => п.id === пункт.id)
        if (!текущийПлан || !текущийПункт || !задача) return
        if (задача.состояние === 'отменена') return

        const былаСделана = задача.состояние === 'сделана'
        const новоеСостояние = !былаСделана
        const исходное = текущийПункт.состояниеЗадачиДоВыполнения
        if (
          !новоеСостояние &&
          (!исходное || исходное === 'сделана' || исходное === 'отменена')
        ) {
          return
        }

        const обновлённыйПункт: ПунктПлана = {
          ...текущийПункт,
          выполнен: новоеСостояние,
        }
        if (новоеСостояние) {
          обновлённыйПункт.состояниеЗадачиДоВыполнения = задача.состояние
        } else {
          delete обновлённыйПункт.состояниеЗадачиДоВыполнения
        }
        const отметкаВремени = сейчас()
        await Promise.all([
          база.dayPlans.put({
            ...текущийПлан,
            пункты: текущийПлан.пункты.map((п) =>
              п.id === пункт.id ? обновлённыйПункт : п,
            ),
            updatedAt: отметкаВремени,
          }),
          база.tasks.put({
            ...задача,
            состояние: новоеСостояние ? 'сделана' : исходное!,
            выполненаВ: новоеСостояние ? отметкаВремени : null,
            updatedAt: отметкаВремени,
          }),
        ])
      })
    } else if (пункт.вид === 'привычка') {
      await база.transaction('rw', база.dayPlans, база.habits, async () => {
        const [текущийПлан, привычка] = await Promise.all([
          база.dayPlans.get(план.id),
          база.habits.get(пункт.записьId),
        ])
        const текущийПункт = текущийПлан?.пункты.find((п) => п.id === пункт.id)
        if (!текущийПлан || !текущийПункт || !привычка) return

        const отметки = { ...привычка.отметки }
        const новоеСостояние = (отметки[день] ?? 0) <= 0
        if (новоеСостояние) отметки[день] = привычка.норма || 1
        else delete отметки[день]
        const отметкаВремени = сейчас()
        await Promise.all([
          база.dayPlans.put({
            ...текущийПлан,
            пункты: текущийПлан.пункты.map((п) =>
              п.id === пункт.id ? { ...п, выполнен: новоеСостояние } : п,
            ),
            updatedAt: отметкаВремени,
          }),
          база.habits.put({
            ...привычка,
            отметки,
            updatedAt: отметкаВремени,
          }),
        ])
      })
    }
  }

  const задачиПлана = данные.задачи
  const привычкиПлана = данные.привычки

  function фактическиВыполнен(пункт: ПунктПлана): boolean {
    if (пункт.вид === 'задача') {
      return задачиПлана.some(
        (задача) => задача.id === пункт.записьId && задача.состояние === 'сделана',
      )
    }
    if (пункт.вид === 'привычка') {
      return привычкиПлана.some(
        (привычка) =>
          привычка.id === пункт.записьId && (привычка.отметки[день] ?? 0) > 0,
      )
    }
    return пункт.выполнен
  }

  const выполнено = план.пункты.filter(фактическиВыполнен).length
  const вечер = new Date().getHours() >= 18
  const фокусВыполнен = фокус ? фактическиВыполнен(фокус) : false

  return (
    <>
      <Card className="plan-surface">
        <CardHeader
          заголовок="Мой день"
          подпись={`${выполнено} из ${план.пункты.length} · план подтверждён вами`}
          действие={
            !план.чекИн ? (
              <Button
                вид="контур"
                размер="малый"
                onClick={() => установитьКонтекстОткрыт(true)}
              >
                Настроить
              </Button>
            ) : null
          }
        />
        <CardBody>
          {план.чекИн ? (
            <div className="mb-4 grid grid-cols-3 gap-2 rounded-3 border border-line bg-sunken/55 p-3">
              <div className="min-w-0">
                <span className="flex items-center gap-1 text-micro text-ink-3">
                  <Zap size={ЗНАЧОК.подпись} /> Энергия
                </span>
                <span className="mt-1 block text-meta font-medium text-ink">
                  {план.чекИн.энергия} из 5
                </span>
              </div>
              <div className="min-w-0">
                <span className="flex items-center gap-1 text-micro text-ink-3">
                  <MoonStar size={ЗНАЧОК.подпись} /> Сон
                </span>
                <span className="mt-1 block text-meta font-medium text-ink">
                  {план.чекИн.сонЧасов === null
                    ? 'не указан'
                    : `${план.чекИн.сонЧасов} ч`}
                </span>
              </div>
              <div className="min-w-0">
                <span className="flex items-center gap-1 text-micro text-ink-3">
                  <Timer size={ЗНАЧОК.подпись} /> Лимит
                </span>
                <span className="mt-1 block text-meta font-medium text-ink">
                  {план.чекИн.доступноМинут} мин
                </span>
              </div>
            </div>
          ) : null}

          <ul className="divide-y divide-line">
            {план.пункты.map((пункт) => (
              <li key={пункт.id} className="flex items-start gap-3 py-3 first:pt-0">
                {пункт.вид === 'задача' || пункт.вид === 'привычка' ? (
                  <CheckMark
                    отмечено={фактическиВыполнен(пункт)}
                    подпись={`Отметить «${пункт.заголовок}» выполненным`}
                    disabled={
                      пункт.вид === 'задача' &&
                      (задачиПлана.some(
                        (задача) =>
                          задача.id === пункт.записьId &&
                          задача.состояние === 'отменена',
                      ) ||
                        (фактическиВыполнен(пункт) &&
                          !пункт.состояниеЗадачиДоВыполнения))
                    }
                    наПереключение={() => void переключить(пункт)}
                    className="mt-0.5"
                  />
                ) : (
                  <Circle size={16} className="mt-1 shrink-0 text-ink-3" />
                )}
                <div className="min-w-0 flex-1 sm:flex sm:items-center sm:gap-2">
                  <Link
                    to={РАЗДЕЛ_ПО_ВИДУ[пункт.вид]}
                    className={cn(
                      'flex min-h-11 min-w-0 flex-1 flex-col justify-center py-0.5 hover:underline',
                      фактическиВыполнен(пункт) && 'text-ink-3',
                    )}
                  >
                    <span
                      className={cn(
                        'block text-meta leading-snug font-medium text-ink',
                        фактическиВыполнен(пункт) && 'text-ink-3 line-through',
                      )}
                    >
                      {пункт.заголовок}
                    </span>
                    <span className="mt-0.5 line-clamp-2 text-caption text-ink-3">
                      {пункт.зачем}
                      {пункт.ожидаемоМинут != null
                        ? ` · ${пункт.ожидаемоМинут} мин`
                        : ''}
                    </span>
                  </Link>
                  <Button
                    вид="тихая"
                    размер="малый"
                    иконка={<Focus size={16} />}
                    className="mt-1 shrink-0 sm:mt-0"
                    onClick={() => установитьФокус(пункт)}
                  >
                    Фокус
                  </Button>
                </div>
              </li>
            ))}
          </ul>

          {вечер ? (
            <div className="mt-4 border-t border-line pt-4">
              <p className="text-meta font-medium text-ink-2">
                Вечерний итог: {выполнено} из {план.пункты.length}
              </p>
              <p className="mt-1 text-caption leading-relaxed text-ink-3">
                Ничего не переносится автоматически. Сначала посмотрите факты и сами
                решите, что оставить на завтра.
              </p>
              <Button
                вид="контур"
                наВсюШирину
                className="mt-3"
                onClick={() => перейти('/reviews')}
              >
                Подвести итог дня
              </Button>
            </div>
          ) : null}
        </CardBody>
      </Card>

      <FocusDialog
        пункт={фокус}
        открыто={фокус !== null}
        выполнен={фокусВыполнен}
        наЗакрытие={() => установитьФокус(null)}
        наВыполнение={
          фокус &&
          !фокусВыполнен &&
          (фокус.вид === 'задача' || фокус.вид === 'привычка')
            ? async () => {
                await переключить(фокус)
                установитьФокус(null)
              }
            : null
        }
        наОткрытиеИсточника={() => {
          if (!фокус) return
          перейти(РАЗДЕЛ_ПО_ВИДУ[фокус.вид])
          установитьФокус(null)
        }}
      />

      <Dialog
        открыто={контекстОткрыт}
        наЗакрытие={() => установитьКонтекстОткрыт(false)}
        заголовок="Контекст дня"
        подпись="Дополнит существующий план, не меняя его пункты"
        ширина="узкая"
        подвал={
          <>
            <Button вид="тихая" onClick={() => установитьКонтекстОткрыт(false)}>
              Отмена
            </Button>
            <Button
              вид="основная"
              disabled={сохраняется}
              onClick={() => void сохранитьКонтекстПлана()}
            >
              {сохраняется ? 'Сохраняю…' : 'Сохранить контекст'}
            </Button>
          </>
        }
      >
        <DayCheckInFields
          энергия={энергия}
          наЭнергию={установитьЭнергию}
          сон={сон}
          наСон={(значение) => {
            установитьСон(значение)
            установитьОшибкуСна('')
          }}
          ошибкаСна={ошибкаСна}
          доступно={доступно}
          наДоступно={установитьДоступно}
        />
        <p className="mt-4 text-meta leading-relaxed text-ink-3">
          Задачи, привычки и их состояние останутся без изменений.
        </p>
      </Dialog>
    </>
  )
}

function подписьЭнергии(энергия: УровеньЭнергии): string {
  if (энергия <= 2) return 'День лучше разгрузить'
  if (энергия === 3) return 'Обычный темп'
  return 'Есть ресурс на сложное'
}
