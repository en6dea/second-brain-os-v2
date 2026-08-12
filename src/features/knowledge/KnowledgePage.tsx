import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ExternalLink, Plus, Star, Trash2 } from 'lucide-react'
import { база } from '@/core/db/db'
import { новаяЗапись } from '@/core/db/repo'
import type { ВидЗнания, ЗаписьЗнания } from '@/core/db/types'
import { деньКратко } from '@/core/calendar/CalendarRu'
import { склонение } from '@/core/language/Plural'
import { сейчас } from '@/core/db/RecordId'
import { useИнтерфейс } from '@/app/providers/ui'
import { читатьНастройки } from '@/core/db/repo'
import {
  Badge,
  Button,
  Card,
  Dialog,
  EmptyState,
  Field,
  IconButton,
  Input,
  Segmented,
  Select,
  Poster,
  Skeleton,
  Textarea,
} from '@/design-system/components'

const ВИДЫ: { ключ: ВидЗнания; подпись: string }[] = [
  { ключ: 'заметка', подпись: 'Заметки' },
  { ключ: 'книга', подпись: 'Книги' },
  { ключ: 'фильм', подпись: 'Фильмы' },
  { ключ: 'ссылка', подпись: 'Ссылки' },
  { ключ: 'инсайт', подпись: 'Инсайты' },
  { ключ: 'инструкция', подпись: 'Инструкции' },
  { ключ: 'исследование', подпись: 'Исследования' },
]

const ТОН_ВИДА: Record<ВидЗнания, 'знание' | 'сведения' | 'нейтральный'> = {
  заметка: 'нейтральный',
  книга: 'знание',
  фильм: 'сведения',
  ссылка: 'сведения',
  инсайт: 'знание',
  инструкция: 'нейтральный',
  исследование: 'знание',
}

export function KnowledgePage() {
  const сообщить = useИнтерфейс((с) => с.сообщить)
  const [отбор, установитьОтбор] = useState<'все' | ВидЗнания>('все')
  const [запрос, установитьЗапрос] = useState('')
  const [черновик, установитьЧерновик] = useState<Partial<ЗаписьЗнания> | null>(
    null,
  )
  const [открытая, установитьОткрытую] = useState<ЗаписьЗнания | null>(null)

  const записи = useLiveQuery(() => база.knowledge.toArray(), [])
  const настройки = useLiveQuery(() => читатьНастройки(), [])
  const показыватьПостеры = настройки?.показыватьПостеры !== false

  const отобранные = useMemo(() => {
    if (!записи) return []
    const низ = запрос.trim().toLowerCase()
    return записи
      .filter((запись) => {
        if (отбор !== 'все' && запись.вид !== отбор) return false
        if (!низ) return true
        return (
          запись.заголовок.toLowerCase().includes(низ) ||
          запись.текст.toLowerCase().includes(низ)
        )
      })
      .sort((а, б) => {
        if (а.избранное !== б.избранное) return а.избранное ? -1 : 1
        return б.updatedAt.localeCompare(а.updatedAt)
      })
  }, [записи, отбор, запрос])

  if (!записи) {
    return (
      <Card>
        <Skeleton строк={5} />
      </Card>
    )
  }

  const поВидам = new Map<ВидЗнания, number>()
  for (const запись of записи) {
    поВидам.set(запись.вид, (поВидам.get(запись.вид) ?? 0) + 1)
  }

  async function сохранить() {
    if (!черновик?.заголовок?.trim()) return
    if (черновик.id) {
      const текущая = await база.knowledge.get(черновик.id)
      if (текущая) {
        await база.knowledge.put({
          ...текущая,
          ...черновик,
          updatedAt: сейчас(),
        } as ЗаписьЗнания)
        сообщить('Запись изменена')
      }
    } else {
      await база.knowledge.add(
        новаяЗапись({
          заголовок: черновик.заголовок.trim(),
          вид: черновик.вид ?? 'заметка',
          текст: черновик.текст ?? '',
          ссылка: черновик.ссылка ?? '',
          меткиId: [],
          папкаId: null,
          проектId: null,
          цельId: null,
          избранное: false,
          постер: черновик.постер ?? '',
        }) as never,
      )
      сообщить('Запись добавлена')
    }
    установитьЧерновик(null)
  }

  return (
    <div className="anim-rise space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[20px] font-semibold text-ink">Знания</h1>
          <p className="mt-0.5 text-[13px] text-ink-3">
            {записи.length}{' '}
            {склонение(записи.length, 'запись', 'записи', 'записей')}
            {отобранные.length !== записи.length
              ? ` · показано ${отобранные.length}`
              : ''}
          </p>
        </div>
        <Button
          вид="основная"
          иконка={<Plus size={16} />}
          onClick={() => установитьЧерновик({ вид: 'заметка' })}
        >
          Запись
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="-mx-1 overflow-x-auto px-1 pb-1">
          <Segmented
            значения={[
              { ключ: 'все' as const, подпись: `Все · ${записи.length}` },
              ...ВИДЫ
                .filter((вид) => (поВидам.get(вид.ключ) ?? 0) > 0)
                .map((вид) => ({
                  ключ: вид.ключ,
                  подпись: `${вид.подпись} · ${поВидам.get(вид.ключ)}`,
                })),
            ]}
            выбрано={отбор}
            наВыбор={установитьОтбор}
          />
        </div>
        <Input
          value={запрос}
          onChange={(событие) => установитьЗапрос(событие.target.value)}
          placeholder="Поиск по заголовку и тексту"
          className="h-9 w-full sm:w-72"
        />
      </div>

      {отобранные.length === 0 ? (
        <Card>
          <EmptyState
            заголовок={
              записи.length === 0 ? 'Записей пока нет' : 'Ничего не найдено'
            }
            подпись={
              записи.length === 0
                ? 'Заметки, книги, статьи, ссылки и выводы — всё, что стоит сохранить и найти потом.'
                : 'Измените отбор или запрос.'
            }
          />
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {отобранные.map((запись) => (
            <Card
              живая
              key={запись.id}
              className="cursor-pointer p-4"
              onClick={() => установитьОткрытую(запись)}
            >
              <div className="flex items-start justify-between gap-3">
                <Poster
                  адрес={запись.постер ?? ''}
                  подпись={запись.заголовок}
                  показывать={показыватьПостеры}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge тон={ТОН_ВИДА[запись.вид]}>{запись.вид}</Badge>
                    <span className="text-[11.5px] text-ink-3">
                      {деньКратко(запись.updatedAt.slice(0, 10))}
                    </span>
                    {запись.избранное ? (
                      <Star size={12} className="text-warn" fill="currentColor" />
                    ) : null}
                  </div>
                  <h2 className="mt-1.5 truncate text-[14.5px] font-medium text-ink">
                    {запись.заголовок}
                  </h2>
                  {запись.текст ? (
                    <p className="mt-1 line-clamp-2 text-[12.5px] leading-relaxed text-ink-3">
                      {запись.текст}
                    </p>
                  ) : null}
                </div>
                {запись.ссылка ? (
                  <ExternalLink size={14} className="mt-1 shrink-0 text-ink-3" />
                ) : null}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* --- Чтение записи --- */}
      <Dialog
        открыто={открытая !== null}
        наЗакрытие={() => установитьОткрытую(null)}
        заголовок={открытая?.заголовок ?? ''}
        подпись={
          открытая
            ? `${открытая.вид} · ${деньКратко(открытая.updatedAt.slice(0, 10))}`
            : undefined
        }
        ширина="широкая"
        подвал={
          открытая ? (
            <>
              <Button
                вид="тихая"
                onClick={async () => {
                  await база.knowledge.put({
                    ...открытая,
                    избранное: !открытая.избранное,
                    updatedAt: сейчас(),
                  })
                  установитьОткрытую(null)
                  сообщить(открытая.избранное ? 'Убрано из важного' : 'В важном')
                }}
              >
                {открытая.избранное ? 'Убрать из важного' : 'В важное'}
              </Button>
              <Button
                onClick={() => {
                  установитьЧерновик(открытая)
                  установитьОткрытую(null)
                }}
              >
                Изменить
              </Button>
            </>
          ) : null
        }
      >
        {открытая ? (
          <div className="space-y-4">
            {открытая.постер && показыватьПостеры ? (
              <img
                src={открытая.постер}
                alt={открытая.заголовок}
                referrerPolicy="no-referrer"
                className="max-h-[320px] rounded-3 border border-line object-contain"
              />
            ) : null}
            {открытая.ссылка ? (
              <a
                href={открытая.ссылка}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1.5 text-[13px] text-accent hover:underline"
              >
                <ExternalLink size={13} />
                {открытая.ссылка}
              </a>
            ) : null}

            <p className="text-[13.5px] leading-relaxed whitespace-pre-wrap text-ink-2">
              {открытая.текст || 'Текста нет.'}
            </p>

            {открытая.legacy ? (
              <details className="rounded-3 border border-line bg-sunken px-4 py-3">
                <summary className="cursor-pointer text-[12px] text-ink-3">
                  Данные из прежней версии
                </summary>
                <pre className="mt-2 overflow-x-auto text-[11.5px] whitespace-pre-wrap text-ink-3">
                  {JSON.stringify(открытая.legacy, null, 2)}
                </pre>
              </details>
            ) : null}
          </div>
        ) : null}
      </Dialog>

      {/* --- Правка --- */}
      <Dialog
        открыто={черновик !== null}
        наЗакрытие={() => установитьЧерновик(null)}
        заголовок={черновик?.id ? 'Изменить запись' : 'Новая запись'}
        ширина="широкая"
        подвал={
          <>
            {черновик?.id ? (
              <IconButton
                подпись="Удалить запись"
                className="mr-auto"
                onClick={async () => {
                  await база.knowledge.delete(черновик.id as string)
                  установитьЧерновик(null)
                  сообщить('Запись удалена')
                }}
              >
                <Trash2 size={15} />
              </IconButton>
            ) : null}
            <Button вид="тихая" onClick={() => установитьЧерновик(null)}>
              Отмена
            </Button>
            <Button
              вид="основная"
              onClick={сохранить}
              disabled={!черновик?.заголовок?.trim()}
            >
              Сохранить
            </Button>
          </>
        }
      >
        {черновик ? (
          <div className="space-y-4">
            <Field подпись="Заголовок" обязательное>
              <Input
                value={черновик.заголовок ?? ''}
                onChange={(событие) =>
                  установитьЧерновик({
                    ...черновик,
                    заголовок: событие.target.value,
                  })
                }
                autoFocus
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field подпись="Вид">
                <Select
                  value={черновик.вид ?? 'заметка'}
                  onChange={(событие) =>
                    установитьЧерновик({
                      ...черновик,
                      вид: событие.target.value as ВидЗнания,
                    })
                  }
                >
                  {ВИДЫ.map((вид) => (
                    <option key={вид.ключ} value={вид.ключ}>
                      {вид.подпись}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field подпись="Ссылка">
                <Input
                  value={черновик.ссылка ?? ''}
                  onChange={(событие) =>
                    установитьЧерновик({
                      ...черновик,
                      ссылка: событие.target.value,
                    })
                  }
                  placeholder="Необязательно"
                />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
              <Field
                подпись="Обложка по адресу"
                подсказка="Постер фильма или обложка книги. Картинка грузится с чужого сервера"
              >
                <Input
                  value={черновик.постер ?? ''}
                  onChange={(событие) =>
                    установитьЧерновик({
                      ...черновик,
                      постер: событие.target.value,
                    })
                  }
                  placeholder="https://…"
                />
              </Field>
              <Poster
                адрес={черновик.постер ?? ''}
                подпись="Предпросмотр обложки"
                показывать={показыватьПостеры}
              />
            </div>
            <Field подпись="Текст">
              <Textarea
                rows={12}
                value={черновик.текст ?? ''}
                onChange={(событие) =>
                  установитьЧерновик({ ...черновик, текст: событие.target.value })
                }
              />
            </Field>
          </div>
        ) : null}
      </Dialog>
    </div>
  )
}
