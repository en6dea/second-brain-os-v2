import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ClipboardList, Plus } from 'lucide-react'
import { база } from '@/core/db/db'
import { новаяЗапись } from '@/core/db/repo'
import { сейчас } from '@/core/db/RecordId'
import type { Замысел, ВидЗамысла } from '@/core/db/types'
import { деньКратко } from '@/core/calendar/CalendarRu'
import { деньгиКратко } from '@/core/money/Money'
import { свестиЗамысел, следующийПункт } from './model/Planner'
import { IntentionDialog } from './IntentionDialog'
import { useИнтерфейс } from '@/app/providers/ui'
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Metric,
  ProgressBar,
  Skeleton,
} from '@/design-system/components'

const ВИДЫ: { ключ: ВидЗамысла | 'все'; подпись: string }[] = [
  { ключ: 'все', подпись: 'Все' },
  { ключ: 'покупка', подпись: 'Покупки' },
  { ключ: 'поездка', подпись: 'Поездки' },
  { ключ: 'проект', подпись: 'Проекты' },
  { ключ: 'событие', подпись: 'События' },
  { ключ: 'план', подпись: 'Планы' },
]

const ТОН_СОСТОЯНИЯ = {
  обдумываю: 'нейтральный',
  готовлюсь: 'сведения',
  'в работе': 'внимание',
  сделано: 'успех',
  отменено: 'нейтральный',
} as const

/**
 * Планер.
 *
 * Покупка, поездка, проект, событие и обычный план — в одном месте. Вид не
 * заводит отдельную сущность, а меняет подсказки и то, что показано в сводке:
 * у покупки важны деньги, у поездки — срок, у проекта — этапы.
 */
export function PlannerPage() {
  const сообщить = useИнтерфейс((с) => с.сообщить)
  const [отбор, установитьОтбор] = useState<ВидЗамысла | 'все'>('все')
  const [черновик, установитьЧерновик] = useState<Partial<Замысел> | null>(null)

  const замыслы = useLiveQuery(() => база.intentions.toArray(), [])

  const отобранные = useMemo(() => {
    if (!замыслы) return []
    const открытые = замыслы.filter(
      (замысел) => замысел.состояние !== 'отменено' && замысел.состояние !== 'сделано',
    )
    const закрытые = замыслы.filter(
      (замысел) => замысел.состояние === 'отменено' || замысел.состояние === 'сделано',
    )
    const все = [...открытые, ...закрытые]
    return отбор === 'все' ? все : все.filter((замысел) => замысел.вид === отбор)
  }, [замыслы, отбор])

  if (!замыслы) {
    return (
      <Card className="p-5">
        <Skeleton строк={5} />
      </Card>
    )
  }

  const открытых = замыслы.filter(
    (замысел) => замысел.состояние !== 'сделано' && замысел.состояние !== 'отменено',
  ).length

  return (
    <div className="anim-rise space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[20px] font-semibold text-ink">Планер</h1>
          <p className="mt-0.5 text-[13px] text-ink-3">
            Покупка, поездка, проект, событие или просто план — в одном месте
          </p>
        </div>
        <Button
          вид="основная"
          иконка={<Plus size={16} />}
          onClick={() =>
            установитьЧерновик({
              вид: отбор === 'все' ? 'план' : отбор,
              состояние: 'обдумываю',
              пункты: [],
            })
          }
        >
          Замысел
        </Button>
      </div>

      <div className="-mx-1 flex flex-wrap gap-1 overflow-x-auto px-1 pb-1">
        {ВИДЫ.map((вариант) => (
          <button
            key={вариант.ключ}
            type="button"
            aria-pressed={отбор === вариант.ключ}
            onClick={() => установитьОтбор(вариант.ключ)}
            className={
              отбор === вариант.ключ
                ? 'rounded-2 border border-transparent bg-accent px-3.5 py-1.5 text-[13px] font-medium text-on-accent'
                : 'rounded-2 border border-line px-3.5 py-1.5 text-[13px] font-medium text-ink-3 transition-colors hover:border-accent-line hover:text-ink-2'
            }
          >
            {вариант.подпись}
          </button>
        ))}
      </div>

      {отобранные.length === 0 ? (
        <Card>
          <EmptyState
            иконка={<ClipboardList size={20} />}
            заголовок={
              замыслы.length === 0 ? 'Замыслов пока нет' : 'В этом виде ничего нет'
            }
            подпись="Заведите замысел — покупку, поездку, проект. Приложение подскажет пункты, о которых обычно забывают, и посчитает деньги и сроки из того, что вы впишете."
            действие={
              <Button
                вид="контур"
                onClick={() =>
                  установитьЧерновик({
                    вид: отбор === 'все' ? 'план' : отбор,
                    состояние: 'обдумываю',
                    пункты: [],
                  })
                }
              >
                Создать замысел
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {отобранные.map((замысел) => {
            const сводка = свестиЗамысел(замысел)
            const шаг = следующийПункт(замысел)
            const закрыт =
              замысел.состояние === 'сделано' || замысел.состояние === 'отменено'

            return (
              <Card key={замысел.id} живая className={закрыт ? 'opacity-60' : undefined}>
                <CardHeader
                  заголовок={замысел.название}
                  подпись={замысел.зачем || 'Ответ на вопрос «зачем» не записан'}
                  действие={
                    <Button
                      вид="тихая"
                      размер="малый"
                      onClick={() => установитьЧерновик({ ...замысел })}
                    >
                      Открыть
                    </Button>
                  }
                />

                <div className="space-y-3 px-5 pb-5">
                  <div className="flex flex-wrap gap-1.5">
                    <Badge>{замысел.вид}</Badge>
                    <Badge тон={ТОН_СОСТОЯНИЯ[замысел.состояние]}>
                      {замысел.состояние}
                    </Badge>
                    {замысел.датаЦели ? (
                      <Badge
                        тон={
                          сводка.днейДоЦели !== null && сводка.днейДоЦели < 0 && !закрыт
                            ? 'опасность'
                            : 'нейтральный'
                        }
                      >
                        {деньКратко(замысел.датаЦели)}
                        {сводка.днейДоЦели !== null && !закрыт
                          ? ` · ${сводка.днейДоЦели} дн.`
                          : ''}
                      </Badge>
                    ) : null}
                  </div>

                  {сводка.готовность === null ? (
                    <p className="text-[12.5px] text-ink-3">
                      Пунктов нет — готовность не считается.
                    </p>
                  ) : (
                    <ProgressBar
                      значение={сводка.выполнено}
                      из={сводка.всегоПунктов}
                      подпись={`${сводка.выполнено} из ${сводка.всегоПунктов} пунктов`}
                      тон={сводка.готовность === 100 ? 'успех' : 'нейтральный'}
                    />
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <Metric
                      единица="₽ · бюджет"
                      подпись="Готовы потратить"
                      значение={
                        замысел.бюджет === null ? '—' : деньгиКратко(замысел.бюджет)
                      }
                      источник={
                        замысел.бюджет === null
                          ? 'сумма не решена'
                          : `отложено: ${деньгиКратко(замысел.отложено ?? 0)}`
                      }
                    />
                    <Metric
                      единица="₽ · по пунктам"
                      подпись="Посчитано"
                      значение={
                        сводка.посчитаноПоПунктам === null
                          ? '—'
                          : деньгиКратко(сводка.посчитаноПоПунктам)
                      }
                      источник={
                        сводка.посчитаноПоПунктам === null
                          ? 'у пунктов нет цен'
                          : `без цены: ${сводка.пунктовБезЦены}`
                      }
                      тон={
                        сводка.остатокБюджета !== null && сводка.остатокБюджета < 0
                          ? 'опасность'
                          : undefined
                      }
                    />
                  </div>

                  {шаг && !закрыт ? (
                    <p className="text-[12.5px] leading-relaxed text-ink-2">
                      <span className="font-medium text-ink">Дальше: </span>
                      {шаг}
                    </p>
                  ) : null}

                  {сводка.замечания.length > 0 && !закрыт ? (
                    <ul className="space-y-1">
                      {сводка.замечания.map((текст) => (
                        <li key={текст} className="text-[12px] text-ink-3">
                          {текст}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <IntentionDialog
        key={черновик?.id ?? 'новый'}
        черновик={черновик}
        наЗакрытие={() => установитьЧерновик(null)}
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
            await база.intentions.add(новаяЗапись(замысел) as never)
            сообщить('Замысел заведён')
          }
          установитьЧерновик(null)
        }}
        наУдаление={async (id) => {
          await база.intentions.delete(id)
          сообщить('Замысел удалён')
          установитьЧерновик(null)
        }}
      />

      {открытых > 0 ? (
        <p className="text-center text-[12px] text-ink-3">
          Открытых замыслов: {открытых}. Всё, что закрыто, остаётся в списке ниже.
        </p>
      ) : null}
    </div>
  )
}
