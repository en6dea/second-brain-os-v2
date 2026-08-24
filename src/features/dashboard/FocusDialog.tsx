import { useEffect, useState } from 'react'
import { Check, ExternalLink, Pause, Play, RotateCcw } from 'lucide-react'
import type { ПунктПлана } from '@/core/db/types'
import { Button, Dialog, ProgressBar, Segmented } from '@/design-system/components'

type БлокФокуса = '15' | '25' | '45' | '60'

const БЛОКИ: Array<{ ключ: БлокФокуса; подпись: string }> = [
  { ключ: '15', подпись: '15 мин' },
  { ключ: '25', подпись: '25 мин' },
  { ключ: '45', подпись: '45 мин' },
  { ключ: '60', подпись: '60 мин' },
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
}: {
  пункт: ПунктПлана | null
  открыто: boolean
  выполнен: boolean
  наЗакрытие: () => void
  наВыполнение: (() => Promise<void>) | null
  наОткрытиеИсточника: () => void
}) {
  const [блок, установитьБлок] = useState<БлокФокуса>('25')
  const [осталось, установитьОсталось] = useState(25 * 60)
  const [запущен, установитьЗапущен] = useState(false)

  useEffect(() => {
    if (!пункт || !открыто) return
    const следующий = начальныйБлок(пункт)
    установитьБлок(следующий)
    установитьОсталось(Number(следующий) * 60)
    установитьЗапущен(false)
  }, [пункт, открыто])

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
      подпись="Один блок — одно понятное действие"
      ширина="узкая"
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
          {пункт.заголовок}
        </p>
        <p className="mt-2 text-meta leading-relaxed text-ink-3">{пункт.зачем}</p>
      </div>

      <div className="mt-5">
        <p className="mb-2 text-meta font-medium text-ink-2">Длина блока</p>
        <Segmented
          значения={БЛОКИ}
          выбрано={блок}
          наВыбор={выбратьБлок}
          размер="поле"
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
