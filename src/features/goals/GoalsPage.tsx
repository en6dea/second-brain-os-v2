import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { Compass, Plus, Target, Trash2 } from 'lucide-react'
import { база } from '@/core/db/db'
import { SmartReview, WhereToStart } from './SmartReview'
import { новаяЗапись } from '@/core/db/repo'
import type { Цель } from '@/core/db/types'
import { деньСловами, днейДо } from '@/core/calendar/CalendarRu'
import { склонение } from '@/core/language/Plural'
import { число } from '@/core/language/Numerals'
import { useПлавноеЧисло } from '@/design-system/motion/CountUp'
import { Flash } from '@/design-system/motion/Ping'
import { новыйId, сейчас } from '@/core/db/RecordId'
import { useИнтерфейс } from '@/app/providers/ui'
import { читатьНастройки } from '@/core/db/repo'
import {
  Input,
  Select,
  Skeleton,
  Badge,
  Card,
  Button,
  IconButton,
  Dialog,
  Field,
  ProgressBar,
  Poster,
  EmptyState,
  Textarea,
  CardHeader,
  CheckMark,
} from '@/design-system/components'
import { useСигналыПоРазделам } from '@/features/signals/useSignals'
import { SignalsStrip } from '@/features/signals/SignalsStrip'
import { прогрессМиссии, следующийХодМиссии } from './model/Campaign'
import {
  GoalNextMoveDialog,
  type ЧерновикСледующегоХода,
} from './GoalNextMoveDialog'
import { ЗНАЧОК } from '@/design-system/iconSize'

/**
 * Показатель цели.
 *
 * Число оседает при изменении. В момент, когда цель впервые достигнута,
 * по строке один раз проходит свет — и больше не повторяется.
 */
function GoalMetric({
  текущее,
  целевое,
  единица,
}: {
  текущее: number
  целевое: number
  единица: string
}) {
  const достигнута = целевое > 0 && текущее >= целевое
  const былаДостигнута = useRef(достигнута)
  const [проблеск, установитьПроблеск] = useState(false)

  useEffect(() => {
    if (достигнута && !былаДостигнута.current) {
      установитьПроблеск(true)
      const таймер = setTimeout(() => установитьПроблеск(false), 1200)
      былаДостигнута.current = достигнута
      return () => clearTimeout(таймер)
    }
    былаДостигнута.current = достигнута
  }, [достигнута])

  const плавное = useПлавноеЧисло(текущее)

  return (
    <div className="relative overflow-hidden rounded-2">
      <Flash активен={проблеск} />
      <div className="mb-1.5 flex items-baseline justify-between text-caption">
        <span className="text-ink-3">
          {достигнута ? 'Цель достигнута' : 'Показатель'}
        </span>
        <span className="tnum text-ink-2">
          {число(Math.round(плавное))} / {число(целевое)} {единица}
        </span>
      </div>
      <ProgressBar
        значение={текущее}
        из={целевое}
        тон={достигнута ? 'успех' : 'нейтральный'}
      />
    </div>
  )
}

/** Заготовка для разбора черновика: у новой цели ещё нет ни одного поля. */
const ПУСТАЯ_ЦЕЛЬ: Цель = {
  id: '',
  createdAt: '',
  updatedAt: '',
  название: '',
  зачем: '',
  сфераId: null,
  состояние: 'активна',
  срок: null,
  цель: null,
  текущее: null,
  единица: '',
  порядок: 0,
  вехи: [],
  последняяАктивность: null,
  постер: '',
}

export function GoalsPage() {
  const сообщить = useИнтерфейс((с) => с.сообщить)
  const [черновик, установитьЧерновик] = useState<Partial<Цель> | null>(null)
  const [следующийХод, установитьСледующийХод] = useState<Цель | null>(null)
  const [кУдалению, установитьКУдалению] = useState<Цель | null>(null)
  const [сфераФильтр, установитьСферуФильтр] = useState('')
  const сигналы = useСигналыПоРазделам(['Цели'])

  const данные = useLiveQuery(async () => {
    const [цели, задачи, привычки, проекты, сферы, настройки] = await Promise.all([
      база.goals.toArray(),
      база.tasks.toArray(),
      база.habits.toArray(),
      база.projects.toArray(),
      база.areas.filter((сфера) => !сфера.архив).sortBy('порядок'),
      читатьНастройки(),
    ])
    return { цели, задачи, привычки, проекты, сферы, настройки }
  }, [])

  if (!данные) {
    return (
      <Card>
        <Skeleton строк={4} />
      </Card>
    )
  }

  const всеАктивные = данные.цели.filter((ц) => ц.состояние === 'активна')
  const активные = всеАктивные.filter(
    (цель) => !сфераФильтр || цель.сфераId === сфераФильтр,
  )
  const прочие = данные.цели.filter((ц) => ц.состояние !== 'активна')
  const именаСфер = new Map(данные.сферы.map((сфера) => [сфера.id, сфера.название]))
  const сРезультатом = всеАктивные.filter(
    (цель) => прогрессМиссии(цель).значение !== null,
  ).length
  const нагрузка = всеАктивные.reduce(
    (итог, цель) => {
      const ход = следующийХодМиссии(цель.id, данные.задачи)
      итог.минут += ход.минутИзвестно
      итог.безВремени += ход.задачБезВремени
      return итог
    },
    { минут: 0, безВремени: 0 },
  )

  async function сохранить() {
    if (!черновик?.название?.trim()) return
    if (черновик.id) {
      const текущая = await база.goals.get(черновик.id)
      if (текущая) {
        await база.goals.put({
          ...текущая,
          ...черновик,
          последняяАктивность: сейчас(),
          updatedAt: сейчас(),
        } as Цель)
        сообщить('Цель обновлена')
      }
    } else {
      await база.goals.add(
        новаяЗапись({
          название: черновик.название.trim(),
          зачем: черновик.зачем ?? '',
          сфераId: черновик.сфераId ?? null,
          состояние: 'активна',
          срок: черновик.срок ?? null,
          цель: черновик.цель ?? null,
          текущее: черновик.текущее ?? null,
          единица: черновик.единица ?? '',
          порядок: данные?.цели.length ?? 0,
          вехи: черновик.вехи ?? [],
          последняяАктивность: сейчас(),
          постер: черновик.постер ?? '',
        }) as never,
      )
      сообщить('Цель создана')
    }
    установитьЧерновик(null)
  }

  async function создатьСледующийХод(ход: ЧерновикСледующегоХода) {
    if (!следующийХод) return
    const цельId = следующийХод.id
    await база.transaction('rw', база.tasks, база.goals, async () => {
      await база.tasks.add(
        новаяЗапись({
          название: ход.название,
          заметка: ход.заметка,
          дата: ход.дата,
          время: null,
          длительностьМинут: ход.длительностьМинут,
          состояние: 'новая' as const,
          важность: ход.важность,
          проектId: null,
          цельId,
          сфераId: следующийХод.сфераId,
          выполненаВ: null,
          переносов: 0,
          повтор: null,
        }) as never,
      )
      const текущаяЦель = await база.goals.get(цельId)
      if (текущаяЦель) {
        await база.goals.put({
          ...текущаяЦель,
          последняяАктивность: сейчас(),
          updatedAt: сейчас(),
        })
      }
    })
    установитьСледующийХод(null)
    сообщить('Следующий ход добавлен в задачи')
  }

  async function удалитьЦель() {
    if (!кУдалению) return
    const цельId = кУдалению.id
    await база.transaction(
      'rw',
      база.goals,
      база.tasks,
      база.habits,
      база.projects,
      async () => {
        const [задачи, привычки, проекты] = await Promise.all([
          база.tasks.where('цельId').equals(цельId).toArray(),
          база.habits.where('цельId').equals(цельId).toArray(),
          база.projects.toArray(),
        ])
        const момент = сейчас()
        if (задачи.length > 0) {
          await база.tasks.bulkPut(
            задачи.map((задача) => ({
              ...задача,
              цельId: null,
              updatedAt: момент,
            })),
          )
        }
        if (привычки.length > 0) {
          await база.habits.bulkPut(
            привычки.map((привычка) => ({
              ...привычка,
              цельId: null,
              updatedAt: момент,
            })),
          )
        }
        const связанныеПроекты = проекты.filter((проект) =>
          проект.целиId.includes(цельId),
        )
        if (связанныеПроекты.length > 0) {
          await база.projects.bulkPut(
            связанныеПроекты.map((проект) => ({
              ...проект,
              целиId: проект.целиId.filter((id) => id !== цельId),
              updatedAt: момент,
            })),
          )
        }
        await база.goals.delete(цельId)
      },
    )
    установитьКУдалению(null)
    сообщить('Цель удалена. Связанные записи сохранены без привязки.')
  }

  return (
    <div className="anim-rise space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-h2 font-semibold text-ink">Цели</h1>
          <p className="mt-0.5 text-meta text-ink-3">
            Цель связывает задачи и привычки в направление
          </p>
        </div>
        <Button
          вид="основная"
          иконка={<Plus size={16} />}
          onClick={() => установитьЧерновик({})}
        >
          Цель
        </Button>
      </div>

      {сигналы && сигналы.length > 0 ? <SignalsStrip сигналы={сигналы} /> : null}

      <Card>
        <CardHeader
          заголовок={
            <span className="flex items-center gap-2.5">
              <Compass size={ЗНАЧОК.основной} className="text-accent" />
              Кампания
            </span>
          }
          подпись="Миссии продвигаются результатом и вехами, а не количеством кликов"
        />
        <div className="px-5 pb-5">
          <Field подпись="Направление" className="w-full sm:max-w-64">
            <Select
              value={сфераФильтр}
              onChange={(событие) => установитьСферуФильтр(событие.target.value)}
            >
              <option value="">Все направления</option>
              {данные.сферы.map((сфера) => (
                <option key={сфера.id} value={сфера.id}>
                  {сфера.название}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4 border-t border-line px-5 py-5 sm:grid-cols-4">
          <div>
            <p className="unit">активно</p>
            <p className="tnum mt-1 text-h3 font-medium text-ink">
              {всеАктивные.length}
            </p>
            <p className="text-caption text-ink-3">миссий</p>
          </div>
          <div>
            <p className="unit">результат виден</p>
            <p className="tnum mt-1 text-h3 font-medium text-ink">
              {сРезультатом}/{всеАктивные.length}
            </p>
            <p className="text-caption text-ink-3">по числу или вехам</p>
          </div>
          <div>
            <p className="unit">нагрузка</p>
            <p className="tnum mt-1 text-h3 font-medium text-ink">
              {нагрузка.минут} мин
            </p>
            <p className="text-caption text-ink-3">из известных оценок</p>
          </div>
          <div>
            <p className="unit">неизвестно</p>
            <p className="tnum mt-1 text-h3 font-medium text-ink">
              {нагрузка.безВремени}
            </p>
            <p className="text-caption text-ink-3">задач без времени</p>
          </div>
        </div>
      </Card>

      <WhereToStart цели={всеАктивные} наПравку={установитьЧерновик} />

      {активные.length === 0 ? (
        <Card>
          <EmptyState
            иконка={<Target size={20} />}
            заголовок="Активных целей нет"
            подпись="Без цели задачи превращаются в поток дел без направления. Сформулируйте одну — с ответом на вопрос «зачем»."
            действие={
              <Button вид="контур" onClick={() => установитьЧерновик({})}>
                Создать первую цель
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {активные.map((цель) => {
            const задачиЦели = данные.задачи.filter((з) => з.цельId === цель.id)
            const сделано = задачиЦели.filter(
              (з) => з.состояние === 'сделана',
            ).length
            const привычкиЦели = данные.привычки.filter((п) => п.цельId === цель.id)
            const дней = днейДо(цель.срок)
            const прогресс = прогрессМиссии(цель)
            const ход = следующийХодМиссии(цель.id, данные.задачи)

            return (
              <Card key={цель.id}>
                <CardHeader
                  заголовок={
                    <span className="flex items-center gap-2.5">
                      {цель.постер ? (
                        <Poster
                          адрес={цель.постер}
                          подпись={цель.название}
                          размер="значок"
                          показывать={данные.настройки.показыватьПостеры !== false}
                        />
                      ) : null}
                      <span className="min-w-0 truncate">{цель.название}</span>
                    </span>
                  }
                  подпись={цель.зачем || 'Ответ на вопрос «зачем» не записан'}
                  действие={
                    <div className="flex gap-0.5">
                      <IconButton
                        подпись="Изменить цель"
                        onClick={() => установитьЧерновик(цель)}
                      >
                        <span className="text-meta">✎</span>
                      </IconButton>
                      <IconButton
                        подпись="Удалить цель"
                        onClick={() => установитьКУдалению(цель)}
                      >
                        <Trash2 size={15} />
                      </IconButton>
                    </div>
                  }
                />
                <div className="space-y-3 px-5 pb-5">
                  <div className="flex flex-wrap gap-1.5">
                    <Badge тон="сведения">
                      {цель.сфераId
                        ? (именаСфер.get(цель.сфераId) ?? 'Направление удалено')
                        : 'Без направления'}
                    </Badge>
                  </div>

                  {прогресс.источник === 'показатель' ? (
                    <GoalMetric
                      текущее={цель.текущее ?? 0}
                      целевое={цель.цель ?? 1}
                      единица={цель.единица}
                    />
                  ) : прогресс.источник === 'вехи' ? (
                    <ProgressBar
                      значение={прогресс.выполнено}
                      из={прогресс.всего}
                      подпись={`Вехи · ${прогресс.выполнено} из ${прогресс.всего}`}
                      тон={прогресс.значение === 100 ? 'успех' : 'нейтральный'}
                    />
                  ) : (
                    <p className="text-caption text-ink-3">
                      Результат пока не определён числом или вехами — процент не
                      придумывается.
                    </p>
                  )}

                  <div className="flex flex-wrap gap-1.5">
                    <Badge>
                      Задачи: {сделано}/{задачиЦели.length}
                    </Badge>
                    <Badge>Привычки: {привычкиЦели.length}</Badge>
                    <Badge>
                      Нагрузка: {ход.минутИзвестно} мин
                      {ход.задачБезВремени > 0
                        ? ` · без оценки ${ход.задачБезВремени}`
                        : ''}
                    </Badge>
                    {цель.срок ? (
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
                          ? `просрочена на ${Math.abs(дней)} ${склонение(Math.abs(дней), 'день', 'дня', 'дней')}`
                          : `до ${деньСловами(цель.срок)}`}
                      </Badge>
                    ) : (
                      <Badge>без срока</Badge>
                    )}
                  </div>

                  {задачиЦели.length === 0 && привычкиЦели.length === 0 ? (
                    <p className="rounded-2 bg-warn-soft px-3 py-2 text-caption text-warn">
                      У цели нет ни одной задачи и ни одной привычки. Пока это
                      только намерение.
                    </p>
                  ) : null}

                  <div className="rounded-3 border border-line bg-sunken px-3 py-3">
                    <p className="text-micro font-semibold tracking-[0.12em] text-ink-3 uppercase">
                      Следующий ход
                    </p>
                    {ход.задача ? (
                      <Link
                        to="/tasks"
                        className="mt-1 block text-meta font-medium text-ink hover:text-accent"
                      >
                        {ход.задача.название}
                        <span className="ml-1 text-caption font-normal text-ink-3">
                          {ход.задача.длительностьМинут === null
                            ? '· время не указано'
                            : `· ${ход.задача.длительностьМинут} мин`}
                        </span>
                      </Link>
                    ) : (
                      <p className="mt-1 text-caption text-ink-3">
                        Нет открытой связанной задачи. Миссия пока не встроена в
                        день.
                      </p>
                    )}
                    <Button
                      вид="контур"
                      размер="малый"
                      className="mt-3"
                      onClick={() => установитьСледующийХод(цель)}
                    >
                      Запланировать ход
                    </Button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {прочие.length > 0 ? (
        <Card>
          <CardHeader заголовок="Завершённые и отложенные" />
          <div className="divide-y divide-line border-t border-line">
            {прочие.map((цель) => (
              <button
                key={цель.id}
                type="button"
                onClick={() => установитьЧерновик(цель)}
                className="flex w-full items-center justify-between px-5 py-3 text-left hover:bg-hover"
              >
                <span className="truncate text-meta text-ink-2">
                  {цель.название}
                </span>
                <Badge
                  тон={цель.состояние === 'достигнута' ? 'успех' : 'нейтральный'}
                >
                  {цель.состояние}
                </Badge>
              </button>
            ))}
          </div>
        </Card>
      ) : null}

      <Dialog
        открыто={черновик !== null}
        наЗакрытие={() => установитьЧерновик(null)}
        заголовок={черновик?.id ? 'Изменить цель' : 'Новая цель'}
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
            <SmartReview
              цель={
                {
                  ...ПУСТАЯ_ЦЕЛЬ,
                  ...черновик,
                } as Цель
              }
            />
            <Field подпись="Чего вы хотите достичь" обязательное>
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
            <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
              <Field
                подпись="Картинка цели по адресу"
                подсказка="Чтобы цель была перед глазами. Грузится с чужого сервера"
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
                размер="значок"
                показывать={данные.настройки.показыватьПостеры !== false}
              />
            </div>
            <Field
              подпись="Зачем это нужно"
              подсказка="Цель без ответа «зачем» первой теряет силу"
            >
              <Textarea
                rows={3}
                value={черновик.зачем ?? ''}
                onChange={(событие) =>
                  установитьЧерновик({ ...черновик, зачем: событие.target.value })
                }
              />
            </Field>
            <Field
              подпись="Направление жизни"
              подсказка="Категории берутся из ваших сфер и не назначаются автоматически"
            >
              <Select
                value={черновик.сфераId ?? ''}
                onChange={(событие) =>
                  установитьЧерновик({
                    ...черновик,
                    сфераId: событие.target.value || null,
                  })
                }
              >
                <option value="">Без направления</option>
                {данные.сферы.map((сфера) => (
                  <option key={сфера.id} value={сфера.id}>
                    {сфера.название}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field подпись="Цель (число)">
                <Input
                  type="number"
                  value={черновик.цель ?? ''}
                  onChange={(событие) =>
                    установитьЧерновик({
                      ...черновик,
                      цель:
                        событие.target.value === ''
                          ? null
                          : Number(событие.target.value),
                    })
                  }
                  placeholder="не задано"
                />
              </Field>
              <Field подпись="Сейчас">
                <Input
                  type="number"
                  value={черновик.текущее ?? ''}
                  onChange={(событие) =>
                    установитьЧерновик({
                      ...черновик,
                      текущее:
                        событие.target.value === ''
                          ? null
                          : Number(событие.target.value),
                    })
                  }
                />
              </Field>
              <Field подпись="Единица">
                <Input
                  value={черновик.единица ?? ''}
                  onChange={(событие) =>
                    установитьЧерновик({
                      ...черновик,
                      единица: событие.target.value,
                    })
                  }
                  placeholder="кг, часов, ₽"
                />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field подпись="Срок">
                <Input
                  type="date"
                  value={черновик.срок ?? ''}
                  onChange={(событие) =>
                    установитьЧерновик({
                      ...черновик,
                      срок: событие.target.value || null,
                    })
                  }
                />
              </Field>
              {черновик.id ? (
                <Field подпись="Состояние">
                  <Select
                    value={черновик.состояние ?? 'активна'}
                    onChange={(событие) =>
                      установитьЧерновик({
                        ...черновик,
                        состояние: событие.target.value as Цель['состояние'],
                      })
                    }
                  >
                    <option value="активна">Активна</option>
                    <option value="достигнута">Достигнута</option>
                    <option value="отложена">Отложена</option>
                    <option value="отменена">Отменена</option>
                  </Select>
                </Field>
              ) : null}
            </div>
            <Field
              подпись="Вехи"
              подсказка="Проверяемые шаги к цели — по ним «Что делать сейчас» находит ближайший"
            >
              <div className="space-y-2">
                {(черновик.вехи ?? []).map((веха) => (
                  <div key={веха.id} className="flex flex-wrap items-center gap-2">
                    <CheckMark
                      отмечено={веха.выполнена}
                      подпись={
                        веха.выполнена ? 'Вернуть в работу' : 'Отметить выполненной'
                      }
                      наПереключение={() =>
                        установитьЧерновик({
                          ...черновик,
                          вехи: (черновик.вехи ?? []).map((в) =>
                            в.id === веха.id
                              ? { ...в, выполнена: !в.выполнена }
                              : в,
                          ),
                        })
                      }
                    />
                    <Input
                      value={веха.название}
                      placeholder="Что должно случиться"
                      onChange={(событие) =>
                        установитьЧерновик({
                          ...черновик,
                          вехи: (черновик.вехи ?? []).map((в) =>
                            в.id === веха.id
                              ? { ...в, название: событие.target.value }
                              : в,
                          ),
                        })
                      }
                      className="min-w-0 flex-1"
                    />
                    <Input
                      type="date"
                      value={веха.срок ?? ''}
                      onChange={(событие) =>
                        установитьЧерновик({
                          ...черновик,
                          вехи: (черновик.вехи ?? []).map((в) =>
                            в.id === веха.id
                              ? { ...в, срок: событие.target.value || null }
                              : в,
                          ),
                        })
                      }
                      className="w-40"
                    />
                    <IconButton
                      подпись="Удалить веху"
                      onClick={() =>
                        установитьЧерновик({
                          ...черновик,
                          вехи: (черновик.вехи ?? []).filter(
                            (в) => в.id !== веха.id,
                          ),
                        })
                      }
                    >
                      <Trash2 size={15} />
                    </IconButton>
                  </div>
                ))}
                <Button
                  вид="обычная"
                  размер="малый"
                  иконка={<Plus size={14} />}
                  onClick={() =>
                    установитьЧерновик({
                      ...черновик,
                      вехи: [
                        ...(черновик.вехи ?? []),
                        {
                          id: новыйId(),
                          название: '',
                          срок: null,
                          выполнена: false,
                        },
                      ],
                    })
                  }
                >
                  Добавить веху
                </Button>
              </div>
            </Field>
          </div>
        ) : null}
      </Dialog>

      <GoalNextMoveDialog
        цель={следующийХод}
        наЗакрытие={() => установитьСледующийХод(null)}
        наПодтверждение={создатьСледующийХод}
      />

      <Dialog
        открыто={кУдалению !== null}
        наЗакрытие={() => установитьКУдалению(null)}
        заголовок="Удалить цель?"
        подпись={кУдалению?.название}
        подвал={
          <>
            <Button вид="тихая" onClick={() => установитьКУдалению(null)}>
              Оставить
            </Button>
            <Button вид="опасная" onClick={удалитьЦель}>
              Удалить
            </Button>
          </>
        }
      >
        <p className="text-body leading-relaxed text-ink-2">
          Задачи, привычки и проекты не удалятся: приложение снимет с них связь с
          целью. Это действие выполняется только после этого подтверждения.
        </p>
      </Dialog>
    </div>
  )
}
