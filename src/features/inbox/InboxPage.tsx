import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowRight, Trash2 } from 'lucide-react'
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
} from '@/design-system/components'

export function InboxPage() {
  const сообщить = useИнтерфейс((с) => с.сообщить)
  const [новая, установитьНовую] = useState('')

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

  async function вЗадачу(запись: Входящее) {
    await база.tasks.add(
      новаяЗапись({
        название: запись.текст.slice(0, 200),
        заметка: '',
        дата: сегодня(),
        время: null,
        длительностьМинут: null,
        состояние: 'новая',
        важность: 'обычная',
        проектId: null,
        цельId: null,
        сфераId: null,
        выполненаВ: null,
        переносов: 0,
        повтор: null,
      }) as never,
    )
    await база.inbox.put({ ...запись, разобрано: true, updatedAt: сейчас() })
    сообщить('Стало задачей на сегодня')
  }

  async function вЗаметку(запись: Входящее) {
    await база.knowledge.add(
      новаяЗапись({
        заголовок: запись.текст.slice(0, 80),
        вид: 'заметка',
        текст: запись.текст,
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
    сообщить('Сохранено в знания')
  }

  return (
    <div className="anim-rise space-y-5">
      <div>
        <h1 className="text-h2 font-semibold text-ink">Разбор</h1>
        <p className="mt-0.5 text-meta text-ink-3">
          Сюда попадает всё, что записано на бегу. Разобрать — значит превратить
          мысль в задачу, заметку или удалить.
        </p>
      </div>

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
                <p className="min-w-0 flex-1 text-meta text-ink">
                  {запись.текст}
                </p>
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
                    подпись="Удалить запись"
                    onClick={async () => {
                      await база.inbox.delete(запись.id)
                      сообщить('Удалено')
                    }}
                  >
                    <Trash2 size={15} />
                  </IconButton>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
