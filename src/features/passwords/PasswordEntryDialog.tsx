import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Button, Dialog, Field, IconButton, Input, Textarea } from '@/design-system/components'
import { ЗНАЧОК } from '@/design-system/iconSize'

export interface ЧерновикПароля {
  id: string | null
  название: string
  логин: string
  пароль: string
  заметка: string
}

/**
 * Диалог записи пароля. Работает с уже расшифрованным текстом — шифрование
 * перед записью в базу и расшифровка при чтении делает `PasswordsPage.tsx`,
 * у которого есть доступ к ключу сессии; этот компонент про ключ не знает.
 */
export function PasswordEntryDialog({
  черновик,
  наИзменение,
  наЗакрытие,
  наСохранение,
}: {
  черновик: ЧерновикПароля | null
  наИзменение: (черновик: ЧерновикПароля) => void
  наЗакрытие: () => void
  наСохранение: () => void
}) {
  const [видимыйПароль, установитьВидимость] = useState(false)

  return (
    <Dialog
      открыто={черновик !== null}
      наЗакрытие={наЗакрытие}
      заголовок={черновик?.id ? 'Изменить запись' : 'Новый пароль'}
      ширина="узкая"
      подвал={
        <>
          <Button вид="тихая" onClick={наЗакрытие}>
            Отмена
          </Button>
          <Button
            вид="основная"
            onClick={наСохранение}
            disabled={!черновик?.название.trim()}
          >
            Сохранить
          </Button>
        </>
      }
    >
      {черновик ? (
        <div className="space-y-4">
          <Field подпись="Название сервиса" обязательное>
            <Input
              value={черновик.название}
              onChange={(событие) =>
                наИзменение({ ...черновик, название: событие.target.value })
              }
              autoFocus
            />
          </Field>
          <Field подпись="Логин">
            <Input
              value={черновик.логин}
              onChange={(событие) =>
                наИзменение({ ...черновик, логин: событие.target.value })
              }
            />
          </Field>
          <Field подпись="Пароль">
            <div className="relative">
              <Input
                type={видимыйПароль ? 'text' : 'password'}
                value={черновик.пароль}
                onChange={(событие) =>
                  наИзменение({ ...черновик, пароль: событие.target.value })
                }
                className="pr-11"
              />
              <IconButton
                подпись={видимыйПароль ? 'Скрыть пароль' : 'Показать пароль'}
                onClick={() => установитьВидимость((значение) => !значение)}
                className="absolute top-1/2 right-1 -translate-y-1/2"
              >
                {видимыйПароль ? (
                  <EyeOff size={ЗНАЧОК.строка} />
                ) : (
                  <Eye size={ЗНАЧОК.строка} />
                )}
              </IconButton>
            </div>
          </Field>
          <Field подпись="Заметка" подсказка="Тоже шифруется">
            <Textarea
              rows={3}
              value={черновик.заметка}
              onChange={(событие) =>
                наИзменение({ ...черновик, заметка: событие.target.value })
              }
            />
          </Field>
        </div>
      ) : null}
    </Dialog>
  )
}
