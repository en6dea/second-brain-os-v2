import { useState } from 'react'
import { CloudOff, RefreshCw, ShieldCheck } from 'lucide-react'
import type { Настройки } from '@/core/db/types'
import { изменитьНастройки } from '@/core/db/repo'
import { установитьПоставщика, БезОблака } from '@/core/sync/provider'
import type { КонфигFirebase } from '@/core/sync/FirebaseProvider'
import { useИнтерфейс } from '@/app/providers/ui'
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  Field,
  Input,
  Textarea,
} from '@/design-system/components'

/**
 * Firebase подгружается только здесь, по требованию, а не статическим
 * импортом наверху файла: иначе каждый, кто открыл настройки — не только
 * тот, кто включил синхронизацию — получал бы мегабайт SDK, который ему не
 * нужен. Один и тот же загруженный модуль переиспользуется повторно.
 */
async function загрузитьFirebase() {
  return import('@/core/sync/FirebaseProvider')
}

const ПРАВИЛА_FIRESTORE = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid}/records/{doc} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}`

function отметкаСловами(отметка: string | null): string {
  if (!отметка) return 'ещё не было'
  return new Date(отметка).toLocaleString('ru', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Разбор вставленного из консоли Firebase объекта настроек. */
function разобратьКонфигурацию(текст: string): КонфигFirebase | null {
  try {
    // Консоль Firebase отдаёт JS-объект, не JSON: ключи без кавычек. Оборачиваем
    // в функцию и выполняем как выражение — надёжнее, чем чинить кавычки руками.
    // eslint-disable-next-line no-new-func
    const значение = new Function(`"use strict"; return (${текст});`)()
    if (
      значение &&
      typeof значение.apiKey === 'string' &&
      typeof значение.projectId === 'string' &&
      typeof значение.appId === 'string'
    ) {
      return значение as КонфигFirebase
    }
    return null
  } catch {
    return null
  }
}

/**
 * Синхронизация между устройствами.
 *
 * Работает только если человек сам создал проект Firebase и вписал сюда его
 * настройки — до этого момента приложение ни разу не обращается к сети ради
 * синхронизации. Записи о самочувствии близкого человека и личные записи
 * дневника не отправляются никогда, что бы ни было настроено: это решается
 * в `core/sync/privacy.ts`, а не здесь.
 */
export function SyncCard({ настройки }: { настройки: Настройки }) {
  const сообщить = useИнтерфейс((с) => с.сообщить)

  const [конфигТекст, установитьКонфигТекст] = useState('')
  const [почта, установитьПочту] = useState('')
  const [пароль, установитьПароль] = useState('')
  const [занято, установитьЗанято] = useState(false)
  const [ошибка, установитьОшибку] = useState('')

  const конфигурация = настройки.синхронизация.конфигурация
  // Показывает актуальное состояние входа сразу после того, как модуль
  // Firebase загрузится хотя бы раз в этой вкладке; до этого момента спросить
  // не у кого — SDK ещё не подгружен, и это нормально: до входа спрашивать
  // о нём и не нужно.
  const [вошли, установитьВошли] = useState(false)

  async function сохранитьКонфигурацию() {
    const разобрано = разобратьКонфигурацию(конфигТекст)
    if (!разобрано) {
      установитьОшибку(
        'Не разобрал вставленный текст. Скопируйте объект firebaseConfig целиком из консоли Firebase.',
      )
      return
    }
    установитьОшибку('')
    await изменитьНастройки({
      синхронизация: { конфигурация: разобрано, отметка: настройки.синхронизация.отметка },
    })
    сообщить('Конфигурация сохранена. Теперь войдите')
  }

  async function отключить() {
    const { выйти } = await загрузитьFirebase()
    await выйти()
    установитьВошли(false)
    установитьПоставщика(БезОблака)
    await изменитьНастройки({ синхронизация: { конфигурация: null, отметка: null } })
    сообщить('Синхронизация отключена')
  }

  async function войтиИСинхронизировать() {
    if (!конфигурация) return
    установитьЗанято(true)
    установитьОшибку('')
    try {
      const { войти } = await загрузитьFirebase()
      await войти(конфигурация, почта, пароль)
      установитьВошли(true)
      установитьПароль('')
      сообщить('Вход выполнен')
      await синхронизироватьСейчас()
    } catch (е) {
      установитьОшибку(
        е instanceof Error ? е.message : 'Не удалось войти. Проверьте почту и пароль.',
      )
    } finally {
      установитьЗанято(false)
    }
  }

  async function синхронизироватьСейчас() {
    if (!конфигурация) return
    установитьЗанято(true)
    установитьОшибку('')
    const [{ создатьFirebaseПоставщика }, { синхронизировать }] = await Promise.all([
      загрузитьFirebase(),
      import('@/core/sync/engine'),
    ])
    установитьПоставщика(создатьFirebaseПоставщика(конфигурация))
    const итог = await синхронизировать(настройки.синхронизация.отметка)
    if (итог.ошибка) {
      установитьОшибку(итог.ошибка)
    } else {
      await изменитьНастройки({
        синхронизация: { конфигурация, отметка: итог.новаяОтметка },
      })
      сообщить(`Синхронизировано: отправлено ${итог.отправлено}, получено ${итог.получено}`)
    }
    установитьЗанято(false)
  }

  return (
    <Card>
      <CardHeader
        заголовок="Синхронизация"
        подпись="Между телефоном и компьютером, через ваш собственный проект Firebase"
        действие={
          конфигурация ? (
            <Badge тон={вошли ? 'успех' : 'внимание'}>
              {вошли ? 'подключено' : 'не выполнен вход'}
            </Badge>
          ) : (
            <Badge тон="нейтральный">
              <CloudOff size={11} />
              не настроено
            </Badge>
          )
        }
      />
      <CardBody className="space-y-4">
        {!конфигурация ? (
          <>
            <div className="space-y-2 text-caption leading-relaxed text-ink-2">
              <p className="font-medium text-ink">Один раз на каждом устройстве:</p>
              <ol className="list-decimal space-y-1 pl-4">
                <li>
                  На{' '}
                  <span className="text-ink">console.firebase.google.com</span> создайте
                  проект — бесплатно, без карты.
                </li>
                <li>
                  В разделе Authentication → Sign-in method включите «Email/Password».
                </li>
                <li>
                  В разделе Firestore Database создайте базу (любой регион).
                </li>
                <li>
                  В Firestore → Rules вставьте правила ниже — без них базу может
                  прочитать кто угодно с ключом приложения:
                  <code className="mt-1.5 block whitespace-pre-wrap rounded-2 bg-sunken px-3 py-2 text-micro text-ink">
                    {ПРАВИЛА_FIRESTORE}
                  </code>
                </li>
                <li>
                  В настройках проекта (шестерёнка) → «Ваши приложения» добавьте
                  веб-приложение и скопируйте объект <code>firebaseConfig</code> —
                  вставьте его целиком в поле ниже.
                </li>
              </ol>
            </div>

            <Field подпись="Конфигурация Firebase">
              <Textarea
                rows={5}
                value={конфигТекст}
                onChange={(событие) => установитьКонфигТекст(событие.target.value)}
                placeholder={'{\n  apiKey: "...",\n  authDomain: "...",\n  projectId: "...",\n  appId: "..."\n}'}
              />
            </Field>
            <Button вид="основная" onClick={сохранитьКонфигурацию}>
              Сохранить конфигурацию
            </Button>
          </>
        ) : !вошли ? (
          <>
            <p className="text-caption text-ink-2">
              Конфигурация сохранена. Войдите тем же адресом и паролем на всех
              устройствах, которые нужно связать — это ваш собственный аккаунт в
              вашем же проекте Firebase, не аккаунт Google.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field подпись="Почта">
                <Input
                  type="email"
                  value={почта}
                  onChange={(событие) => установитьПочту(событие.target.value)}
                />
              </Field>
              <Field подпись="Пароль">
                <Input
                  type="password"
                  value={пароль}
                  onChange={(событие) => установитьПароль(событие.target.value)}
                />
              </Field>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                вид="основная"
                disabled={занято || !почта || !пароль}
                onClick={войтиИСинхронизировать}
              >
                Войти
              </Button>
              <Button вид="тихая" onClick={отключить}>
                Отменить настройку
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="flex items-center gap-1.5 text-caption text-ink-2">
              <ShieldCheck size={14} className="text-good" />
              Последняя синхронизация: {отметкаСловами(настройки.синхронизация.отметка)}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                вид="основная"
                иконка={<RefreshCw size={15} />}
                disabled={занято}
                onClick={синхронизироватьСейчас}
              >
                Синхронизировать сейчас
              </Button>
              <Button вид="тихая" onClick={отключить}>
                Отключить на этом устройстве
              </Button>
            </div>
          </>
        )}

        {ошибка ? <p className="text-caption text-bad">{ошибка}</p> : null}

        <div className="rounded-3 border border-line bg-sunken px-4 py-3">
          <p className="text-caption leading-relaxed text-ink-3">
            Не синхронизируется никогда, что бы ни было настроено: дни в разделе
            «Отношения» и записи дневника, отмеченные личными. Это решение
            зашито в само приложение, а не в этот экран.
          </p>
        </div>
      </CardBody>
    </Card>
  )
}
