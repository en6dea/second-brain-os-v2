import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Cake, Mail, Phone, Plus, Trash2 } from 'lucide-react'
import { база } from '@/core/db/db'
import { новаяЗапись } from '@/core/db/repo'
import type { Человек } from '@/core/db/types'
import { деньСловами, днейДо, сегодня } from '@/core/calendar/CalendarRu'
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
  Poster,
  Skeleton,
  Textarea,
} from '@/design-system/components'

/** Сколько дней осталось до ближайшего дня рождения. */
function днейДоДняРождения(деньРождения: string | null): number | null {
  if (!деньРождения) return null
  const сегодняшний = сегодня()
  const год = Number(сегодняшний.slice(0, 4))
  const хвост = деньРождения.slice(5)
  const вЭтомГоду = `${год}-${хвост}`
  const осталось = днейДо(вЭтомГоду)
  if (осталось === null) return null
  if (осталось >= 0) return осталось
  return днейДо(`${год + 1}-${хвост}`)
}

export function PeoplePage() {
  const сообщить = useИнтерфейс((с) => с.сообщить)
  const [запрос, установитьЗапрос] = useState('')
  const [черновик, установитьЧерновик] = useState<Partial<Человек> | null>(null)
  const [открытый, установитьОткрытого] = useState<Человек | null>(null)

  const люди = useLiveQuery(() => база.people.toArray(), [])
  const настройки = useLiveQuery(() => читатьНастройки(), [])
  const показыватьПостеры = настройки?.показыватьПостеры !== false

  const отобранные = useMemo(() => {
    if (!люди) return []
    const низ = запрос.trim().toLowerCase()
    return люди
      .filter(
        (человек) =>
          !низ ||
          человек.имя.toLowerCase().includes(низ) ||
          человек.отношения.toLowerCase().includes(низ) ||
          человек.заметка.toLowerCase().includes(низ),
      )
      .sort((а, б) => {
        const дА = днейДоДняРождения(а.деньРождения) ?? 999
        const дБ = днейДоДняРождения(б.деньРождения) ?? 999
        if (дА !== дБ) return дА - дБ
        return а.имя.localeCompare(б.имя, 'ru')
      })
  }, [люди, запрос])

  if (!люди) {
    return (
      <Card>
        <Skeleton строк={4} />
      </Card>
    )
  }

  const ближайшие = люди
    .map((человек) => ({ человек, дней: днейДоДняРождения(человек.деньРождения) }))
    .filter(
      (строка): строка is { человек: Человек; дней: number } =>
        строка.дней !== null && строка.дней <= 30,
    )
    .sort((а, б) => а.дней - б.дней)

  async function сохранить() {
    if (!черновик?.имя?.trim()) return
    if (черновик.id) {
      const текущий = await база.people.get(черновик.id)
      if (текущий) {
        await база.people.put({
          ...текущий,
          ...черновик,
          updatedAt: сейчас(),
        } as Человек)
        сообщить('Запись изменена')
      }
    } else {
      await база.people.add(
        новаяЗапись({
          имя: черновик.имя.trim(),
          отношения: черновик.отношения ?? '',
          телефон: черновик.телефон ?? '',
          почта: черновик.почта ?? '',
          деньРождения: черновик.деньРождения ?? null,
          важныеДаты: [],
          заметка: черновик.заметка ?? '',
          обещания: черновик.обещания ?? '',
          подарки: черновик.подарки ?? '',
          последнийКонтакт: черновик.последнийКонтакт ?? null,
          напоминатьЧерезДней: черновик.напоминатьЧерезДней ?? null,
          постер: черновик.постер ?? '',
        }) as never,
      )
      сообщить('Человек добавлен')
    }
    установитьЧерновик(null)
  }

  return (
    <div className="anim-rise space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[20px] font-semibold text-ink">Люди</h1>
          <p className="mt-0.5 text-[13px] text-ink-3">
            {люди.length} {склонение(люди.length, 'человек', 'человека', 'человек')}{' '}
            · отношения требуют памяти
          </p>
        </div>
        <Button
          вид="основная"
          иконка={<Plus size={16} />}
          onClick={() => установитьЧерновик({})}
        >
          Человек
        </Button>
      </div>

      {ближайшие.length > 0 ? (
        <Card>
          <div className="flex flex-wrap items-center gap-2 px-5 py-3.5">
            <Cake size={15} className="shrink-0 text-warn" />
            <span className="text-[12.5px] text-ink-2">Скоро дни рождения:</span>
            {ближайшие.map(({ человек, дней }) => (
              <Badge key={человек.id} тон={дней <= 7 ? 'внимание' : 'нейтральный'}>
                {человек.имя} ·{' '}
                {дней === 0
                  ? 'сегодня'
                  : `через ${дней} ${склонение(дней, 'день', 'дня', 'дней')}`}
              </Badge>
            ))}
          </div>
        </Card>
      ) : null}

      <Input
        value={запрос}
        onChange={(событие) => установитьЗапрос(событие.target.value)}
        placeholder="Поиск по имени, отношениям и заметкам"
        className="h-9 w-full sm:w-80"
      />

      {отобранные.length === 0 ? (
        <Card>
          <EmptyState
            заголовок={люди.length === 0 ? 'Людей пока нет' : 'Никто не найден'}
            подпись={
              люди.length === 0
                ? 'Кому что обещано, когда вы последний раз связывались, что подарить — это не держится в голове.'
                : 'Измените запрос.'
            }
          />
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {отобранные.map((человек) => {
            const дней = днейДоДняРождения(человек.деньРождения)
            return (
              <Card
                живая
                key={человек.id}
                className="cursor-pointer p-4"
                onClick={() => установитьОткрытого(человек)}
              >
                <div className="flex items-start gap-3">
                  <Poster
                    адрес={человек.постер ?? ''}
                    подпись={человек.имя}
                    размер="значок"
                    запасное={человек.имя.slice(0, 1).toUpperCase()}
                    показывать={показыватьПостеры}
                    className="bg-accent-soft text-accent"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-medium text-ink">
                      {человек.имя}
                    </p>
                    {человек.отношения ? (
                      <p className="truncate text-[12px] text-ink-3">
                        {человек.отношения}
                      </p>
                    ) : null}
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {дней !== null ? (
                        <Badge тон={дней <= 14 ? 'внимание' : 'нейтральный'}>
                          <Cake size={11} />
                          {дней === 0 ? 'сегодня' : `через ${дней} дн`}
                        </Badge>
                      ) : null}
                      {человек.обещания ? (
                        <Badge тон="сведения">обещания</Badge>
                      ) : null}
                      {человек.телефон ? (
                        <Badge>
                          <Phone size={11} />
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* --- Карточка человека --- */}
      <Dialog
        открыто={открытый !== null}
        наЗакрытие={() => установитьОткрытого(null)}
        заголовок={открытый?.имя ?? ''}
        подпись={открытый?.отношения || undefined}
        ширина="широкая"
        подвал={
          открытый ? (
            <Button
              onClick={() => {
                установитьЧерновик(открытый)
                установитьОткрытого(null)
              }}
            >
              Изменить
            </Button>
          ) : null
        }
      >
        {открытый ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Poster
                адрес={открытый.постер ?? ''}
                подпись={открытый.имя}
                размер="карточка"
                запасное={открытый.имя.slice(0, 1).toUpperCase()}
                показывать={показыватьПостеры}
                className="bg-accent-soft text-accent"
              />
              <p className="text-[12.5px] text-ink-3">
                {открытый.отношения || 'Кем приходится — не записано'}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {открытый.телефон ? (
                <a
                  href={`tel:${открытый.телефон}`}
                  className="inline-flex items-center gap-1.5 rounded-2 border border-line px-3 py-1.5 text-[13px] text-ink-2 hover:bg-hover"
                >
                  <Phone size={13} />
                  {открытый.телефон}
                </a>
              ) : null}
              {открытый.почта ? (
                <a
                  href={`mailto:${открытый.почта}`}
                  className="inline-flex items-center gap-1.5 rounded-2 border border-line px-3 py-1.5 text-[13px] text-ink-2 hover:bg-hover"
                >
                  <Mail size={13} />
                  {открытый.почта}
                </a>
              ) : null}
              {открытый.деньРождения ? (
                <span className="inline-flex items-center gap-1.5 rounded-2 border border-line px-3 py-1.5 text-[13px] text-ink-2">
                  <Cake size={13} />
                  {деньСловами(открытый.деньРождения)}
                </span>
              ) : null}
            </div>

            {[
              { подпись: 'О человеке', текст: открытый.заметка },
              { подпись: 'Обещания', текст: открытый.обещания },
              { подпись: 'Подарки', текст: открытый.подарки },
            ]
              .filter((блок) => блок.текст)
              .map((блок) => (
                <div key={блок.подпись}>
                  <p className="mb-1 text-[11px] font-semibold tracking-[0.14em] text-ink-3 uppercase">
                    {блок.подпись}
                  </p>
                  <p className="text-[13.5px] leading-relaxed whitespace-pre-wrap text-ink-2">
                    {блок.текст}
                  </p>
                </div>
              ))}

            {открытый.последнийКонтакт ? (
              <p className="text-[12.5px] text-ink-3">
                Последний контакт: {деньСловами(открытый.последнийКонтакт)}
              </p>
            ) : null}
          </div>
        ) : null}
      </Dialog>

      {/* --- Правка --- */}
      <Dialog
        открыто={черновик !== null}
        наЗакрытие={() => установитьЧерновик(null)}
        заголовок={черновик?.id ? 'Изменить человека' : 'Новый человек'}
        ширина="широкая"
        подвал={
          <>
            {черновик?.id ? (
              <IconButton
                подпись="Удалить"
                className="mr-auto"
                onClick={async () => {
                  await база.people.delete(черновик.id as string)
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
              disabled={!черновик?.имя?.trim()}
            >
              Сохранить
            </Button>
          </>
        }
      >
        {черновик ? (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field подпись="Имя" обязательное>
                <Input
                  value={черновик.имя ?? ''}
                  onChange={(событие) =>
                    установитьЧерновик({ ...черновик, имя: событие.target.value })
                  }
                  autoFocus
                />
              </Field>
              <Field подпись="Кто это вам">
                <Input
                  value={черновик.отношения ?? ''}
                  onChange={(событие) =>
                    установитьЧерновик({
                      ...черновик,
                      отношения: событие.target.value,
                    })
                  }
                  placeholder="друг, коллега, родственник"
                />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field подпись="Телефон">
                <Input
                  value={черновик.телефон ?? ''}
                  onChange={(событие) =>
                    установитьЧерновик({
                      ...черновик,
                      телефон: событие.target.value,
                    })
                  }
                />
              </Field>
              <Field подпись="Почта">
                <Input
                  value={черновик.почта ?? ''}
                  onChange={(событие) =>
                    установитьЧерновик({ ...черновик, почта: событие.target.value })
                  }
                />
              </Field>
              <Field подпись="День рождения">
                <Input
                  type="date"
                  value={черновик.деньРождения ?? ''}
                  onChange={(событие) =>
                    установитьЧерновик({
                      ...черновик,
                      деньРождения: событие.target.value || null,
                    })
                  }
                />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
              <Field
                подпись="Фотография по адресу"
                подсказка="Картинка грузится с чужого сервера"
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
                подпись="Предпросмотр"
                размер="значок"
                запасное={(черновик.имя ?? '?').slice(0, 1).toUpperCase()}
                показывать={показыватьПостеры}
                className="bg-accent-soft text-accent"
              />
            </div>
            <Field подпись="О человеке">
              <Textarea
                rows={4}
                value={черновик.заметка ?? ''}
                onChange={(событие) =>
                  установитьЧерновик({ ...черновик, заметка: событие.target.value })
                }
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                подпись="Обещания"
                подсказка="Что вы обещали и что обещали вам"
              >
                <Textarea
                  rows={3}
                  value={черновик.обещания ?? ''}
                  onChange={(событие) =>
                    установитьЧерновик({
                      ...черновик,
                      обещания: событие.target.value,
                    })
                  }
                />
              </Field>
              <Field подпись="Подарки">
                <Textarea
                  rows={3}
                  value={черновик.подарки ?? ''}
                  onChange={(событие) =>
                    установитьЧерновик({
                      ...черновик,
                      подарки: событие.target.value,
                    })
                  }
                />
              </Field>
            </div>
          </div>
        ) : null}
      </Dialog>
    </div>
  )
}
