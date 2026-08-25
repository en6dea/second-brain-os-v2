import { AlertTriangle, CalendarClock } from 'lucide-react'
import type { РазгрузкаДня } from '@/core/day/dayPlan'
import { склонение } from '@/core/language/Plural'
import { Button, CheckMark } from '@/design-system/components'
import { ЗНАЧОК } from '@/design-system/iconSize'

export function DayLoadAdvisor({
  разгрузка,
  выбранныеId,
  наПереключение,
  наПеренос,
  переносится,
  ошибка,
}: {
  разгрузка: РазгрузкаДня
  выбранныеId: Set<string>
  наПереключение: (id: string) => void
  наПеренос: () => Promise<void>
  переносится: boolean
  ошибка: string
}) {
  const требуется =
    разгрузка.превышениеМинут > 0 || разгрузка.лишнихПунктовПриНизкойЭнергии > 0
  if (!требуется) return null

  const выбранные = разгрузка.задачи.filter((задача) => выбранныеId.has(задача.id))
  const освобождаетсяМинут = выбранные.reduce(
    (сумма, задача) => сумма + (задача.минут ?? 0),
    0,
  )
  const останетсяМинут = Math.max(0, разгрузка.превышениеМинут - освобождаетсяМинут)
  const останетсяПунктов = Math.max(
    0,
    разгрузка.лишнихПунктовПриНизкойЭнергии - выбранные.length,
  )

  return (
    <section className="mt-3 rounded-3 border border-warn/35 bg-warn/8 p-3.5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-2 bg-warn/12 text-warn">
          <CalendarClock size={ЗНАЧОК.строка} />
        </span>
        <div className="min-w-0">
          <p className="text-meta font-medium text-ink">
            Тайм-менеджер предлагает разгрузку
          </p>
          <p className="mt-1 text-caption leading-relaxed text-ink-3">
            {разгрузка.превышениеМинут > 0
              ? `Известная нагрузка выше вашего лимита на ${разгрузка.превышениеМинут} мин.`
              : 'При низкой энергии в плане лучше оставить не больше трёх пунктов.'}
          </p>
        </div>
      </div>

      {разгрузка.задачи.length > 0 ? (
        <>
          <ul className="mt-3 divide-y divide-line rounded-2 border border-line bg-card px-3">
            {разгрузка.задачи.map((задача) => (
              <li key={задача.id} className="flex gap-3 py-3">
                <CheckMark
                  отмечено={выбранныеId.has(задача.id)}
                  подпись={`Перенести «${задача.название}» на завтра`}
                  наПереключение={() => наПереключение(задача.id)}
                  className="mt-0.5"
                />
                <span className="min-w-0">
                  <span className="block text-meta font-medium text-ink">
                    {задача.название}
                  </span>
                  <span className="mt-0.5 block text-caption leading-relaxed text-ink-3">
                    {задача.основание}
                    {задача.минут === null
                      ? ' · время не указано'
                      : ` · ${задача.минут} мин`}
                  </span>
                  {задача.переносов > 0 ? (
                    <span className="mt-1 block text-micro text-warn">
                      Уже переносилась {задача.переносов}{' '}
                      {склонение(задача.переносов, 'раз', 'раза', 'раз')}
                      {задача.переносов === 2
                        ? ' — следующий перенос станет третьим'
                        : ''}
                    </span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-3 rounded-2 border border-line bg-sunken/55 px-3 py-2.5">
            <p className="text-caption leading-relaxed text-ink-2">
              После выбранного переноса:{' '}
              {останетсяМинут === 0 && останетсяПунктов === 0
                ? 'известная нагрузка уложится в выбранные ограничения.'
                : [
                    останетсяМинут > 0
                      ? `ещё ${останетсяМинут} мин сверх лимита`
                      : '',
                    останетсяПунктов > 0
                      ? `ещё ${останетсяПунктов} лишних ${склонение(останетсяПунктов, 'пункт', 'пункта', 'пунктов')}`
                      : '',
                  ]
                    .filter(Boolean)
                    .join(' · ')}
            </p>
          </div>

          <Button
            вид="контур"
            наВсюШирину
            className="mt-3"
            иконка={<CalendarClock size={ЗНАЧОК.строка} />}
            disabled={выбранные.length === 0 || переносится}
            onClick={() => void наПеренос()}
          >
            {переносится
              ? 'Переношу…'
              : `Перенести на завтра · ${выбранные.length}`}
          </Button>
          <p className="mt-2 text-micro leading-relaxed text-ink-3">
            До нажатия даты задач не меняются. План дня принимается отдельной
            кнопкой ниже.
          </p>
        </>
      ) : (
        <div className="mt-3 flex gap-2 rounded-2 border border-line bg-card p-3 text-caption leading-relaxed text-ink-2">
          <AlertTriangle
            size={ЗНАЧОК.строка}
            className="mt-0.5 shrink-0 text-warn"
          />
          <p>
            Безопасного автоматического переноса нет: срочные дела, обязательства и
            задачи с тремя переносами защищены. Измените лимит или снимите пункт
            вручную.
          </p>
        </div>
      )}

      {разгрузка.защищённыхЗастрявшихЗадач > 0 ? (
        <p className="mt-2 text-caption leading-relaxed text-warn">
          {разгрузка.защищённыхЗастрявшихЗадач}{' '}
          {склонение(
            разгрузка.защищённыхЗастрявшихЗадач,
            'задача уже переносилась трижды',
            'задачи уже переносились трижды',
            'задач уже переносились трижды',
          )}
          . Помощник оставил её в плане — лучше открыть и разбить на микрошаг.
        </p>
      ) : null}

      {ошибка ? (
        <p className="mt-2 text-meta leading-relaxed text-bad" role="alert">
          {ошибка}
        </p>
      ) : null}
    </section>
  )
}
