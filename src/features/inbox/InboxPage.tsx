import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Archive, ArrowRight, Sparkles } from 'lucide-react'
import { база } from '@/core/db/db'
import { новаяЗапись } from '@/core/db/repo'
import type { Входящее } from '@/core/db/types'
import { сегодня } from '@/core/calendar/CalendarRu'
import { склонение } from '@/core/language/Plural'
import { сейчас } from '@/core/db/RecordId'
import { useИнтерфейс } from '@/app/providers/ui'
import {
  Input,
  Skeleton,
  Card,
  Button,
  IconButton,
  EmptyState,
  CardHeader,
  CardBody,
  Badge,
} from '@/design-system/components'
import { ЗНАЧОК } from '@/design-system/iconSize'
import {
  InboxReviewDialog,
  type ЧерновикЗадачиРазбора,
  type ЧерновикЗаметкиРазбора,
} from './InboxReviewDialog'

export function InboxPage() {
  const сообщить = useИнтерфейс((с) => с.сообщить)
  const [новая, установитьНовую] = useState('')
  const [разборОткрыт, установитьРазборОткрыт] = useState(false)

  const записи = useLiveQuery(
    () => база.inbox.filter((з) => !з.разобрано).toArray(),
    [],
  )

  if (!записи) {
    return (
      <Card>
        <Skeleton строк={4} />
      </Card>
    )
  }

  async function добавить() {
    if (!новая.trim()) return
    await база.inbox.add(
      новаяЗапись({
        текст: новая.trim(),
        разобрано: false,
        источник: 'быстрая запись',
      }) as never,
    )
    установитьНовую('')
  }

  async function вЗадачу(
    запись: Входящее,
    черновик: ЧерновикЗадачиРазбора = {
      название: запись.текст.slice(0, 200),
      заметка: '',
      дата: сегодня(),
      длительностьМинут: null,
      важность: 'обычная',
    },
  ) {
    await база.transaction('rw', база.tasks, база.inbox, async () => {
      await база.tasks.add(
        новаяЗапись({
          название: черновик.название,
          заметка: черновик.заметка,
          дата: черновик.дата,
          время: null,
          длительностьМинут: черновик.длительностьМинут,
          состояние: 'новая',
          важность: черновик.важность,
          проектId: null,
          цельId: null,
          сфераId: null,
          выполненаВ: null,
          переносов: 0,
          повтор: null,
        }) as never,
      )
      await база.inbox.put({ ...запись, разобрано: true, updatedAt: сейчас() })
    })
    сообщить(
      черновик.дата === сегодня()
        ? 'Стало задачей на сегодня'
        : 'Стало задачей без даты',
    )
  }

  async function вЗаметку(
    запись: Входящее,
    черновик: ЧерновикЗаметкиРазбора = {
      заголовок: запись.текст.slice(0, 80),
      текст: запись.текст,
    },
  ) {
    await база.transaction('rw', база.knowledge, база.inbox, async () => {
      await база.knowledge.add(
        новаяЗапись({
          заголовок: черновик.заголовок,
          вид: 'заметка',
          текст: черновик.текст,
          ссылка: '',
          постер: '',
          меткиId: [],
          папкаId: null,
          проектId: null,
          цельId: null,
          избранное: false,
        }) as never,
      )
      await база.inbox.put({ ...запись, разобрано: true, updatedAt: сейчас() })
    })
    сообщить('Сохранено в знания')
  }

  async function отпустить(запись: Входящее) {
    await база.inbox.put({ ...запись, разобрано: true, updatedAt: сейчас() })
    сообщить('Убрано из разбора — исходная запись сохранена')
  }

  return (
    <div className="anim-rise space-y-5">
      <div>
        <h1 className="text-h2 font-semibold text-ink">Разбор</h1>
        <p className="mt-0.5 text-meta text-ink-3">
          Сюда попадает всё, что записано на бегу. Разобрать — значит превратить
          мысль в действие, знание или спокойно отпустить.
        </p>
      </div>

      <Card className="overflow-hidden">
        <CardBody className="grid gap-5 pt-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-h3 font-medium text-ink">Разбор за 5 минут</h2>
              <Badge тон={записи.length > 0 ? 'знание' : 'нейтральный'}>
                {записи.length}{' '}
                {склонение(записи.length, 'запись', 'записи', 'записей')}
              </Badge>
            </div>
            <p className="mt-2 max-w-2xl text-meta leading-relaxed text-ink-2">
              Одна мысль за раз: выделить микрошаг, сохранить вывод или убрать из
              очереди без удаления. Решение попадёт в данные только после
              подтверждения.
            </p>
          </div>
          <Button
            вид="основная"
            размер="большой"
            иконка={<Sparkles size={ЗНАЧОК.строка} />}
            disabled={записи.length === 0}
            onClick={() => установитьРазборОткрыт(true)}
          >
            {записи.length === 0 ? 'Очередь пуста' : 'Начать разбор'}
          </Button>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="pt-5">
          <div className="flex gap-2">
            <Input
              value={новая}
              onChange={(событие) => установитьНовую(событие.target.value)}
              onKeyDown={(событие) => {
                if (событие.key === 'Enter') void добавить()
              }}
              placeholder="Записать мысль, не отвлекаясь на подробности"
            />
            <Button вид="основная" onClick={добавить} disabled={!новая.trim()}>
              Записать
            </Button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          заголовок="Ждут разбора"
          подпись={`${записи.length} ${склонение(записи.length, 'запись', 'записи', 'записей')}`}
        />
        {записи.length === 0 ? (
          <EmptyState
            заголовок="Разбирать нечего"
            подпись="Пусто — это хорошее состояние для этого раздела."
          />
        ) : (
          <div className="divide-y divide-line border-t border-line">
            {записи.map((запись) => (
              <div
                key={запись.id}
                className="flex flex-wrap items-center gap-3 px-5 py-3"
              >
                <p className="min-w-0 flex-1 text-meta text-ink">{запись.текст}</p>
                <div className="flex shrink-0 gap-1.5">
                  <Button
                    размер="малый"
                    иконка={<ArrowRight size={14} />}
                    onClick={() => вЗадачу(запись)}
                  >
                    В задачи
                  </Button>
                  <Button размер="малый" onClick={() => вЗаметку(запись)}>
                    В знания
                  </Button>
                  <IconButton
                    подпись="Убрать из разбора без удаления"
                    onClick={() => void отпустить(запись)}
                  >
                    <Archive size={15} />
                  </IconButton>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <InboxReviewDialog
        открыто={разборОткрыт}
        записи={записи}
        наЗакрытие={() => установитьРазборОткрыт(false)}
        наЗадачу={вЗадачу}
        наЗаметку={вЗаметку}
        наОтпустить={отпустить}
      />
    </div>
  )
}
