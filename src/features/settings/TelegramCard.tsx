import { useEffect, useState } from 'react'
import { Bot, Check, Copy, RefreshCw, ShieldCheck } from 'lucide-react'
import type { Настройки } from '@/core/db/types'
import { изменитьНастройки } from '@/core/db/repo'
import {
  забратьTelegram,
  нормализоватьTelegramEndpoint,
  отключитьTelegram,
  создатьПривязкуTelegram,
  статусTelegram,
  type TelegramStatus,
} from '@/core/telegram/Bridge'
import { useИнтерфейс } from '@/app/providers/ui'
import { ЗНАЧОК } from '@/design-system/iconSize'
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  Field,
  Input,
} from '@/design-system/components'

const АДРЕС_ПО_УМОЛЧАНИЮ = String(import.meta.env.VITE_TELEGRAM_BRIDGE_URL ?? '')

export function TelegramCard({ настройки }: { настройки: Настройки }) {
  const сообщить = useИнтерфейс((с) => с.сообщить)
  const config = настройки.telegram
  const [адрес, установитьАдрес] = useState(config?.endpoint ?? АДРЕС_ПО_УМОЛЧАНИЮ)
  const [статус, установитьСтатус] = useState<TelegramStatus | null>(null)
  const [занято, установитьЗанято] = useState(false)
  const [ошибка, установитьОшибку] = useState('')
  const configEndpoint = config?.endpoint
  const configToken = config?.token

  useEffect(() => {
    установитьАдрес(configEndpoint ?? АДРЕС_ПО_УМОЛЧАНИЮ)
  }, [configEndpoint])

  useEffect(() => {
    let отменено = false
    if (!configEndpoint || !configToken) {
      установитьСтатус(null)
      return
    }
    const текущийConfig = {
      endpoint: configEndpoint,
      token: configToken,
      pairingCode: null,
      pairingExpiresAt: null,
    }
    void статусTelegram(текущийConfig)
      .then((результат) => {
        if (!отменено) установитьСтатус(результат)
      })
      .catch((е: unknown) => {
        if (!отменено) {
          установитьОшибку(
            е instanceof Error ? е.message : 'Не удалось проверить связь',
          )
        }
      })
    return () => {
      отменено = true
    }
  }, [configEndpoint, configToken])

  async function начать() {
    if (!адрес.trim() || занято) return
    установитьЗанято(true)
    установитьОшибку('')
    try {
      const endpoint = нормализоватьTelegramEndpoint(адрес)
      const результат = await создатьПривязкуTelegram(endpoint)
      await изменитьНастройки({
        telegram: {
          endpoint,
          token: результат.token,
          pairingCode: результат.code,
          pairingExpiresAt: результат.expiresAt,
        },
      })
      установитьСтатус({ linked: false, botUsername: результат.botUsername })
      сообщить('Код Telegram создан на 15 минут')
    } catch (е) {
      установитьОшибку(е instanceof Error ? е.message : 'Не удалось создать связь')
    } finally {
      установитьЗанято(false)
    }
  }

  async function проверить() {
    if (!config || занято) return
    установитьЗанято(true)
    установитьОшибку('')
    try {
      const результат = await статусTelegram(config)
      установитьСтатус(результат)
      if (результат.linked) сообщить('Telegram подключён')
    } catch (е) {
      установитьОшибку(
        е instanceof Error ? е.message : 'Не удалось проверить связь',
      )
    } finally {
      установитьЗанято(false)
    }
  }

  async function забрать() {
    if (!config || занято) return
    установитьЗанято(true)
    установитьОшибку('')
    try {
      const итог = await забратьTelegram(config)
      сообщить(
        итог.импортировано > 0
          ? `Добавлено из Telegram: ${итог.импортировано}`
          : 'Новых записей в Telegram нет',
      )
    } catch (е) {
      установитьОшибку(е instanceof Error ? е.message : 'Не удалось забрать записи')
    } finally {
      установитьЗанято(false)
    }
  }

  async function отключить() {
    if (!config || занято) return
    установитьЗанято(true)
    установитьОшибку('')
    try {
      await отключитьTelegram(config)
      await изменитьНастройки({ telegram: undefined })
      установитьСтатус(null)
      сообщить('Telegram отключён')
    } catch (е) {
      установитьОшибку(
        е instanceof Error ? е.message : 'Не удалось отключить связь',
      )
    } finally {
      установитьЗанято(false)
    }
  }

  const бот = статус?.botUsername
  const команда = config?.pairingCode ? `/link ${config.pairingCode}` : ''

  return (
    <Card>
      <CardHeader
        заголовок="Telegram-входящие"
        подпись="Задача или заметка без открытия приложения"
        действие={
          <Badge
            тон={статус?.linked ? 'успех' : config ? 'внимание' : 'нейтральный'}
          >
            <Bot size={ЗНАЧОК.подпись} />
            {статус?.linked ? 'подключён' : config ? 'ждёт связи' : 'выключен'}
          </Badge>
        }
      />
      <CardBody className="space-y-4">
        {!config ? (
          <>
            <p className="text-caption leading-relaxed text-ink-2">
              Бот принимает <code>/task Позвонить клиенту</code> и{' '}
              <code>/note Идея для проекта</code>. Свободный текст не угадывается,
              поэтому случайное сообщение не станет задачей.
            </p>
            <Field
              подпись="Адрес личного Telegram-моста"
              подсказка="HTTPS-адрес Cloudflare Worker; токен бота остаётся только на сервере"
            >
              <Input
                type="url"
                value={адрес}
                placeholder="https://second-brain-assistant.…workers.dev"
                onChange={(событие) => установитьАдрес(событие.target.value)}
              />
            </Field>
            <Button
              вид="основная"
              disabled={!адрес.trim() || занято}
              onClick={начать}
            >
              {занято ? 'Создаю…' : 'Подключить Telegram'}
            </Button>
          </>
        ) : статус?.linked ? (
          <>
            <div className="rounded-3 border border-good/35 bg-good-soft px-4 py-3">
              <p className="flex items-center gap-2 text-meta font-medium text-ink">
                <ShieldCheck size={ЗНАЧОК.строка} className="text-good" />
                Личный чат связан с этим устройством
              </p>
              <p className="mt-1 text-caption leading-relaxed text-ink-3">
                Новые команды проверяются при открытии приложения и затем раз в
                минуту, пока оно активно.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {бот ? (
                <a href={`https://t.me/${бот}`} target="_blank" rel="noreferrer">
                  <Button вид="основная" иконка={<Bot size={ЗНАЧОК.строка} />}>
                    Открыть @{бот}
                  </Button>
                </a>
              ) : null}
              <Button
                вид="контур"
                иконка={<RefreshCw size={ЗНАЧОК.строка} />}
                disabled={занято}
                onClick={() => void забрать()}
              >
                Забрать сейчас
              </Button>
              <Button
                вид="тихая"
                disabled={занято}
                onClick={() => void отключить()}
              >
                Отключить
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="rounded-3 border border-line bg-sunken px-4 py-4 text-center">
              <p className="text-caption text-ink-3">Отправьте боту команду</p>
              <code className="tnum mt-2 block text-h2 font-semibold tracking-[0.08em] text-ink">
                {команда || 'Код не найден'}
              </code>
              <Button
                вид="тихая"
                размер="малый"
                className="mt-2"
                иконка={<Copy size={ЗНАЧОК.подпись} />}
                disabled={!команда}
                onClick={() => {
                  void navigator.clipboard
                    .writeText(команда)
                    .then(() => сообщить('Команда скопирована'))
                }}
              >
                Скопировать
              </Button>
            </div>
            {бот ? (
              <a href={`https://t.me/${бот}`} target="_blank" rel="noreferrer">
                <Button вид="основная" иконка={<Bot size={ЗНАЧОК.строка} />}>
                  Открыть @{бот}
                </Button>
              </a>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button
                вид="контур"
                иконка={<Check size={ЗНАЧОК.строка} />}
                disabled={занято}
                onClick={() => void проверить()}
              >
                Проверить связь
              </Button>
              <Button
                вид="тихая"
                disabled={занято}
                onClick={() => void отключить()}
              >
                Отмена
              </Button>
            </div>
          </>
        )}

        {ошибка ? (
          <p role="alert" className="text-caption leading-relaxed text-bad">
            {ошибка}
          </p>
        ) : null}

        <p className="rounded-3 border border-line bg-sunken px-4 py-3 text-caption leading-relaxed text-ink-3">
          Telegram видит отправленный текст. Мост хранит только недоставленные
          задачи и заметки; после импорта они удаляются. Токены и сообщения не
          попадают в GitHub.
        </p>
      </CardBody>
    </Card>
  )
}
