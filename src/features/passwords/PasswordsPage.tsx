import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Copy, Lock, Plus, Trash2 } from 'lucide-react'
import { база } from '@/core/db/db'
import { новаяЗапись } from '@/core/db/repo'
import { сейчас } from '@/core/db/RecordId'
import { useИнтерфейс } from '@/app/providers/ui'
import { зашифровать, расшифровать } from './model/Crypto'
import { useСессияПаролей } from './session'
import { LockScreen } from './LockScreen'
import { PasswordEntryDialog, type ЧерновикПароля } from './PasswordEntryDialog'
import { Button, Card, EmptyState, IconButton, Skeleton } from '@/design-system/components'

interface Расшифровано {
  логин: string
  пароль: string
  заметка: string
}

/**
 * Список паролей. Показывается только пока сессия разблокирована —
 * `session.ts` держит ключ в памяти, здесь читаем и пишем через него.
 * Логин/пароль/заметка расшифровываются построчно при загрузке списка;
 * название сервиса хранится открытым текстом, чтобы список можно было
 * листать без ожидания расшифровки каждой строки.
 */
export function PasswordsPage() {
  const сообщить = useИнтерфейс((с) => с.сообщить)
  const разблокировано = useСессияПаролей((с) => с.разблокировано)
  const ключ = useСессияПаролей((с) => с.ключ)
  const заблокировать = useСессияПаролей((с) => с.заблокировать)

  const записи = useLiveQuery(() => база.passwords.toArray(), [])
  const [расшифрованные, установитьРасшифрованные] = useState<
    Record<string, Расшифровано>
  >({})
  const [черновик, установитьЧерновик] = useState<ЧерновикПароля | null>(null)

  useEffect(() => {
    if (!разблокировано || !ключ || !записи) return
    let отменено = false
    void (async () => {
      const итог: Record<string, Расшифровано> = {}
      for (const запись of записи) {
        итог[запись.id] = {
          логин: запись.логин ? await расшифровать(ключ, запись.логин) : '',
          пароль: запись.пароль ? await расшифровать(ключ, запись.пароль) : '',
          заметка: запись.заметка ? await расшифровать(ключ, запись.заметка) : '',
        }
      }
      if (!отменено) установитьРасшифрованные(итог)
    })()
    return () => {
      отменено = true
    }
  }, [разблокировано, ключ, записи])

  if (!разблокировано) return <LockScreen />

  if (!записи) {
    return (
      <Card>
        <Skeleton строк={4} />
      </Card>
    )
  }

  async function сохранить() {
    if (!черновик?.название.trim() || !ключ) return
    const поля = {
      название: черновик.название.trim(),
      логин: черновик.логин.trim() ? await зашифровать(ключ, черновик.логин) : null,
      пароль: черновик.пароль ? await зашифровать(ключ, черновик.пароль) : null,
      заметка: черновик.заметка.trim()
        ? await зашифровать(ключ, черновик.заметка)
        : null,
    }
    if (черновик.id) {
      const текущая = await база.passwords.get(черновик.id)
      if (текущая) {
        await база.passwords.put({ ...текущая, ...поля, updatedAt: сейчас() })
        сообщить('Запись изменена')
      }
    } else {
      await база.passwords.add(новаяЗапись(поля) as never)
      сообщить('Пароль добавлен')
    }
    установитьЧерновик(null)
  }

  return (
    <div className="anim-rise space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-h2 font-semibold text-ink">Пароли</h1>
          <p className="mt-0.5 text-meta text-ink-3">
            Шифруется мастер-паролем — приложение не хранит открытый текст
          </p>
        </div>
        <div className="flex gap-2">
          <Button вид="обычная" иконка={<Lock size={16} />} onClick={заблокировать}>
            Заблокировать
          </Button>
          <Button
            вид="основная"
            иконка={<Plus size={16} />}
            onClick={() =>
              установитьЧерновик({ id: null, название: '', логин: '', пароль: '', заметка: '' })
            }
          >
            Пароль
          </Button>
        </div>
      </div>

      <Card>
        {записи.length === 0 ? (
          <EmptyState
            заголовок="Паролей пока нет"
            подпись="Добавьте первую запись: название сервиса, логин, пароль."
          />
        ) : (
          <div className="divide-y divide-line">
            {записи.map((запись) => {
              const данные = расшифрованные[запись.id]
              return (
                <div key={запись.id} className="flex items-center gap-3 px-5 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-meta font-medium text-ink">
                      {запись.название}
                    </p>
                    <p className="mt-0.5 truncate text-caption text-ink-3">
                      {данные ? данные.логин || 'логин не указан' : 'расшифровка…'}
                    </p>
                  </div>
                  {данные?.пароль ? (
                    <IconButton
                      подпись="Скопировать пароль"
                      onClick={() => {
                        void navigator.clipboard.writeText(данные.пароль)
                        сообщить('Пароль скопирован')
                      }}
                    >
                      <Copy size={15} />
                    </IconButton>
                  ) : null}
                  <IconButton
                    подпись="Изменить запись"
                    onClick={() =>
                      установитьЧерновик({
                        id: запись.id,
                        название: запись.название,
                        логин: данные?.логин ?? '',
                        пароль: данные?.пароль ?? '',
                        заметка: данные?.заметка ?? '',
                      })
                    }
                  >
                    <span className="text-meta">✎</span>
                  </IconButton>
                  <IconButton
                    подпись="Удалить запись"
                    onClick={async () => {
                      await база.passwords.delete(запись.id)
                      сообщить('Запись удалена')
                    }}
                  >
                    <Trash2 size={15} />
                  </IconButton>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      <PasswordEntryDialog
        черновик={черновик}
        наИзменение={установитьЧерновик}
        наЗакрытие={() => установитьЧерновик(null)}
        наСохранение={() => void сохранить()}
      />
    </div>
  )
}
