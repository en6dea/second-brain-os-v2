import { useEffect, useState } from 'react'
import { BriefcaseBusiness, Brain, Clock3, Sparkles } from 'lucide-react'
import type {
  ВосстановлениеПривычки,
  ПричинаСрываПривычки,
  Привычка,
  РольПомощника,
} from '@/core/db/types'
import {
  Button,
  Dialog,
  Field,
  Segmented,
  Textarea,
} from '@/design-system/components'
import { cn } from '@/design-system/classNames'
import { ЗНАЧОК } from '@/design-system/iconSize'
import { советВосстановления } from './model/Recovery'

const ПРИЧИНЫ: Array<{ ключ: ПричинаСрываПривычки; подпись: string }> = [
  { ключ: 'слишком сложно', подпись: 'Планка слишком высокая' },
  { ключ: 'нет опоры', подпись: 'Нет понятного триггера' },
  { ключ: 'нет сил', подпись: 'Сейчас мало сил' },
  { ключ: 'изменился день', подпись: 'Изменился ритм дня' },
  { ключ: 'потерял смысл', подпись: 'Не вижу смысла' },
]

const МИНУТЫ: Array<{ ключ: '2' | '5' | '10'; подпись: string }> = [
  { ключ: '2', подпись: '2 мин' },
  { ключ: '5', подпись: '5 мин' },
  { ключ: '10', подпись: '10 мин' },
]

function ЗначокРоли({ роль }: { роль: РольПомощника }) {
  if (роль === 'психолог') return <Brain size={ЗНАЧОК.строка} />
  if (роль === 'бизнес-коуч') return <BriefcaseBusiness size={ЗНАЧОК.строка} />
  return <Clock3 size={ЗНАЧОК.строка} />
}

export function HabitRecoveryDialog({
  привычка,
  отметокЗаНеделю,
  наЗакрытие,
  наПодтверждение,
}: {
  привычка: Привычка | null
  отметокЗаНеделю: number
  наЗакрытие: () => void
  наПодтверждение: (
    привычка: Привычка,
    восстановление: Omit<ВосстановлениеПривычки, 'id' | 'createdAt'>,
  ) => Promise<void>
}) {
  const [причина, установитьПричину] = useState<ПричинаСрываПривычки | null>(null)
  const [микрошаг, установитьМикрошаг] = useState('')
  const [минуты, установитьМинуты] = useState<'2' | '5' | '10'>('5')
  const [заметка, установитьЗаметку] = useState('')
  const [сохраняется, установитьСохраняется] = useState(false)
  const [ошибка, установитьОшибку] = useState('')

  useEffect(() => {
    if (!привычка) return
    установитьПричину(null)
    установитьМикрошаг('')
    установитьМинуты('5')
    установитьЗаметку('')
    установитьСохраняется(false)
    установитьОшибку('')
  }, [привычка])

  if (!привычка) return null

  const выбраннаяПривычка = привычка
  const совет = причина ? советВосстановления(причина, привычка.название) : null

  function выбратьПричину(следующая: ПричинаСрываПривычки) {
    const следующийСовет = советВосстановления(следующая, привычка!.название)
    установитьПричину(следующая)
    установитьМикрошаг(следующийСовет.микрошаг)
    установитьМинуты(String(следующийСовет.минут) as '2' | '5' | '10')
    установитьОшибку('')
  }

  async function сохранить() {
    if (!причина || !совет || !микрошаг.trim() || сохраняется) return
    установитьСохраняется(true)
    установитьОшибку('')
    try {
      await наПодтверждение(выбраннаяПривычка, {
        причина,
        роль: совет.роль,
        микрошаг: микрошаг.trim(),
        минут: Number(минуты) as 2 | 5 | 10,
        заметка: заметка.trim(),
      })
    } catch {
      установитьОшибку(
        'Не удалось сохранить план. Отметки привычки не изменены — попробуйте ещё раз.',
      )
    } finally {
      установитьСохраняется(false)
    }
  }

  return (
    <Dialog
      открыто
      наЗакрытие={наЗакрытие}
      заголовок="Вернуться в ритм"
      подпись={`«${привычка.название}»: ${отметокЗаНеделю} отметок за последние 7 дней`}
      ширина="средняя"
      подвал={
        <>
          <Button вид="тихая" onClick={наЗакрытие}>
            Отмена
          </Button>
          <Button
            вид="основная"
            disabled={!причина || !микрошаг.trim() || сохраняется}
            onClick={() => void сохранить()}
          >
            {сохраняется ? 'Сохраняю…' : 'Сохранить план возвращения'}
          </Button>
        </>
      }
    >
      <div className="rounded-3 border border-line bg-sunken/65 p-4">
        <div className="flex items-center gap-2 text-caption font-medium text-accent">
          <Sparkles size={ЗНАЧОК.строка} />
          Без обнуления и самокритики
        </div>
        <p className="mt-2 text-meta leading-relaxed text-ink-2">
          Пропуск уже случился — здесь не нужно его исправлять задним числом.
          Выберите реальное препятствие и подготовьте одно выполнимое возвращение.
        </p>
      </div>

      <section className="mt-4">
        <p className="text-body font-medium text-ink">Что помешало?</p>
        <div
          role="radiogroup"
          aria-label="Причина, почему привычка сорвалась"
          className="mt-2 grid gap-2 sm:grid-cols-2"
        >
          {ПРИЧИНЫ.map((вариант) => (
            <button
              key={вариант.ключ}
              type="button"
              role="radio"
              aria-checked={причина === вариант.ключ}
              onClick={() => выбратьПричину(вариант.ключ)}
              className={cn(
                'min-h-11 rounded-2 border px-3 py-2 text-left text-meta transition-colors',
                причина === вариант.ключ
                  ? 'border-accent/55 bg-accent-soft text-ink'
                  : 'border-line bg-card text-ink-2 hover:border-control-line',
              )}
            >
              {вариант.подпись}
            </button>
          ))}
        </div>
      </section>

      {совет ? (
        <div className="mt-4 rounded-3 border border-line bg-raised/70 p-4">
          <div className="flex items-center gap-2 text-caption font-medium text-ink-2">
            <span className="text-accent">
              <ЗначокРоли роль={совет.роль} />
            </span>
            Режим: {совет.роль}
          </div>
          <p className="mt-2 text-meta leading-relaxed text-ink-2">
            {совет.поддержка}
          </p>
          <p className="mt-3 text-meta font-medium leading-relaxed text-ink">
            {совет.вопрос}
          </p>
        </div>
      ) : null}

      <div className="mt-4 space-y-4">
        <Field подпись="Минимальное возвращение" обязательное>
          <Textarea
            rows={2}
            maxLength={240}
            value={микрошаг}
            disabled={!причина}
            placeholder="Сначала выберите препятствие"
            onChange={(событие) => установитьМикрошаг(событие.target.value)}
          />
        </Field>
        <Field подпись="Безопасный блок">
          <Segmented
            значения={МИНУТЫ}
            выбрано={минуты}
            наВыбор={установитьМинуты}
            размер="поле"
            ariaLabel="Длина минимального возвращения"
          />
        </Field>
        <Field
          подпись="Что изменить вокруг"
          подсказка="Необязательно: место, время, напоминание или подготовка среды"
        >
          <Textarea
            rows={2}
            maxLength={240}
            value={заметка}
            onChange={(событие) => установитьЗаметку(событие.target.value)}
          />
        </Field>
      </div>

      <p className="mt-3 text-micro leading-relaxed text-ink-3">
        План сохранится в истории привычки. Он не добавит отметку и не изменит
        остальные данные без отдельного действия.
      </p>
      {ошибка ? (
        <p role="alert" className="mt-2 text-meta leading-relaxed text-bad">
          {ошибка}
        </p>
      ) : null}
    </Dialog>
  )
}
