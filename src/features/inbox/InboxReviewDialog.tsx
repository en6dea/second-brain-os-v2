import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Archive,
  ArrowRight,
  BookOpen,
  Brain,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
} from 'lucide-react'
import { сегодня } from '@/core/calendar/CalendarRu'
import type { Важность, Входящее, ДатаДень } from '@/core/db/types'
import { cn } from '@/design-system/classNames'
import {
  Button,
  Dialog,
  Field,
  Input,
  ProgressBar,
  Segmented,
  Textarea,
} from '@/design-system/components'
import { ЗНАЧОК } from '@/design-system/iconSize'

export interface ЧерновикЗадачиРазбора {
  название: string
  заметка: string
  дата: ДатаДень | null
  длительностьМинут: number | null
  важность: Важность
}

export interface ЧерновикЗаметкиРазбора {
  заголовок: string
  текст: string
}

type Назначение = 'задача' | 'знание' | 'отпустить'
type Срок = 'сегодня' | 'без даты'
type Длительность = '5' | '15' | '30' | 'неизвестно'

const СРОКИ: Array<{ ключ: Срок; подпись: string }> = [
  { ключ: 'сегодня', подпись: 'Сегодня' },
  { ключ: 'без даты', подпись: 'Без даты' },
]

const ДЛИТЕЛЬНОСТИ: Array<{
  ключ: Длительность
  подпись: string
}> = [
  { ключ: '5', подпись: '5 мин' },
  { ключ: '15', подпись: '15 мин' },
  { ключ: '30', подпись: '30 мин' },
  { ключ: 'неизвестно', подпись: 'Не знаю' },
]

const НАПРАВЛЕНИЯ: Array<{
  ключ: Назначение
  название: string
  подпись: string
  иконка: typeof ArrowRight
}> = [
  {
    ключ: 'задача',
    название: 'Действовать',
    подпись: 'выделить следующий шаг',
    иконка: ArrowRight,
  },
  {
    ключ: 'знание',
    название: 'Сохранить',
    подпись: 'оставить смысл на будущее',
    иконка: BookOpen,
  },
  {
    ключ: 'отпустить',
    название: 'Отпустить',
    подпись: 'убрать из очереди без удаления',
    иконка: Archive,
  },
]

function ПодсказкаПомощника({ назначение }: { назначение: Назначение }) {
  if (назначение === 'задача') {
    return (
      <div className="rounded-3 border border-line bg-sunken/65 p-4">
        <p className="flex items-center gap-2 text-caption font-medium text-ink-2">
          <Clock3 size={ЗНАЧОК.строка} className="text-accent" />
          Тайм-менеджер
        </p>
        <p className="mt-2 text-meta leading-relaxed text-ink-2">
          Не планируйте весь путь. Назовите одно действие, которое можно увидеть
          выполненным, и дайте ему реалистичный блок времени.
        </p>
      </div>
    )
  }

  if (назначение === 'знание') {
    return (
      <div className="rounded-3 border border-line bg-sunken/65 p-4">
        <p className="flex items-center gap-2 text-caption font-medium text-ink-2">
          <BriefcaseBusiness size={ЗНАЧОК.строка} className="text-accent" />
          Бизнес-коуч
        </p>
        <p className="mt-2 text-meta leading-relaxed text-ink-2">
          Сохраните вывод так, чтобы через месяц было понятно, зачем он нужен и в
          каком решении может помочь.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-3 border border-line bg-sunken/65 p-4">
      <p className="flex items-center gap-2 text-caption font-medium text-ink-2">
        <Brain size={ЗНАЧОК.строка} className="text-accent" />
        Психологический режим
      </p>
      <p className="mt-2 text-meta leading-relaxed text-ink-2">
        Не каждая мысль обязана становиться планом. Если она больше не поддерживает
        решение или важную для вас область, её можно убрать из очереди без
        самокритики.
      </p>
    </div>
  )
}

export function InboxReviewDialog({
  открыто,
  записи,
  наЗакрытие,
  наЗадачу,
  наЗаметку,
  наОтпустить,
}: {
  открыто: boolean
  записи: Входящее[]
  наЗакрытие: () => void
  наЗадачу: (запись: Входящее, черновик: ЧерновикЗадачиРазбора) => Promise<void>
  наЗаметку: (запись: Входящее, черновик: ЧерновикЗаметкиРазбора) => Promise<void>
  наОтпустить: (запись: Входящее) => Promise<void>
}) {
  const [идентификаторы, установитьИдентификаторы] = useState<string[]>([])
  const [пропущены, установитьПропущены] = useState<string[]>([])
  const [обработаны, установитьОбработаны] = useState<string[]>([])
  const [назначение, установитьНазначение] = useState<Назначение | null>(null)
  const [микрошаг, установитьМикрошаг] = useState('')
  const [срок, установитьСрок] = useState<Срок>('сегодня')
  const [длительность, установитьДлительность] = useState<Длительность>('5')
  const [заголовок, установитьЗаголовок] = useState('')
  const [текстЗаметки, установитьТекстЗаметки] = useState('')
  const [сохраняется, установитьСохраняется] = useState(false)
  const [ошибка, установитьОшибку] = useState('')
  const былОткрыт = useRef(false)
  const сохранениеНачалось = useRef(false)

  const поИдентификатору = useMemo(
    () => new Map(записи.map((запись) => [запись.id, запись])),
    [записи],
  )
  const текущая = идентификаторы
    .filter((id) => !пропущены.includes(id) && !обработаны.includes(id))
    .map((id) => поИдентификатору.get(id))
    .find((запись): запись is Входящее => запись !== undefined)

  useEffect(() => {
    if (открыто && !былОткрыт.current) {
      const очередь = [...записи]
        .sort((а, б) => а.createdAt.localeCompare(б.createdAt))
        .map((запись) => запись.id)
      установитьИдентификаторы(очередь)
      установитьПропущены([])
      установитьОбработаны([])
      былОткрыт.current = true
    }
    if (!открыто) былОткрыт.current = false
  }, [записи, открыто])

  useEffect(() => {
    if (!текущая) return
    установитьНазначение(null)
    установитьМикрошаг(текущая.текст)
    установитьСрок('сегодня')
    установитьДлительность('5')
    установитьЗаголовок(текущая.текст.slice(0, 80))
    установитьТекстЗаметки(текущая.текст)
    установитьОшибку('')
    установитьСохраняется(false)
    сохранениеНачалось.current = false
  }, [текущая])

  const разобрано = обработаны.length
  const всего = идентификаторы.length
  const завершено = текущая === undefined

  async function подтвердить() {
    if (!текущая || !назначение || сохранениеНачалось.current) return
    if (назначение === 'задача' && !микрошаг.trim()) return
    if (назначение === 'знание' && (!заголовок.trim() || !текстЗаметки.trim()))
      return
    сохранениеНачалось.current = true
    установитьСохраняется(true)
    установитьОшибку('')
    try {
      if (назначение === 'задача') {
        await наЗадачу(текущая, {
          название: микрошаг.trim(),
          заметка:
            микрошаг.trim() === текущая.текст.trim()
              ? ''
              : `Исходная запись: ${текущая.текст}`,
          дата: срок === 'сегодня' ? сегодня() : null,
          длительностьМинут:
            длительность === 'неизвестно' ? null : Number(длительность),
          важность: 'обычная',
        })
      } else if (назначение === 'знание') {
        await наЗаметку(текущая, {
          заголовок: заголовок.trim(),
          текст: текстЗаметки.trim(),
        })
      } else {
        await наОтпустить(текущая)
      }
      установитьОбработаны((текущие) => [...текущие, текущая.id])
    } catch {
      установитьОшибку(
        'Не удалось сохранить решение. Исходная запись не изменена — попробуйте ещё раз.',
      )
      сохранениеНачалось.current = false
    } finally {
      установитьСохраняется(false)
    }
  }

  const подтверждениеНедоступно =
    сохраняется ||
    (назначение === 'задача' && !микрошаг.trim()) ||
    (назначение === 'знание' && (!заголовок.trim() || !текстЗаметки.trim()))

  const подписьКнопки =
    назначение === 'задача'
      ? 'Создать задачу'
      : назначение === 'знание'
        ? 'Сохранить в знания'
        : 'Убрать из разбора'

  return (
    <Dialog
      открыто={открыто}
      наЗакрытие={наЗакрытие}
      заголовок="Разбор за 5 минут"
      подпись="По одной записи. Ничего не меняется без вашего подтверждения."
      ширина="широкая"
      подвал={
        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:justify-end">
          <Button вид="тихая" onClick={наЗакрытие} disabled={сохраняется}>
            Завершить позже
          </Button>
          {текущая ? (
            <Button
              вид="тихая"
              disabled={сохраняется}
              onClick={() =>
                установитьПропущены((текущие) => [...текущие, текущая.id])
              }
            >
              Пропустить
            </Button>
          ) : null}
          {текущая && назначение ? (
            <Button
              вид="основная"
              className="col-span-2 sm:col-span-1"
              disabled={подтверждениеНедоступно}
              onClick={() => void подтвердить()}
            >
              {сохраняется ? 'Сохраняю…' : подписьКнопки}
            </Button>
          ) : null}
        </div>
      }
    >
      {завершено ? (
        <div className="py-5 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-3 border border-good/30 text-good">
            <CheckCircle2 size={ЗНАЧОК.показание} />
          </span>
          <h3 className="mt-4 text-h3 font-medium text-ink">Сеанс завершён</h3>
          <p className="mx-auto mt-2 max-w-md text-meta leading-relaxed text-ink-2">
            Разобрано: {разобрано}. Пропущено без изменений: {пропущены.length}.
            Можно закрыть окно или вернуться к отложенным записям.
          </p>
          {пропущены.length > 0 ? (
            <Button
              вид="контур"
              className="mt-4"
              onClick={() => установитьПропущены([])}
            >
              Вернуться к пропущенным
            </Button>
          ) : null}
        </div>
      ) : текущая ? (
        <div>
          <ProgressBar
            значение={разобрано}
            из={Math.max(всего, 1)}
            подпись={`${разобрано} из ${всего} разобрано`}
          />

          <div className="mt-5 rounded-3 border border-line bg-raised/75 p-4 sm:p-5">
            <p className="text-caption font-medium text-ink-3">Текущая запись</p>
            <p className="mt-2 text-h3 leading-relaxed font-medium text-ink">
              {текущая.текст}
            </p>
          </div>

          <section className="mt-5">
            <h3 className="text-body font-medium text-ink">
              Что эта мысль означает сейчас?
            </h3>
            <div
              role="radiogroup"
              aria-label="Решение для входящей записи"
              className="mt-2 grid gap-2 sm:grid-cols-3"
            >
              {НАПРАВЛЕНИЯ.map((вариант) => {
                const Иконка = вариант.иконка
                return (
                  <button
                    key={вариант.ключ}
                    type="button"
                    role="radio"
                    aria-checked={назначение === вариант.ключ}
                    onClick={() => установитьНазначение(вариант.ключ)}
                    className={cn(
                      'min-h-20 rounded-3 border p-3 text-left transition-colors',
                      назначение === вариант.ключ
                        ? 'border-accent/55 bg-accent-soft text-ink'
                        : 'border-line bg-card text-ink-2 hover:border-control-line',
                    )}
                  >
                    <span className="flex items-center gap-2 text-meta font-medium">
                      <Иконка size={ЗНАЧОК.строка} />
                      {вариант.название}
                    </span>
                    <span className="mt-1 block text-caption leading-relaxed text-ink-3">
                      {вариант.подпись}
                    </span>
                  </button>
                )
              })}
            </div>
          </section>

          {назначение ? (
            <div className="mt-5 space-y-4">
              <ПодсказкаПомощника назначение={назначение} />

              {назначение === 'задача' ? (
                <>
                  <Field
                    подпись="Один видимый следующий шаг"
                    подсказка="Формулировку можно изменить до сохранения"
                    обязательное
                  >
                    <Textarea
                      rows={2}
                      maxLength={200}
                      value={микрошаг}
                      onChange={(событие) =>
                        установитьМикрошаг(событие.target.value)
                      }
                    />
                  </Field>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field подпись="Когда вернуться">
                      <Segmented
                        значения={СРОКИ}
                        выбрано={срок}
                        наВыбор={установитьСрок}
                        размер="поле"
                        ariaLabel="Дата следующего шага"
                      />
                    </Field>
                    <Field подпись="Безопасный блок времени">
                      <Segmented
                        значения={ДЛИТЕЛЬНОСТИ}
                        выбрано={длительность}
                        наВыбор={установитьДлительность}
                        размер="поле"
                        ariaLabel="Длительность следующего шага"
                      />
                    </Field>
                  </div>
                </>
              ) : null}

              {назначение === 'знание' ? (
                <>
                  <Field подпись="Заголовок" обязательное>
                    <Input
                      maxLength={80}
                      value={заголовок}
                      onChange={(событие) =>
                        установитьЗаголовок(событие.target.value)
                      }
                    />
                  </Field>
                  <Field подпись="Что важно сохранить" обязательное>
                    <Textarea
                      rows={4}
                      value={текстЗаметки}
                      onChange={(событие) =>
                        установитьТекстЗаметки(событие.target.value)
                      }
                    />
                  </Field>
                </>
              ) : null}

              {назначение === 'отпустить' ? (
                <p className="text-meta leading-relaxed text-ink-3">
                  Запись останется в базе с отметкой «разобрано». Она не превратится
                  в задачу или заметку и не будет удалена навсегда.
                </p>
              ) : null}
            </div>
          ) : null}

          {ошибка ? (
            <p role="alert" className="mt-4 text-meta leading-relaxed text-bad">
              {ошибка}
            </p>
          ) : null}
        </div>
      ) : null}
    </Dialog>
  )
}
