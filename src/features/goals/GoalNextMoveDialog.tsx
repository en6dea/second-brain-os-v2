import { useEffect, useRef, useState } from 'react'
import type { Важность, ДатаДень, Цель } from '@/core/db/types'
import { сегодня } from '@/core/calendar/CalendarRu'
import {
  Button,
  Dialog,
  Field,
  Input,
  Select,
  Textarea,
} from '@/design-system/components'

export interface ЧерновикСледующегоХода {
  название: string
  заметка: string
  дата: ДатаДень | null
  длительностьМинут: number | null
  важность: Важность
}

export function GoalNextMoveDialog({
  цель,
  предложение,
  наЗакрытие,
  наПодтверждение,
}: {
  цель: Цель | null
  предложение?: Partial<ЧерновикСледующегоХода> | null
  наЗакрытие: () => void
  наПодтверждение: (черновик: ЧерновикСледующегоХода) => Promise<void> | void
}) {
  const [название, установитьНазвание] = useState('')
  const [заметка, установитьЗаметку] = useState('')
  const [дата, установитьДату] = useState<ДатаДень | ''>(сегодня())
  const [минуты, установитьМинуты] = useState('25')
  const [важность, установитьВажность] = useState<Важность>('обычная')
  const [сохраняется, установитьСохраняется] = useState(false)
  const [ошибка, установитьОшибку] = useState('')
  const сохранениеНачалось = useRef(false)

  useEffect(() => {
    if (!цель) return
    const перваяВеха = цель.вехи.find((веха) => !веха.выполнена)
    установитьНазвание(предложение?.название ?? перваяВеха?.название ?? '')
    установитьЗаметку(предложение?.заметка ?? '')
    установитьДату(предложение?.дата ?? сегодня())
    установитьМинуты(
      предложение?.длительностьМинут === null
        ? ''
        : String(предложение?.длительностьМинут ?? 25),
    )
    установитьВажность(предложение?.важность ?? 'обычная')
    установитьОшибку('')
    установитьСохраняется(false)
    сохранениеНачалось.current = false
  }, [цель, предложение])

  async function подтвердить() {
    if (сохранениеНачалось.current) return
    const числоМинут = минуты.trim() === '' ? null : Number(минуты)
    if (!название.trim()) return
    if (
      числоМинут !== null &&
      (!Number.isInteger(числоМинут) || числоМинут < 5 || числоМинут > 480)
    ) {
      установитьОшибку('Укажите от 5 до 480 минут или оставьте поле пустым')
      return
    }

    сохранениеНачалось.current = true
    установитьСохраняется(true)
    try {
      await наПодтверждение({
        название: название.trim(),
        заметка: заметка.trim(),
        дата: дата || null,
        длительностьМинут: числоМинут,
        важность,
      })
    } catch (ошибкаСохранения) {
      установитьОшибку(
        ошибкаСохранения instanceof Error
          ? ошибкаСохранения.message
          : 'Не удалось создать задачу',
      )
      сохранениеНачалось.current = false
    } finally {
      установитьСохраняется(false)
    }
  }

  return (
    <Dialog
      открыто={цель !== null}
      наЗакрытие={наЗакрытие}
      заголовок="Следующий ход"
      подпись={цель ? `Миссия: ${цель.название}` : undefined}
      подвал={
        <>
          <Button вид="тихая" onClick={наЗакрытие} disabled={сохраняется}>
            Отмена
          </Button>
          <Button
            вид="основная"
            onClick={подтвердить}
            disabled={!название.trim() || сохраняется}
          >
            {сохраняется ? 'Сохраняю…' : 'Создать задачу'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="rounded-3 border border-accent-line bg-accent-soft px-4 py-3 text-meta text-ink-2">
          Один физический шаг на один блок времени. В данные он попадёт только после
          подтверждения.
        </p>
        <Field подпись="Что конкретно сделать" обязательное>
          <Input
            value={название}
            onChange={(событие) => установитьНазвание(событие.target.value)}
            autoFocus
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field подпись="Когда">
            <Input
              type="date"
              value={дата}
              onChange={(событие) => установитьДату(событие.target.value)}
            />
          </Field>
          <Field подпись="Минут" подсказка="Пусто — пока неизвестно">
            <Input
              type="number"
              min={5}
              max={480}
              step={5}
              value={минуты}
              onChange={(событие) => {
                установитьМинуты(событие.target.value)
                установитьОшибку('')
              }}
            />
          </Field>
          <Field подпись="Важность">
            <Select
              value={важность}
              onChange={(событие) =>
                установитьВажность(событие.target.value as Важность)
              }
            >
              <option value="низкая">Низкая</option>
              <option value="обычная">Обычная</option>
              <option value="высокая">Высокая</option>
              <option value="срочная">Срочная</option>
            </Select>
          </Field>
        </div>
        {ошибка ? <p className="text-caption text-bad">{ошибка}</p> : null}
        <Field подпись="Заметка">
          <Textarea
            rows={2}
            value={заметка}
            onChange={(событие) => установитьЗаметку(событие.target.value)}
          />
        </Field>
      </div>
    </Dialog>
  )
}
