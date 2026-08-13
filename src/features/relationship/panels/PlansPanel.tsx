import { useMemo, useState } from 'react'
import { CalendarRange, Check, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { база } from '@/core/db/db'
import { новаяЗапись } from '@/core/db/repo'
import { сейчас } from '@/core/db/RecordId'
import type { Замысел, ГоризонтВдвоём, ПланВдвоём } from '@/core/db/types'
import { замыслыПериода, свестиЗамысел } from '@/features/planner/model/Planner'
import { IntentionDialog } from '@/features/planner/IntentionDialog'
import {
  границыМесяца,
  границыНедели,
  деньКратко,
  деньСловами,
  месяцСловами,
  сдвинутьДень,
  сегодня,
} from '@/core/calendar/CalendarRu'
import { useИнтерфейс } from '@/app/providers/ui'
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  Field,
  IconButton,
  Textarea,
} from '@/design-system/components'

const ГОРИЗОНТЫ: { ключ: ГоризонтВдвоём; подпись: string }[] = [
  { ключ: 'день', подпись: 'День' },
  { ключ: 'неделя', подпись: 'Неделя' },
  { ключ: 'месяц', подпись: 'Месяц' },
]

/** Ключ периода: для недели это её понедельник, для месяца — «ГГГГ-ММ». */
function ключПериода(горизонт: ГоризонтВдвоём, день: string): string {
  if (горизонт === 'день') return день
  if (горизонт === 'неделя') return границыНедели(день).от
  return день.slice(0, 7)
}

function сдвинуть(горизонт: ГоризонтВдвоём, день: string, шаг: number): string {
  if (горизонт === 'день') return сдвинутьДень(день, шаг)
  if (горизонт === 'неделя') return сдвинутьДень(день, шаг * 7)
  const [год, месяц] = день.split('-').map(Number)
  const дата = new Date(год ?? 2026, (месяц ?? 1) - 1 + шаг, 1)
  return `${дата.getFullYear()}-${String(дата.getMonth() + 1).padStart(2, '0')}-01`
}

function названиеПериода(горизонт: ГоризонтВдвоём, день: string): string {
  if (горизонт === 'день') return деньСловами(день)
  if (горизонт === 'неделя') {
    const границы = границыНедели(день)
    return `${деньКратко(границы.от)} — ${деньКратко(границы.до)}`
  }
  return месяцСловами(день.slice(0, 7))
}

/**
 * Планы вдвоём.
 *
 * Один план на период: не список дел, а договорённость. Отдельно записано,
 * что берёт на себя каждый, — иначе «мы решили» через неделю оказывается
 * ничьим.
 */
export function PlansPanel({
  планы,
  замыслы,
  имяПартнёра,
}: {
  планы: ПланВдвоём[]
  замыслы: Замысел[]
  имяПартнёра: string
}) {
  const сообщить = useИнтерфейс((с) => с.сообщить)
  const [горизонт, установитьГоризонт] = useState<ГоризонтВдвоём>('неделя')
  const [якорь, установитьЯкорь] = useState(сегодня())

  const период = ключПериода(горизонт, якорь)
  const [черновикЗамысла, установитьЧерновикЗамысла] =
    useState<Partial<Замысел> | null>(null)

  // Границы периода нужны, чтобы понять, какие совместные замыслы к нему
  // относятся. Замысел без даты не относится ни к одному.
  const границы = useMemo(() => {
    if (горизонт === 'день') return { от: якорь, до: якорь }
    if (горизонт === 'неделя') return границыНедели(якорь)
    return границыМесяца(якорь.slice(0, 7))
  }, [горизонт, якорь])

  const совместные = useMemo(
    () =>
      замыслыПериода(
        замыслы.filter((замысел) => замысел.вдвоём),
        границы.от,
        границы.до,
      ),
    [замыслы, границы],
  )

  const текущий = useMemo(
    () =>
      планы.find(
        (план) => план.горизонт === горизонт && план.период === период,
      ) ?? null,
    [планы, горизонт, период],
  )

  const прошлые = useMemo(
    () =>
      планы
        .filter((план) => план.горизонт === горизонт && план.период !== период)
        .sort((а, б) => б.период.localeCompare(а.период))
        .slice(0, 6),
    [планы, горизонт, период],
  )

  /** Правка поля пишется сразу: план вдвоём заполняют по ходу разговора. */
  async function записать(поле: keyof ПланВдвоём, значение: string | boolean) {
    if (текущий) {
      await база.couplePlans.put({
        ...текущий,
        [поле]: значение,
        updatedAt: сейчас(),
      })
      return
    }
    await база.couplePlans.add(
      новаяЗапись({
        горизонт,
        период,
        главное: '',
        чтоСделаем: '',
        чтоЯБеруНаСебя: '',
        чтоБерётПартнёр: '',
        итог: '',
        закрыт: false,
        [поле]: значение,
      }) as never,
    )
  }

  const поле = (
    подпись: string,
    ключ: 'главное' | 'чтоСделаем' | 'чтоЯБеруНаСебя' | 'чтоБерётПартнёр' | 'итог',
    строк: number,
    подсказка?: string,
  ) => (
    <Field подпись={подпись} подсказка={подсказка}>
      <Textarea
        rows={строк}
        defaultValue={текущий?.[ключ] ?? ''}
        key={`${текущий?.id ?? 'новый'}-${ключ}`}
        onBlur={(событие) => void записать(ключ, событие.target.value)}
      />
    </Field>
  )

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader
          заголовок="План вдвоём"
          подпись="Договорённость на период, а не список дел"
          действие={
            <div className="flex items-center gap-1 rounded-2 border border-line bg-sunken p-0.5">
              {ГОРИЗОНТЫ.map((вариант) => (
                <button
                  key={вариант.ключ}
                  type="button"
                  aria-pressed={горизонт === вариант.ключ}
                  onClick={() => установитьГоризонт(вариант.ключ)}
                  className={
                    горизонт === вариант.ключ
                      ? 'rounded-1 bg-card px-3 py-1.5 text-meta font-medium text-ink shadow-1'
                      : 'rounded-1 px-3 py-1.5 text-meta font-medium text-ink-3 hover:text-ink-2'
                  }
                >
                  {вариант.подпись}
                </button>
              ))}
            </div>
          }
        />

        <div className="flex items-center justify-center gap-2 px-5 pb-1">
          <IconButton
            подпись="Предыдущий период"
            onClick={() => установитьЯкорь(сдвинуть(горизонт, якорь, -1))}
          >
            <ChevronLeft size={17} />
          </IconButton>
          <span className="min-w-[210px] text-center text-[14px] font-medium text-ink first-letter:uppercase">
            {названиеПериода(горизонт, якорь)}
          </span>
          <IconButton
            подпись="Следующий период"
            onClick={() => установитьЯкорь(сдвинуть(горизонт, якорь, 1))}
          >
            <ChevronRight size={17} />
          </IconButton>
        </div>

        <CardBody className="space-y-4">
          {поле('Главное на период', 'главное', 2, 'одна мысль, к которой сверяемся')}
          {поле('Что сделаем', 'чтоСделаем', 3)}
          <div className="grid gap-4 sm:grid-cols-2">
            {поле('Что беру на себя я', 'чтоЯБеруНаСебя', 3)}
            {поле(
              `Что берёт на себя ${имяПартнёра || 'партнёр'}`,
              'чтоБерётПартнёр',
              3,
            )}
          </div>
          {поле('Чем закончилось', 'итог', 3, 'заполняется в конце периода')}

          <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
            <p className="text-[12.5px] text-ink-3">
              {текущий
                ? `Изменено: ${деньКратко(текущий.updatedAt.slice(0, 10))}`
                : 'План на этот период ещё не начат — начните печатать'}
            </p>
            <Button
              вид={текущий?.закрыт ? 'обычная' : 'контур'}
              размер="малый"
              disabled={!текущий}
              onClick={() => void записать('закрыт', !текущий?.закрыт)}
              onMouseUp={() =>
                сообщить(текущий?.закрыт ? 'Период открыт' : 'Период закрыт')
              }
            >
              <Check size={14} />
              {текущий?.закрыт ? 'Открыть период заново' : 'Закрыть период'}
            </Button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          заголовок="Замыслы вдвоём"
          подпись={
            совместные.length === 0
              ? 'В этом периоде общих замыслов нет'
              : `Из планера — заведён один раз, виден в обоих разделах`
          }
          действие={
            <Button
              вид="контур"
              размер="малый"
              иконка={<Plus size={14} />}
              onClick={() =>
                установитьЧерновикЗамысла({
                  вид: 'поездка',
                  состояние: 'обдумываю',
                  пункты: [],
                  вдвоём: true,
                  // Внутри текущего периода разумнее сегодня, чем его начало:
                  // иначе новый замысел рождается просроченным.
                  датаЦели:
                    сегодня() >= границы.от && сегодня() <= границы.до
                      ? сегодня()
                      : границы.от,
                })
              }
            >
              Завести
            </Button>
          }
        />
        {совместные.length === 0 ? (
          <CardBody>
            <p className="text-[12.5px] leading-relaxed text-ink-3">
              Поездка, покупка или событие, которое делаете вдвоём, заводится
              здесь и живёт в планере — заполнять дважды не нужно.
            </p>
          </CardBody>
        ) : (
          <ul className="divide-y divide-line border-t border-line">
            {совместные.map((замысел) => {
              const сводка = свестиЗамысел(замысел)
              return (
                <li key={замысел.id} className="px-5 py-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => установитьЧерновикЗамысла({ ...замысел })}
                      className="text-[13.5px] font-medium text-ink hover:text-accent"
                    >
                      {замысел.название}
                    </button>
                    <div className="flex items-center gap-1.5">
                      <Badge>{замысел.вид}</Badge>
                      <Badge
                        тон={замысел.состояние === 'сделано' ? 'успех' : 'нейтральный'}
                      >
                        {замысел.состояние}
                      </Badge>
                    </div>
                  </div>
                  <p className="mt-1 text-[12px] text-ink-3">
                    {деньКратко(замысел.датаЦели)}
                    {сводка.готовность === null
                      ? ' · пунктов нет'
                      : ` · ${сводка.выполнено} из ${сводка.всегоПунктов} пунктов`}
                  </p>
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      <IntentionDialog
        key={черновикЗамысла?.id ?? 'новый'}
        черновик={черновикЗамысла}
        наЗакрытие={() => установитьЧерновикЗамысла(null)}
        наСохранение={async (замысел) => {
          if (замысел.id) {
            const текущий = await база.intentions.get(замысел.id)
            if (текущий) {
              await база.intentions.put({
                ...текущий,
                ...замысел,
                updatedAt: сейчас(),
              } as Замысел)
              сообщить('Замысел изменён')
            }
          } else {
            const { id: _без, ...поля } = замысел
            await база.intentions.add(новаяЗапись(поля) as never)
            сообщить('Замысел заведён')
          }
          установитьЧерновикЗамысла(null)
        }}
        наУдаление={async (id) => {
          await база.intentions.delete(id)
          сообщить('Замысел удалён')
          установитьЧерновикЗамысла(null)
        }}
      />

      <Card>
        <CardHeader
          заголовок="Прежние периоды"
          подпись={`Последние записи по горизонту «${горизонт}»`}
        />
        {прошлые.length === 0 ? (
          <EmptyState
            иконка={<CalendarRange size={22} />}
            заголовок="Прежних планов нет"
            подпись="Как только заполните хотя бы один период, он появится здесь."
          />
        ) : (
          <ul className="divide-y divide-line border-t border-line">
            {прошлые.map((план) => (
              <li key={план.id} className="px-5 py-3.5">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      установитьЯкорь(
                        план.горизонт === 'месяц' ? `${план.период}-01` : план.период,
                      )
                    }
                    className="text-[13.5px] font-medium text-ink hover:text-accent"
                  >
                    {названиеПериода(
                      план.горизонт,
                      план.горизонт === 'месяц' ? `${план.период}-01` : план.период,
                    )}
                  </button>
                  {план.закрыт ? <Badge тон="успех">закрыт</Badge> : null}
                </div>
                {план.главное ? (
                  <p className="mt-1 text-[12.5px] leading-relaxed text-ink-2">
                    {план.главное}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
