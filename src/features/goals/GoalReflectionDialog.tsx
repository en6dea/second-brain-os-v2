import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Brain, BriefcaseBusiness, Clock3, Sparkles } from 'lucide-react'
import type { Задача, ПульсЦели, Цель } from '@/core/db/types'
import { деньКратко, сегодня } from '@/core/calendar/CalendarRu'
import { ключПериодаОбзора } from '@/core/reviews/Period'
import { число } from '@/core/language/Numerals'
import {
  Button,
  CheckMark,
  Dialog,
  Field,
  Input,
  Textarea,
} from '@/design-system/components'
import { cn } from '@/design-system/classNames'
import { ЗНАЧОК } from '@/design-system/iconSize'
import {
  type ЧерновикРефлексииЦели,
  рефлексияЦелиЗаПериод,
  советПоЦели,
} from './model/Reflection'

const ПУЛЬС: { ключ: ПульсЦели; подпись: string; пояснение: string }[] = [
  { ключ: 'движется', подпись: 'Движется', пояснение: 'есть заметный результат' },
  { ключ: 'застряла', подпись: 'Застряла', пояснение: 'движение остановилось' },
  {
    ключ: 'пересмотреть',
    подпись: 'Пересмотреть',
    пояснение: 'проверить смысл или формат',
  },
]

export interface СохранениеРефлексииЦели {
  черновик: ЧерновикРефлексииЦели
  подготовитьЗадачу: boolean
}

export function GoalReflectionDialog({
  цель,
  задачи,
  наЗакрытие,
  наПодтверждение,
}: {
  цель: Цель | null
  задачи: Задача[]
  наЗакрытие: () => void
  наПодтверждение: (сохранение: СохранениеРефлексииЦели) => Promise<void> | void
}) {
  const [пульс, установитьПульс] = useState<ПульсЦели | null>(null)
  const [победа, установитьПобеду] = useState('')
  const [препятствие, установитьПрепятствие] = useState('')
  const [вывод, установитьВывод] = useState('')
  const [следующийШаг, установитьСледующийШаг] = useState('')
  const [значение, установитьЗначение] = useState('')
  const [подготовитьЗадачу, установитьПодготовитьЗадачу] = useState(false)
  const [сохраняется, установитьСохраняется] = useState(false)
  const [ошибка, установитьОшибку] = useState('')
  const сохранениеНачалось = useRef(false)
  const период = ключПериодаОбзора('неделя', сегодня())

  useEffect(() => {
    if (!цель) return
    const текущая = рефлексияЦелиЗаПериод(цель, период)
    установитьПульс(текущая?.пульс ?? null)
    установитьПобеду(текущая?.победа ?? '')
    установитьПрепятствие(текущая?.препятствие ?? '')
    установитьВывод(текущая?.вывод ?? '')
    установитьСледующийШаг(текущая?.следующийШаг ?? '')
    установитьЗначение(цель.текущее === null ? '' : String(цель.текущее))
    установитьПодготовитьЗадачу(false)
    установитьСохраняется(false)
    установитьОшибку('')
    сохранениеНачалось.current = false
  }, [цель, период])

  const совет = useMemo(
    () =>
      цель && пульс ? советПоЦели({ цель, задачи, пульс, день: сегодня() }) : null,
    [задачи, пульс, цель],
  )

  async function сохранить() {
    if (!цель || !пульс || сохранениеНачалось.current) return
    const числоПрогресса = значение.trim() === '' ? null : Number(значение)
    if (
      числоПрогресса !== null &&
      (!Number.isFinite(числоПрогресса) || числоПрогресса < 0)
    ) {
      установитьОшибку('Показатель должен быть положительным числом или нулём')
      return
    }
    if (подготовитьЗадачу && !следующийШаг.trim()) {
      установитьОшибку('Сначала сформулируйте следующий шаг')
      return
    }

    сохранениеНачалось.current = true
    установитьСохраняется(true)
    установитьОшибку('')
    try {
      await наПодтверждение({
        черновик: {
          период,
          пульс,
          победа,
          препятствие,
          вывод,
          следующийШаг,
          значение: числоПрогресса,
        },
        подготовитьЗадачу,
      })
    } catch (ошибкаСохранения) {
      установитьОшибку(
        ошибкаСохранения instanceof Error
          ? ошибкаСохранения.message
          : 'Не удалось сохранить рефлексию',
      )
      сохранениеНачалось.current = false
      установитьСохраняется(false)
    }
  }

  const история = [...(цель?.историяПрогресса ?? [])]
    .sort((а, б) => б.createdAt.localeCompare(а.createdAt))
    .slice(0, 4)
  const естьПоказатель = Boolean(цель?.цель !== null && (цель?.цель ?? 0) > 0)

  return (
    <Dialog
      открыто={цель !== null}
      наЗакрытие={наЗакрытие}
      заголовок="Пульс цели"
      подпись={цель ? `${цель.название} · рефлексия недели` : undefined}
      ширина="широкая"
      подвал={
        <>
          <Button вид="тихая" onClick={наЗакрытие} disabled={сохраняется}>
            Отмена
          </Button>
          <Button
            вид="основная"
            onClick={сохранить}
            disabled={!пульс || сохраняется}
          >
            {сохраняется ? 'Сохраняю…' : 'Сохранить рефлексию'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <section>
          <p className="text-meta font-medium text-ink">Как движется цель?</p>
          <p className="mt-0.5 text-caption text-ink-3">
            Статус выбираете вы. Приложение не ставит диагноз по активности.
          </p>
          <div
            className="mt-3 grid gap-2 sm:grid-cols-3"
            role="radiogroup"
            aria-label="Пульс цели"
          >
            {ПУЛЬС.map((вариант) => (
              <button
                key={вариант.ключ}
                type="button"
                role="radio"
                aria-checked={пульс === вариант.ключ}
                onClick={() => {
                  установитьПульс(вариант.ключ)
                  установитьОшибку('')
                }}
                className={cn(
                  'min-h-18 rounded-3 border px-3 py-3 text-left transition-colors',
                  пульс === вариант.ключ
                    ? 'border-accent-line bg-accent-soft'
                    : 'border-line bg-sunken hover:bg-hover',
                )}
              >
                <span className="block text-meta font-medium text-ink">
                  {вариант.подпись}
                </span>
                <span className="mt-0.5 block text-caption text-ink-3">
                  {вариант.пояснение}
                </span>
              </button>
            ))}
          </div>
        </section>

        {совет ? (
          <section className="rounded-4 border border-accent-line bg-accent-soft/55 p-4">
            <div className="flex items-start gap-3">
              <Sparkles
                size={ЗНАЧОК.основной}
                className="mt-0.5 shrink-0 text-accent"
              />
              <div className="min-w-0">
                <p className="text-meta font-medium text-ink">Разбор по фактам</p>
                <p className="mt-0.5 text-caption text-ink-3">{совет.основание}</p>
              </div>
            </div>
            <div className="mt-4 grid gap-3 lg:grid-cols-3">
              <RoleAdvice
                иконка={<Brain size={ЗНАЧОК.строка} />}
                роль="Психолог"
                текст={совет.психолог}
              />
              <RoleAdvice
                иконка={<BriefcaseBusiness size={ЗНАЧОК.строка} />}
                роль="Бизнес-коуч"
                текст={совет.бизнесКоуч}
              />
              <RoleAdvice
                иконка={<Clock3 size={ЗНАЧОК.строка} />}
                роль="Тайм-менеджер"
                текст={совет.таймМенеджер}
              />
            </div>
          </section>
        ) : null}

        {естьПоказатель ? (
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
            <Field
              подпись="Текущий факт"
              подсказка={`Цель: ${число(цель?.цель ?? 0)} ${цель?.единица ?? ''}`}
            >
              <Input
                type="number"
                min={0}
                value={значение}
                onChange={(событие) => {
                  установитьЗначение(событие.target.value)
                  установитьОшибку('')
                }}
              />
            </Field>
            <div className="rounded-3 border border-line bg-sunken px-3 py-3">
              <p className="text-caption font-medium text-ink-2">
                История прогресса
              </p>
              {история.length === 0 ? (
                <p className="mt-1 text-caption text-ink-3">
                  Первый подтверждённый замер станет точкой отсчёта.
                </p>
              ) : (
                <div className="mt-2 flex flex-wrap gap-2">
                  {история.map((запись) => (
                    <span
                      key={запись.id}
                      className="rounded-2 border border-line bg-raised px-2.5 py-1 text-caption text-ink-2"
                    >
                      {деньКратко(запись.createdAt.slice(0, 10))} ·{' '}
                      {запись.значение === null ? '—' : число(запись.значение)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field подпись="Что получилось">
            <Textarea
              rows={3}
              value={победа}
              onChange={(событие) => установитьПобеду(событие.target.value)}
              placeholder="Конкретный факт, даже если он небольшой"
            />
          </Field>
          <Field подпись="Что мешало">
            <Textarea
              rows={3}
              value={препятствие}
              onChange={(событие) => установитьПрепятствие(событие.target.value)}
              placeholder="Не оценка себя, а препятствие"
            />
          </Field>
        </div>
        <Field
          подпись="Вывод"
          подсказка="Что вы поняли о цели или способе движения"
        >
          <Textarea
            rows={2}
            value={вывод}
            onChange={(событие) => установитьВывод(событие.target.value)}
          />
        </Field>
        <Field
          подпись="Решение на неделю"
          подсказка="Один физический шаг, который можно поставить в календарь"
        >
          <Textarea
            rows={2}
            value={следующийШаг}
            onChange={(событие) => {
              установитьСледующийШаг(событие.target.value)
              if (!событие.target.value.trim()) установитьПодготовитьЗадачу(false)
              установитьОшибку('')
            }}
          />
        </Field>

        <div className="flex items-center gap-2 rounded-3 border border-line bg-sunken px-2.5 py-2">
          <CheckMark
            отмечено={подготовитьЗадачу}
            подпись={
              подготовитьЗадачу
                ? 'Не подготавливать задачу после сохранения'
                : 'Подготовить задачу после сохранения'
            }
            disabled={!следующийШаг.trim()}
            наПереключение={() =>
              установитьПодготовитьЗадачу((значение) => !значение)
            }
          />
          <div>
            <p className="text-meta font-medium text-ink">
              После сохранения подготовить задачу
            </p>
            <p className="text-caption text-ink-3">
              Откроется отдельный предпросмотр. Задача не создастся без второго
              подтверждения.
            </p>
          </div>
        </div>

        {ошибка ? (
          <p role="alert" className="text-caption text-bad">
            {ошибка}
          </p>
        ) : null}
      </div>
    </Dialog>
  )
}

function RoleAdvice({
  иконка,
  роль,
  текст,
}: {
  иконка: ReactNode
  роль: string
  текст: string
}) {
  return (
    <div className="rounded-3 border border-line/80 bg-raised/75 px-3 py-3">
      <div className="flex items-center gap-2 text-caption font-medium text-ink-2">
        <span className="text-accent">{иконка}</span>
        {роль}
      </div>
      <p className="mt-2 text-caption leading-relaxed text-ink-3">{текст}</p>
    </div>
  )
}
