import { useState } from 'react'
import { Check, MessageCircleQuestion, RefreshCw } from 'lucide-react'
import { база } from '@/core/db/db'
import { новаяЗапись } from '@/core/db/repo'
import { сейчас } from '@/core/db/RecordId'
import type { ЗаписьДневника, Согласие } from '@/core/db/types'
import { сегодня } from '@/core/calendar/CalendarRu'
import { другоеУтверждение, утверждениеДня } from './model/Prompts'
import { useИнтерфейс } from '@/app/providers/ui'
import { cn } from '@/design-system/classNames'
import { useОтклик } from '@/design-system/motion/CountUp'
import { Flash } from '@/design-system/motion/Ping'
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  Field,
  Textarea,
} from '@/design-system/components'

const ОТВЕТЫ: { ключ: Согласие; подпись: string }[] = [
  { ключ: 'да', подпись: 'Согласен' },
  { ключ: 'отчасти', подпись: 'Отчасти' },
  { ключ: 'нет', подпись: 'Не согласен' },
]

/**
 * Разговор с собой.
 *
 * Утверждение дня, на которое человек отвечает тремя ходами: что чувствую,
 * что думаю, согласен ли. Порядок именно такой — чувство раньше мысли,
 * иначе разговор сворачивается в объяснение самому себе.
 *
 * Запись за день одна: вернувшись вечером, человек дополняет утреннюю, а не
 * заводит вторую.
 */
export function SelfTalkCard({
  записи,
  своиУтверждения,
}: {
  записи: ЗаписьДневника[]
  своиУтверждения: string[]
}) {
  const сообщить = useИнтерфейс((с) => с.сообщить)
  const [отклик, запуститьОтклик] = useОтклик(240)
  const день = сегодня()

  const сегодняшняя =
    записи.find((запись) => запись.дата === день && запись.вид === 'подсознание') ??
    null

  // Поля берут начальное значение один раз. Синхронизировать их с базой
  // эффектом нельзя: живой запрос отдаёт новый объект после каждой записи,
  // и эффект стирал бы то, что человек печатает прямо сейчас. Когда запись
  // за день меняется, карточка пересоздаётся по ключу из родителя.
  const [сдвиг, установитьСдвиг] = useState(0)
  const [чувствую, установитьЧувствую] = useState(сегодняшняя?.чтоЧувствую ?? '')
  const [думаю, установитьДумаю] = useState(сегодняшняя?.чтоДумаю ?? '')
  const [согласие, установитьСогласие] = useState<Согласие | null>(
    сегодняшняя?.согласие ?? null,
  )

  const утверждение = сегодняшняя?.утверждение
    ? {
        текст: сегодняшняя.утверждение,
        источник: 'набор' as const,
        номер: 0,
        всего: 0,
      }
    : сдвиг === 0
      ? утверждениеДня(день, своиУтверждения)
      : другоеУтверждение(день, своиУтверждения, сдвиг)

  const заполнено = чувствую.trim() || думаю.trim() || согласие !== null

  async function сохранить() {
    if (!заполнено) return
    const поля = {
      дата: день,
      вид: 'подсознание' as const,
      заголовок: утверждение.текст,
      текст: '',
      настроение: null,
      сон: null,
      личное: true,
      утверждение: утверждение.текст,
      чтоЧувствую: чувствую.trim(),
      чтоДумаю: думаю.trim(),
      согласие,
    }

    if (сегодняшняя) {
      await база.journal.put({ ...сегодняшняя, ...поля, updatedAt: сейчас() })
      сообщить('Разговор дополнен')
    } else {
      await база.journal.add(новаяЗапись(поля) as never)
      сообщить('Разговор записан')
    }
    запуститьОтклик()
  }

  return (
    // Проблеск по карточке: ответ записан. Раньше дневник на сохранение
    // не отзывался ничем, кроме строки внизу экрана.
    <Card className="relative overflow-hidden">
      <Flash активен={отклик} />
      <CardHeader
        заголовок="Разговор с собой"
        подпись={
          сегодняшняя
            ? 'Сегодня уже отвечали — можно дополнить'
            : 'Утверждение дня. Спорить с ним полезнее, чем соглашаться'
        }
        действие={
          сегодняшняя ? null : (
            <Button
              вид="тихая"
              размер="малый"
              иконка={<RefreshCw size={14} />}
              onClick={() => установитьСдвиг((текущий) => текущий + 1)}
            >
              Другое
            </Button>
          )
        }
      />

      <CardBody className="space-y-4">
        <blockquote className="rounded-3 border border-accent-line bg-accent-soft px-4 py-3.5">
          <p className="text-body leading-relaxed font-medium text-ink">
            {утверждение.текст}
          </p>
          {утверждение.всего > 0 ? (
            <p className="mt-1.5 flex items-center gap-1.5 text-caption text-ink-3">
              <MessageCircleQuestion size={12} />
              {утверждение.источник === 'своё'
                ? 'ваша формулировка'
                : `${утверждение.номер} из ${утверждение.всего} в круге`}
            </p>
          ) : null}
        </blockquote>

        <Field подпись="Что я чувствую" подсказка="сначала чувство, потом мысль">
          <Textarea
            rows={2}
            value={чувствую}
            onChange={(событие) => установитьЧувствую(событие.target.value)}
          />
        </Field>

        <Field подпись="Что я думаю">
          <Textarea
            rows={3}
            value={думаю}
            onChange={(событие) => установитьДумаю(событие.target.value)}
          />
        </Field>

        <Field подпись="Согласен ли я с этим">
          <div className="flex flex-wrap gap-2">
            {ОТВЕТЫ.map((ответ) => (
              <button
                key={ответ.ключ}
                type="button"
                aria-pressed={согласие === ответ.ключ}
                onClick={() =>
                  установитьСогласие(согласие === ответ.ключ ? null : ответ.ключ)
                }
                className={cn(
                  'rounded-2 border px-3.5 py-2 text-meta font-medium transition-colors duration-150 active:scale-[0.97]',
                  согласие === ответ.ключ
                    ? 'border-transparent bg-accent text-on-accent'
                    : 'border-line text-ink-2 hover:border-accent-line hover:bg-accent-soft',
                )}
              >
                {ответ.подпись}
              </button>
            ))}
          </div>
        </Field>

        <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
          <p className="text-caption text-ink-3">
            {сегодняшняя ? (
              <Badge тон="знание">записано сегодня</Badge>
            ) : (
              'После настройки синхронизируется как и всё остальное'
            )}
          </p>
          <Button
            вид="основная"
            размер="малый"
            иконка={<Check size={14} />}
            disabled={!заполнено}
            onClick={сохранить}
          >
            {сегодняшняя ? 'Дополнить' : 'Записать'}
          </Button>
        </div>
      </CardBody>
    </Card>
  )
}
