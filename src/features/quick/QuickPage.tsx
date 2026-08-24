import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Check, Terminal, TriangleAlert } from 'lucide-react'
import { известныеКоманды, разобратьКоманду } from '@/core/quick/Command'
import { применить, type ИтогКоманды } from '@/core/quick/Intent'
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  Input,
} from '@/design-system/components'

type Состояние =
  | { вид: 'ждём' }
  | { вид: 'пишем' }
  | { вид: 'готово'; итог: ИтогКоманды }
  | { вид: 'ошибка'; текст: string; пример: string }

/**
 * Быстрый ввод.
 *
 * Открывается по адресу с командой в самом пути: `/quick/расход;350;кофе`.
 *
 * Команда идёт в путь, а не в `window.location.hash` напрямую: на GitHub
 * Pages маршрутизатор сам живёт в решётке (`#/quick/…`), и ручное чтение
 * хэша конфликтовало бы с его собственной адресацией — оно работало на
 * локальном сервере разработки и молчало на настоящем сайте, потому что там
 * решётка уже занята роутером. `useParams` читает адрес тем же способом,
 * каким его понимает сам роутер, и потому верен в обоих режимах.
 *
 * Так это работает с телефона: приложение «Команды» на iPhone умеет открывать
 * адрес, а часть после решётки на сервер не уходит и остаётся на устройстве.
 * Команду можно набрать и здесь — тогда страница работает как строка ввода.
 */
/**
 * Пример рабочего адреса для инструкции.
 *
 * Строится тем же условием, что решает в `routes.tsx`, каким роутером
 * пользоваться: на GitHub Pages путь целиком живёт в решётке, при обычном
 * запуске — в самом адресе.
 */
function примерРабочегоАдреса(): string {
  const хешевойРоутер =
    import.meta.env.MODE === 'production' && import.meta.env.BASE_URL !== '/'
  if (хешевойРоутер) {
    return `${window.location.origin}${window.location.pathname}#/quick/расход;350;кофе`
  }
  return `${window.location.origin}${import.meta.env.BASE_URL}quick/расход;350;кофе`
}

export function QuickPage() {
  // Имя параметра в самом пути роутера — латиницей: движок сопоставления
  // путей у react-router не распознаёт кириллицу как имя динамического
  // сегмента (`:команда` совпадений не даёт), хотя в JS-коде кириллица
  // работает свободно. Столкнулся с этим при проверке на собранной версии.
  const { cmd: командаИзАдреса } = useParams<{ cmd?: string }>()
  const навигация = useNavigate()
  const [состояние, установитьСостояние] = useState<Состояние>({ вид: 'ждём' })
  const [строка, установитьСтроку] = useState('')
  const примерАдреса = примерРабочегоАдреса()

  /**
   * Последняя выполненная команда.
   *
   * Одну и ту же строку дважды выполнять нельзя — перерисовка записала бы
   * расход второй раз. Новую же нужно выполнить, даже если страница уже
   * открыта: с телефона команда может прийти, пока приложение уже висит на
   * этом экране, и тогда меняется только адрес, без перезагрузки.
   */
  const выполненная = useRef<string | null>(null)

  const выполнить = useCallback(
    async (команда: string) => {
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
      // Адрес очищается до /quick, чтобы обновление страницы не повторило
      // запись. Отметка о выполненной строке при этом снимается: ту же
      // команду можно прислать снова, и она сработает как новая.
      выполненная.current = null
      навигация('/quick', { replace: true })
    },
    [навигация],
  )

  useEffect(() => {
    if (!командаИзАдреса || командаИзАдреса === выполненная.current) return
    выполненная.current = командаИзАдреса
    установитьСтроку(decodeURIComponent(командаИзАдреса))
    void выполнить(командаИзАдреса)
  }, [командаИзАдреса, выполнить])

  return (
    <div className="anim-rise mx-auto max-w-xl space-y-5">
      <div>
        <h1 className="text-h2 font-semibold text-ink">Быстрый ввод</h1>
        <p className="mt-0.5 text-meta text-ink-3">
          Одна строка вместо формы. Работает с телефона через «Команды»
        </p>
      </div>

      {состояние.вид === 'готово' ? (
        <Card>
          <CardBody className="space-y-3">
            <p className="flex items-center gap-2 text-body font-medium text-ink">
              <span
                className={
                  состояние.итог.записано
                    ? 'inline-flex h-6 w-6 items-center justify-center rounded-full bg-good text-on-good'
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
              <p className="text-meta leading-relaxed text-ink-2">
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
            <p className="flex items-center gap-2 text-meta font-medium text-bad">
              <TriangleAlert size={15} />
              {состояние.текст}
            </p>
            <p className="text-meta text-ink-2">
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
                className="rounded-2 border border-line px-2.5 py-1.5 text-caption text-ink-2 transition-colors hover:border-accent-line hover:bg-accent-soft hover:text-ink"
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
          действие={
            <Badge тон="знание">
              <Terminal size={11} />
              Команды
            </Badge>
          }
        />
        <CardBody>
          <ol className="space-y-2 text-meta leading-relaxed text-ink-2">
            <li>
              <span className="font-medium text-ink">1.</span> Откройте приложение
              «Команды» → плюс → «Добавить действие» → «Открыть URL».
            </li>
            <li>
              <span className="font-medium text-ink">2.</span> Впишите адрес этой
              страницы, дописав команду через слэш. Например:
              <code className="mt-1 block break-all rounded-2 bg-sunken px-2.5 py-1.5 text-caption text-ink">
                {примерАдреса}
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
          <p className="mt-3 text-caption leading-relaxed text-ink-3">
            Адрес открывается решёткой намеренно: это часть, которую браузер никогда
            не отправляет на сервер — ни в запросе, ни в его журналах. Суммы и
            заметки остаются на устройстве, что бы после решётки ни стояло.
          </p>
        </CardBody>
      </Card>
    </div>
  )
}
