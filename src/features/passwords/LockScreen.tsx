import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { KeyRound } from 'lucide-react'
import { база } from '@/core/db/db'
import { useСессияПаролей } from './session'
import { Button, Card, Field, Input } from '@/design-system/components'
import { ЗНАЧОК } from '@/design-system/iconSize'

/**
 * Экран разблокировки — или создания хранилища, если его ещё нет.
 *
 * Отдельное действие «Создать хранилище» вместо попытки угадать по неудачной
 * разблокировке: у пароля из шифрования нет отдельного хеша для проверки
 * «уже есть аккаунт или нет» — та же логика, что уже применялась к входу в
 * Firebase-синхронизацию в этом приложении.
 */
export function LockScreen() {
  const [мастерПароль, установитьМастерПароль] = useState('')
  const [повтор, установитьПовтор] = useState('')
  const [ошибка, установитьОшибку] = useState('')
  const [занято, установитьЗанято] = useState(false)

  const конфигурация = useLiveQuery(() => база.passwordsVault.toArray(), [])
  const создатьХранилище = useСессияПаролей((с) => с.создатьХранилище)
  const разблокировать = useСессияПаролей((с) => с.разблокировать)

  if (конфигурация === undefined) return null

  const хранилищеЕсть = конфигурация.length > 0

  async function отправить() {
    установитьОшибку('')
    if (!мастерПароль.trim()) return

    if (!хранилищеЕсть && мастерПароль !== повтор) {
      установитьОшибку('Пароли не совпадают')
      return
    }

    установитьЗанято(true)
    try {
      if (хранилищеЕсть) {
        const успех = await разблокировать(мастерПароль)
        if (!успех) установитьОшибку('Неверный мастер-пароль')
      } else {
        await создатьХранилище(мастерПароль)
      }
    } finally {
      установитьЗанято(false)
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <Card>
        <div className="space-y-4 p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
              <KeyRound size={ЗНАЧОК.крупный} strokeWidth={1.75} />
            </span>
            <div>
              <h1 className="text-h3 font-semibold text-ink">
                {хранилищеЕсть
                  ? 'Хранилище заблокировано'
                  : 'Создать хранилище паролей'}
              </h1>
              <p className="mt-0.5 text-caption text-ink-3">
                {хранилищеЕсть
                  ? 'Введите мастер-пароль, чтобы увидеть записи'
                  : 'Мастер-пароль шифрует все записи. Забытый пароль не восстановить — это честное условие настоящего шифрования, а не недоработка.'}
              </p>
            </div>
          </div>

          <Field подпись="Мастер-пароль">
            <Input
              type="password"
              value={мастерПароль}
              onChange={(событие) => установитьМастерПароль(событие.target.value)}
              onKeyDown={(событие) => {
                if (событие.key === 'Enter') void отправить()
              }}
              autoFocus
            />
          </Field>

          {!хранилищеЕсть ? (
            <Field подпись="Повторите мастер-пароль">
              <Input
                type="password"
                value={повтор}
                onChange={(событие) => установитьПовтор(событие.target.value)}
                onKeyDown={(событие) => {
                  if (событие.key === 'Enter') void отправить()
                }}
              />
            </Field>
          ) : null}

          {ошибка ? <p className="text-caption text-bad">{ошибка}</p> : null}

          <Button
            вид="основная"
            наВсюШирину
            disabled={занято || !мастерПароль.trim()}
            onClick={() => void отправить()}
          >
            {хранилищеЕсть ? 'Разблокировать' : 'Создать хранилище'}
          </Button>
        </div>
      </Card>
    </div>
  )
}
