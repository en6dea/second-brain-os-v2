import { useEffect, useState } from 'react'
import { Check, ExternalLink, Pause, Play, RotateCcw, Sparkles } from 'lucide-react'
import type {
  КоучингСессия,
  ПунктПлана,
  ПричинаПрокрастинации,
} from '@/core/db/types'
import { советПомощника, type ЧерновикКоучингСессии } from '@/core/day/Coach'
import {
  Button,
  Dialog,
  ProgressBar,
  Segmented,
  Textarea,
} from '@/design-system/components'
import { cn } from '@/design-system/classNames'

type БлокФокуса = '5' | '10' | '15' | '25' | '45' | '60'

const БЛОКИ: Array<{ ключ: БлокФокуса; подпись: string }> = [
  { ключ: '5', подпись: '5 мин' },
  { ключ: '10', подпись: '10 мин' },
  { ключ: '15', подпись: '15 мин' },
  { ключ: '25', подпись: '25 мин' },
  { ключ: '45', подпись: '45 мин' },
  { ключ: '60', подпись: '60 мин' },
]

const ПРИЧИНЫ: Array<{ ключ: ПричинаПрокрастинации; подпись: string }> = [
  { ключ: 'неясно', подпись: 'Неясно, с чего начать' },
  { ключ: 'слишком большое', подпись: 'Слишком большое дело' },
  { ключ: 'страшно ошибиться', подпись: 'Страшно сделать плохо' },
  { ключ: 'нет сил', подпись: 'Сейчас мало сил' },
  { ключ: 'отвлекаюсь', подпись: 'Постоянно отвлекаюсь' },
]

function начальныйБлок(пункт: ПунктПлана): БлокФокуса {
  const минут = пункт.ожидаемоМинут
  if (минут === null || минут === undefined) return '25'
  if (минут <= 15) return '15'
  if (минут <= 25) return '25'
  if (минут <= 45) return '45'
  return '60'
}

function время(секунд: number): string {
  const минуты = Math.floor(секунд / 60)
  const остаток = секунд % 60
  return `${String(минуты).padStart(2, '0')}:${String(остаток).padStart(2, '0')}`
}

/**
 * Режим фокуса ничего не записывает сам. Только отдельная кнопка результата
 * вызывает транзакцию родительской карточки — тот же путь, что обычная отметка.
 */
export function FocusDialog({
  пункт,
  открыто,
  выполнен,
  наЗакрытие,
  наВыполнение,
  наОткрытиеИсточника,
  сохранённаяСессия = null,
  наСохранениеМикрошага,
}: {
  пункт: ПунктПлана | null
  открыто: boolean
  выполнен: boolean
  наЗакрытие: () => void
  наВыполнение: (() => Promise<void>) | null
  наОткрытиеИсточника: () => void
  сохранённаяСессия?: КоучингСессия | null
  наСохранениеМикрошага?: (черновик: ЧерновикКоучингСессии) => Promise<void>
}) {
  const [блок, установитьБлок] = useState<БлокФокуса>('25')
  const [осталось, установитьОсталось] = useState(25 * 60)
  const [запущен, установитьЗапущен] = useState(false)
  const [помощьОткрыта, установитьПомощьОткрыта] = useState(false)
  const [причина, установитьПричину] = useState<ПричинаПрокрастинации>('неясно')
  const [микрошаг, установитьМикрошаг] = useState('')
  const [минутМикрошага, установитьМинутМикрошага] = useState<'5' | '10' | '15'>(
    '10',
  )
  const [принятыйМикрошаг, установитьПринятыйМикрошаг] = useState<string | null>(
    null,
  )
  const [сохраняется, установитьСохраняется] = useState(false)
  const [ошибкаСохранения, установитьОшибкуСохранения] = useState('')

  useEffect(() => {
    if (!пункт || !открыто) return
    const следующий: БлокФокуса = сохранённаяСессия
      ? (String(сохранённаяСессия.минут) as БлокФокуса)
      : начальныйБлок(пункт)
    установитьБлок(следующий)
    установитьОсталось(Number(следующий) * 60)
    установитьЗапущен(false)
    установитьПомощьОткрыта(false)
    установитьПричину(сохранённаяСессия?.причина ?? 'неясно')
    установитьПринятыйМикрошаг(сохранённаяСессия?.микрошаг ?? null)
    установитьОшибкуСохранения('')
  }, [пункт, открыто, сохранённаяСессия])

  useEffect(() => {
    if (!открыто || !запущен || осталось <= 0) return
    const таймер = window.setTimeout(
      () => установитьОсталось((текущее) => Math.max(0, текущее - 1)),
      1000,
    )
    return () => window.clearTimeout(таймер)
  }, [осталось, открыто, запущен])

  if (!пункт) return null

  const всего = Number(блок) * 60
  const закончен = осталось === 0
  const совет = советПомощника(причина, пункт.заголовок)

  function выбратьПричину(следующая: ПричинаПрокрастинации) {
    const следующийСовет = советПомощника(следующая, пункт!.заголовок)
    установитьПричину(следующая)
    установитьМикрошаг(следующийСовет.микрошаг)
    установитьМинутМикрошага(String(следующийСовет.минут) as '5' | '10' | '15')
  }

  function открытьПомощь() {
    if (!помощьОткрыта && !микрошаг) выбратьПричину(причина)
    установитьПомощьОткрыта((было) => !было)
  }

  async function принятьМикрошаг() {
    const текст = микрошаг.trim()
    if (!текст || !наСохранениеМикрошага || сохраняется) return
    const минуты = Number(минутМикрошага) as 5 | 10 | 15
    установитьОшибкуСохранения('')
    установитьСохраняется(true)
    try {
      await наСохранениеМикрошага({
        причина,
        роль: совет.роль,
        микрошаг: текст,
        минут: минуты,
      })
      установитьПринятыйМикрошаг(текст)
      выбратьБлок(минутМикрошага)
      установитьПомощьОткрыта(false)
    } catch {
      установитьОшибкуСохранения(
        'Не удалось сохранить микрошаг. Ваш план не изменён — попробуйте ещё раз.',
      )
    } finally {
      установитьСохраняется(false)
    }
  }

  function выбратьБлок(значение: БлокФокуса) {
    установитьБлок(значение)
    установитьОсталось(Number(значение) * 60)
    установитьЗапущен(false)
  }

  function сбросить() {
    установитьОсталось(всего)
    установитьЗапущен(false)
  }

  return (
    <Dialog
      открыто={открыто}
      наЗакрытие={наЗакрытие}
      заголовок="Режим фокуса"
      подпись="Один понятный шаг без давления"
      ширина="средняя"
      подвал={
        <>
          <Button вид="тихая" onClick={наЗакрытие}>
            Закрыть
          </Button>
          {наВыполнение && !выполнен ? (
            <Button
              вид="основная"
              иконка={<Check size={18} />}
              onClick={() => void наВыполнение()}
            >
              Отметить сделанным
            </Button>
          ) : пункт.вид !== 'задача' && пункт.вид !== 'привычка' ? (
            <Button
              вид="основная"
              иконка={<ExternalLink size={18} />}
              onClick={наОткрытиеИсточника}
            >
              Открыть источник
            </Button>
          ) : null}
        </>
      }
    >
      <div className="rounded-3 border border-line bg-sunken/70 p-4">
        <p className="text-caption font-medium tracking-[0.12em] text-ink-3 uppercase">
          Сейчас только это
        </p>
        <p className="mt-1 text-h3 leading-tight font-medium text-ink">
          {принятыйМикрошаг ?? пункт.заголовок}
        </p>
        <p className="mt-2 text-meta leading-relaxed text-ink-3">
          {принятыйМикрошаг ? `Микрошаг для «${пункт.заголовок}»` : пункт.зачем}
        </p>
      </div>

      <Button
        вид="контур"
        наВсюШирину
        className="mt-3"
        иконка={<Sparkles size={18} />}
        aria-expanded={помощьОткрыта}
        onClick={открытьПомощь}
      >
        {помощьОткрыта ? 'Скрыть помощь' : 'Застрял — помочь начать'}
      </Button>

      {помощьОткрыта ? (
        <section className="mt-4 rounded-3 border border-line bg-sunken/55 p-4">
          <p className="text-body font-medium text-ink">Что мешает начать?</p>
          <div
            role="radiogroup"
            aria-label="Причина, почему трудно начать"
            className="mt-3 grid gap-2 sm:grid-cols-2"
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

          <div className="mt-4 rounded-2 border border-line bg-card p-3.5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-meta font-medium text-ink">Режим: {совет.роль}</p>
              <span className="text-micro text-ink-3">по выбранной причине</span>
            </div>
            <p className="mt-2 text-meta leading-relaxed text-ink-2">
              {совет.поддержка}
            </p>
            <p className="mt-3 text-meta font-medium leading-relaxed text-ink">
              {совет.вопрос}
            </p>
          </div>

          <label className="mt-4 block">
            <span className="mb-1.5 block text-body font-medium text-ink-2">
              Первый видимый шаг
            </span>
            <Textarea
              rows={2}
              value={микрошаг}
              maxLength={240}
              onChange={(событие) => установитьМикрошаг(событие.target.value)}
            />
          </label>

          <div className="mt-4">
            <p className="mb-1.5 text-body font-medium text-ink-2">
              Безопасный блок
            </p>
            <Segmented
              значения={
                БЛОКИ.slice(0, 3) as Array<{
                  ключ: '5' | '10' | '15'
                  подпись: string
                }>
              }
              выбрано={минутМикрошага}
              наВыбор={установитьМинутМикрошага}
              размер="поле"
              ariaLabel="Длина микрошага"
            />
          </div>

          <Button
            вид="основная"
            наВсюШирину
            className="mt-4"
            disabled={!микрошаг.trim() || !наСохранениеМикрошага || сохраняется}
            onClick={() => void принятьМикрошаг()}
          >
            {сохраняется ? 'Сохраняю…' : 'Принять микрошаг'}
          </Button>
          <p className="mt-2 text-micro leading-relaxed text-ink-3">
            Помощник не ставит диагнозов. Он использует только выбранную вами
            причину и ничего не меняет до подтверждения.
          </p>
          {ошибкаСохранения ? (
            <p className="mt-2 text-meta leading-relaxed text-bad" role="alert">
              {ошибкаСохранения}
            </p>
          ) : null}
        </section>
      ) : null}

      <div className="mt-5">
        <p className="mb-2 text-meta font-medium text-ink-2">Длина блока</p>
        <Segmented
          значения={БЛОКИ}
          выбрано={блок}
          наВыбор={выбратьБлок}
          размер="поле"
          ariaLabel="Длина блока фокуса"
        />
      </div>

      <div className="mt-6 text-center">
        <div
          className="tnum text-h1 font-medium text-ink"
          aria-label={`Осталось ${время(осталось)}`}
        >
          {время(осталось)}
        </div>
        <p className="mt-1 text-meta text-ink-3" aria-live="polite">
          {закончен
            ? 'Блок завершён — зафиксируйте результат'
            : запущен
              ? 'Фокус идёт. Остальное подождёт'
              : выполнен
                ? 'Этот пункт уже выполнен'
                : 'Таймер не меняет ваши данные'}
        </p>
      </div>

      <div className="mt-5">
        <ProgressBar
          значение={всего - осталось}
          из={всего}
          тон={закончен ? 'успех' : 'нейтральный'}
          подпись="Фокус-блок"
        />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2">
        <Button
          вид={запущен ? 'обычная' : 'основная'}
          иконка={запущен ? <Pause size={18} /> : <Play size={18} />}
          onClick={() => установитьЗапущен((текущее) => !текущее)}
          disabled={закончен || выполнен}
        >
          {запущен ? 'Пауза' : осталось === всего ? 'Начать' : 'Продолжить'}
        </Button>
        <Button вид="контур" иконка={<RotateCcw size={18} />} onClick={сбросить}>
          Сначала
        </Button>
      </div>
    </Dialog>
  )
}
