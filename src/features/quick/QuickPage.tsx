import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Terminal, TriangleAlert } from 'lucide-react'
import { известныеКоманды, разобратьКоманду } from '@/core/quick/Command'
import { применить, type ИтогКоманды } from '@/core/quick/Intent'
import { Badge, Button, Card, CardBody, CardHeader, Input } from '@/design-system/components'

type Состояние =
  | { вид: 'ждём' }
  | { вид: 'пишем' }
  | { вид: 'готово'; итог: ИтогКоманды }
  | { вид: 'ошибка'; текст: string; пример: string }

/**
 * Быстрый ввод.
 *
 * Открывается по адресу с командой после решётки:
 *
 *     /quick#расход;350;кофе
 *
 * Так это работает с телефона: приложение «Команды» на iPhone умеет открывать
 * адрес, а всё после решётки на сервер не уходит и остаётся на устройстве.
 * Команду можно набрать и здесь — тогда страница работает как строка ввода.
 */
export function QuickPage() {
  const [состояние, установитьСостояние] = useState<Состояние>({ вид: 'ждём' })
  const [строка, установитьСтроку] = useState('')

  /**
   * Последняя выполненная команда.
   *
   * Одну и ту же строку дважды выполнять нельзя — перерисовка записала бы
   * расход второй раз. А вот новую строку выполнить надо, даже если страница
   * уже открыта: когда приложение висит на этом экране, команда с телефона
   * меняет только часть адреса после решётки, и перезагрузки не происходит.
   */
  const выполненная = useRef<string | null>(null)

  useEffect(() => {
    const запустить = () => {
      const изАдреса = window.location.hash.replace(/^#/, '')
      if (!изАдреса || изАдреса === выполненная.current) return
      выполненная.current = изАдреса
      установитьСтроку(decodeURIComponent(изАдреса))
      void выполнить(изАдреса)
    }
    запустить()
    window.addEventListener('hashchange', запустить)
    return () => window.removeEventListener('hashchange', запустить)
  }, [])

  async function выполнить(команда: string) {
    установитьСостояние({ вид: 'пишем' })
    const разбор = разобратьКоманду(команда)
    if (!разбор.намерение) {
      установитьСостояние({
        вид: 'ошибка',
        текст: разбор.ошибка,
        пример: разбор.пример,
      })
      return
    }
    const итог = await применить(разбор.намерение)
    установитьСостояние({ вид: 'готово', итог })
    // Адрес очищается, чтобы обновление страницы не повторило запись.
    // Отметка о выполненной строке при этом снимается: ту же команду можно
    // прислать снова, и она сработает как новая.
    выполненная.current = null
    window.history.replaceState(null, '', window.location.pathname)
  }

  return (
    <div className="anim-rise mx-auto max-w-xl space-y-5">
      <div>
        <h1 className="text-[20px] font-semibold text-ink">Быстрый ввод</h1>
        <p className="mt-0.5 text-[13px] text-ink-3">
          Одна строка вместо формы. Работает с телефона через «Команды»
        </p>
      </div>

      {состояние.вид === 'готово' ? (
        <Card>
          <CardBody className="space-y-3">
            <p className="flex items-center gap-2 text-[15px] font-medium text-ink">
              <span
                className={
                  состояние.итог.записано
                    ? 'inline-flex h-6 w-6 items-center justify-center rounded-full bg-good text-white'
                    : 'inline-flex h-6 w-6 items-center justify-center rounded-full bg-bad-soft text-bad'
                }
              >
                {состояние.итог.записано ? (
                  <Check size={14} />
                ) : (
                  <TriangleAlert size={14} />
                )}
              </span>
              {состояние.итог.сообщение}
            </p>

            {состояние.итог.дополнено ? (
              <p className="text-[13px] leading-relaxed text-ink-2">
                {состояние.итог.дополнено}
              </p>
            ) : null}

            <div className="flex flex-wrap gap-2 pt-1">
              <Link to={состояние.итог.раздел}>
                <Button вид="контур" размер="малый">
                  Посмотреть
                </Button>
              </Link>
              <Button
                вид="тихая"
                размер="малый"
                onClick={() => {
                  установитьСтроку('')
                  установитьСостояние({ вид: 'ждём' })
                }}
              >
                Ещё одну
              </Button>
            </div>
          </CardBody>
        </Card>
      ) : null}

      {состояние.вид === 'ошибка' ? (
        <Card>
          <CardBody className="space-y-2">
            <p className="flex items-center gap-2 text-[14px] font-medium text-bad">
              <TriangleAlert size={15} />
              {состояние.текст}
            </p>
            <p className="text-[13px] text-ink-2">
              Правильно так: <code className="text-ink">{состояние.пример}</code>
            </p>
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardHeader
          заголовок="Ввести командой"
          подпись="Разделитель — точка с запятой"
        />
        <CardBody className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={строка}
              placeholder="расход;350;кофе"
              autoFocus
              onChange={(событие) => установитьСтроку(событие.target.value)}
              onKeyDown={(событие) => {
                if (событие.key === 'Enter' && строка.trim()) void выполнить(строка)
              }}
            />
            <Button
              вид="основная"
              disabled={!строка.trim() || состояние.вид === 'пишем'}
              onClick={() => void выполнить(строка)}
            >
              Записать
            </Button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {известныеКоманды().map(({ слово, пример }) => (
              <button
                key={слово}
                type="button"
                onClick={() => установитьСтроку(пример)}
                className="rounded-2 border border-line px-2.5 py-1.5 text-[12px] text-ink-2 transition-colors hover:border-accent-line hover:bg-accent-soft hover:text-ink"
              >
                {пример}
              </button>
            ))}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          заголовок="Как положить на iPhone"
          подпись="Три минуты один раз, дальше — голосом или с экрана блокировки"
          действие={<Badge тон="знание">
            <Terminal size={11} />
            Команды
          </Badge>}
        />
        <CardBody>
          <ol className="space-y-2 text-[13px] leading-relaxed text-ink-2">
            <li>
              <span className="font-medium text-ink">1.</span> Откройте приложение
              «Команды» → плюс → «Добавить действие» → «Открыть URL».
            </li>
            <li>
              <span className="font-medium text-ink">2.</span> Впишите адрес этой
              страницы и после решётки — команду. Например:
              <code className="mt-1 block break-all rounded-2 bg-sunken px-2.5 py-1.5 text-[12px] text-ink">
                {`${window.location.origin}${window.location.pathname}#расход;350;кофе`}
              </code>
            </li>
            <li>
              <span className="font-medium text-ink">3.</span> Чтобы сумма
              спрашивалась голосом, добавьте перед этим действие «Запросить ввод» и
              подставьте его в адрес вместо числа.
            </li>
            <li>
              <span className="font-medium text-ink">4.</span> Назовите команду
              коротко — так её позовёт Siri. Ещё её можно положить на экран
              блокировки или повесить на двойное касание по крышке телефона.
            </li>
          </ol>
          <p className="mt-3 text-[12px] leading-relaxed text-ink-3">
            Команда идёт после решётки намеренно: всё, что стоит после «?», уходит
            на сервер в запросе и попадает в его журналы. После «#» браузер не
            отправляет ничего — суммы и заметки остаются на устройстве.
          </p>
        </CardBody>
      </Card>
    </div>
  )
}
