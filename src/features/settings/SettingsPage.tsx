import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { AlertTriangle, Download, Upload } from 'lucide-react'
import { база, НАЗВАНИЯ_ТАБЛИЦ, ТАБЛИЦЫ } from '@/core/db/db'
import {
  изменитьНастройки,
  изменитьПрофиль,
  очиститьВсё,
  читатьНастройки,
  читатьПрофиль,
} from '@/core/db/repo'
import {
  восстановитьИзКопии,
  копияПередОпасным,
  разобратьКопию,
  скачатьКопию,
  собратьКопию,
  type ОтчётВосстановления,
} from '@/core/backup/backup'
import {
  выполнитьПеренос,
  разобратьСтарыйФайл,
  type ОтчётПереноса,
  type РазборСтарогоФайла,
} from '@/core/migrations/legacy'
import { засеятьПоказательныеДанные } from '@/core/demo/seed'
import {
  запроситьПостоянноеХранение,
  объём,
  состояниеХранилища,
} from '@/core/db/Persistence'
import { useТема, type РежимТемы } from '@/app/providers/theme'
import { useИнтерфейс } from '@/app/providers/ui'
import { деньги, рублиВКопейки, копейкиВРубли } from '@/core/money/Money'
import {
  Input,
  MoneyInput,
  Skeleton,
  Badge,
  Card,
  Button,
  Dialog,
  Switch,
  Field,
  Segmented,
  CardHeader,
  CardBody,
} from '@/design-system/components'

const ТЕМЫ: { ключ: РежимТемы; подпись: string }[] = [
  { ключ: 'light', подпись: 'Светлая' },
  { ключ: 'dark', подпись: 'Тёмная' },
  { ключ: 'system', подпись: 'Как в системе' },
]

export function SettingsPage() {
  const сообщить = useИнтерфейс((с) => с.сообщить)
  const { режим, установить } = useТема()

  const [имя, установитьИмя] = useState<string | null>(null)
  const [резерв, установитьРезерв] = useState<string | null>(null)
  const [отчётВосстановления, установитьОтчётВосстановления] = useState<
    ОтчётВосстановления[] | null
  >(null)
  const [разборСтарого, установитьРазборСтарого] =
    useState<РазборСтарогоФайла | null>(null)
  const [отчётПереноса, установитьОтчётПереноса] = useState<ОтчётПереноса | null>(
    null,
  )
  const [ошибка, установитьОшибку] = useState('')
  const [подтвердитьОчистку, установитьПодтвердитьОчистку] = useState(false)
  const [занято, установитьЗанято] = useState(false)

  const данные = useLiveQuery(async () => {
    const [профиль, настройки] = await Promise.all([
      читатьПрофиль(),
      читатьНастройки(),
    ])
    const количества: Record<string, number> = {}
    for (const имяТаблицы of ТАБЛИЦЫ) {
      количества[имяТаблицы] = await база.table(имяТаблицы).count()
    }
    const хранилище = await состояниеХранилища()
    return { профиль, настройки, количества, хранилище }
  }, [])

  if (!данные) {
    return (
      <Card>
        <Skeleton строк={5} />
      </Card>
    )
  }

  const всегоЗаписей = Object.values(данные.количества).reduce(
    (итог, число) => итог + число,
    0,
  )

  async function выгрузить() {
    установитьЗанято(true)
    try {
      const копия = await собратьКопию()
      скачатьКопию(копия)
      сообщить('Копия сохранена в файл')
    } finally {
      установитьЗанято(false)
    }
  }

  async function восстановить(
    файл: File,
    режимВосстановления: 'дополнить' | 'заменить',
  ) {
    установитьОшибку('')
    установитьЗанято(true)
    try {
      const копия = разобратьКопию(await файл.text())
      if (режимВосстановления === 'заменить') await копияПередОпасным('заменой')
      const отчёт = await восстановитьИзКопии(копия, режимВосстановления)
      установитьОтчётВосстановления(
        отчёт.filter((строка) => строка.добавлено + строка.обновлено > 0),
      )
      сообщить('Данные восстановлены')
    } catch (причина) {
      установитьОшибку(
        причина instanceof Error ? причина.message : 'Не удалось прочитать файл',
      )
    } finally {
      установитьЗанято(false)
    }
  }

  async function прочитатьСтарыйФайл(файл: File) {
    установитьОшибку('')
    установитьОтчётПереноса(null)
    try {
      установитьРазборСтарого(разобратьСтарыйФайл(await файл.text()))
    } catch (причина) {
      установитьОшибку(
        причина instanceof Error ? причина.message : 'Не удалось прочитать файл',
      )
    }
  }

  async function перенести() {
    if (!разборСтарого) return
    установитьЗанято(true)
    try {
      await копияПередОпасным('переносом')
      const отчёт = await выполнитьПеренос(разборСтарого)
      установитьОтчётПереноса(отчёт)
      установитьРазборСтарого(null)
      сообщить('Перенос завершён')
    } catch (причина) {
      установитьОшибку(
        причина instanceof Error ? причина.message : 'Перенос не удался',
      )
    } finally {
      установитьЗанято(false)
    }
  }

  return (
    <div className="anim-rise space-y-5">
      <div>
        <h1 className="text-[20px] font-semibold text-ink">Настройки</h1>
        <p className="mt-0.5 text-[13px] text-ink-3">
          Данные хранятся в браузере на этом устройстве. Никуда не отправляются.
        </p>
      </div>

      {ошибка ? (
        <Card className="border-bad/40">
          <CardBody className="pt-5">
            <p className="text-[13px] text-bad">{ошибка}</p>
          </CardBody>
        </Card>
      ) : null}

      {/* --- Внешний вид --- */}
      <Card>
        <CardHeader
          заголовок="Внешний вид"
          подпись="Тема запоминается на этом устройстве"
        />
        <CardBody>
          <Segmented значения={ТЕМЫ} выбрано={режим} наВыбор={установить} />
        </CardBody>
      </Card>

      {/* --- Профиль --- */}
      <Card>
        <CardHeader заголовок="Профиль" подпись="Имя показывается в приветствии" />
        <CardBody>
          <div className="flex flex-wrap items-end gap-3">
            <Field подпись="Имя" className="w-56">
              <Input
                value={имя ?? данные.профиль.имя}
                onChange={(событие) => установитьИмя(событие.target.value)}
                placeholder="Как к вам обращаться"
              />
            </Field>
            <Button
              onClick={async () => {
                await изменитьПрофиль({ имя: (имя ?? данные.профиль.имя).trim() })
                установитьИмя(null)
                сообщить('Профиль сохранён')
              }}
            >
              Сохранить
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* --- Деньги --- */}
      <Card>
        <CardHeader
          заголовок="Правила расчёта денег"
          подпись="Минимальный резерв вычитается из свободных денег"
        />
        <CardBody>
          <div className="flex flex-wrap items-end gap-3">
            <Field
              подпись="Минимальный резерв"
              подсказка="Сумма, которую вы не считаете свободной"
              className="w-56"
            >
              <MoneyInput
                value={
                  резерв ??
                  (данные.настройки.минимальныйРезерв === 0
                    ? ''
                    : String(копейкиВРубли(данные.настройки.минимальныйРезерв)))
                }
                onChange={установитьРезерв}
                placeholder="0"
              />
            </Field>
            <Button
              onClick={async () => {
                await изменитьНастройки({
                  минимальныйРезерв: рублиВКопейки(резерв ?? '') ?? 0,
                })
                установитьРезерв(null)
                сообщить('Резерв сохранён')
              }}
            >
              Сохранить
            </Button>
          </div>
          <p className="mt-3 text-[12.5px] text-ink-3">
            Сейчас: {деньги(данные.настройки.минимальныйРезерв)}
          </p>
        </CardBody>
      </Card>

      {/* --- Резервные копии --- */}
      <Card>
        <CardHeader
          заголовок="Резервные копии"
          подпись={`В базе ${всегоЗаписей} ${всегоЗаписей === 1 ? 'запись' : 'записей'}`}
        />
        <CardBody>
          <div className="flex flex-wrap gap-2">
            <Button
              вид="основная"
              иконка={<Download size={15} />}
              onClick={выгрузить}
              disabled={занято}
            >
              Выгрузить всё в файл
            </Button>

            <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-2 border border-line px-4 text-sm font-medium text-ink transition-colors hover:bg-hover">
              <Upload size={15} />
              Восстановить (дополнить)
              <input
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(событие) => {
                  const файл = событие.target.files?.[0]
                  if (файл) void восстановить(файл, 'дополнить')
                  событие.target.value = ''
                }}
              />
            </label>

            <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-2 border border-line px-4 text-sm font-medium text-ink-2 transition-colors hover:bg-hover">
              Восстановить (заменить)
              <input
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(событие) => {
                  const файл = событие.target.files?.[0]
                  if (файл) void восстановить(файл, 'заменить')
                  событие.target.value = ''
                }}
              />
            </label>
          </div>

          <p className="mt-3 text-[12.5px] text-ink-3">
            «Дополнить» не создаёт дублей: запись с тем же идентификатором
            обновляется. «Заменить» очищает таблицы из файла, но перед этим
            автоматически сохраняет текущее состояние отдельным файлом.
          </p>

          {отчётВосстановления ? (
            <div className="mt-4 rounded-3 border border-line bg-sunken p-4">
              <p className="mb-2 text-[13px] font-medium text-ink">
                Отчёт о восстановлении
              </p>
              <ul className="space-y-1 text-[12.5px] text-ink-2">
                {отчётВосстановления.map((строка) => (
                  <li key={строка.таблица}>
                    {строка.таблица}: добавлено {строка.добавлено}, обновлено{' '}
                    {строка.обновлено}
                    {строка.пропущено > 0 ? `, пропущено ${строка.пропущено}` : ''}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </CardBody>
      </Card>

      {/* --- Перенос из прежней версии --- */}
      <Card>
        <CardHeader
          заголовок="Перенос из прежней версии"
          подпись="Файл выгрузки старого приложения. Исходный файл не изменяется."
        />
        <CardBody>
          <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-2 border border-line px-4 text-sm font-medium text-ink transition-colors hover:bg-hover">
            <Upload size={15} />
            Выбрать файл прежней версии
            <input
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(событие) => {
                const файл = событие.target.files?.[0]
                if (файл) void прочитатьСтарыйФайл(файл)
                событие.target.value = ''
              }}
            />
          </label>

          {отчётПереноса ? (
            <div className="mt-4 rounded-3 border border-good/30 bg-good-soft p-4">
              <p className="mb-2 text-[13px] font-medium text-ink">
                Перенос завершён
              </p>
              <ul className="space-y-1 text-[12.5px] text-ink-2">
                {отчётПереноса.строки.map((строка) => (
                  <li key={строка.название}>
                    {строка.название}: {строка.перенесено} / {строка.из}
                    {строка.пояснение ? (
                      <span className="text-ink-3"> — {строка.пояснение}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
              {отчётПереноса.предупреждения.length > 0 ? (
                <ul className="mt-2 space-y-1 text-[12.5px] text-warn">
                  {отчётПереноса.предупреждения.map((текст) => (
                    <li key={текст}>· {текст}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </CardBody>
      </Card>

      {/* --- Разработка --- */}
      <Card>
        <CardHeader
          заголовок="Показательные данные"
          подпись="Только для знакомства с интерфейсом"
        />
        <CardBody>
          {данные.настройки.режимДемо ? (
            <div className="mb-3">
              <Badge тон="внимание">
                В базе есть показательные записи — они помечены словом
                «показательн…» в названии
              </Badge>
            </div>
          ) : null}
          <Button
            onClick={async () => {
              await засеятьПоказательныеДанные()
              сообщить('Показательные данные добавлены')
            }}
          >
            Добавить показательные данные
          </Button>
          <Switch
            включён={данные.настройки.скрыватьСуммы}
            наИзменение={(значение) =>
              изменитьНастройки({ скрыватьСуммы: значение })
            }
            подпись="Не показывать суммы, пока не наведён курсор"
            описание="Пока не реализовано в интерфейсе — переключатель сохраняет намерение"
          />
        </CardBody>
      </Card>

      {/* --- Обложки --- */}
      <Card>
        <CardHeader
          заголовок="Обложки"
          подпись="Постеры фильмов, обложки книг, фотографии людей"
        />
        <CardBody>
          <Switch
            включён={данные.настройки.показыватьПостеры !== false}
            наИзменение={(значение) =>
              изменитьНастройки({ показыватьПостеры: значение })
            }
            подпись="Загружать картинки по адресам"
            описание="Картинка грузится с чужого сервера, и он видит обращение с вашего устройства. Сами адреса хранятся у вас; выключите, если это нежелательно"
          />
        </CardBody>
      </Card>

      {/* --- Хранилище --- */}
      <Card>
        <CardHeader
          заголовок="Хранилище"
          подпись="IndexedDB, база «ВторойМозг2». localStorage хранит только тему."
        />
        <CardBody>
          <div className="mb-4 rounded-3 border border-line bg-sunken px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[13px] text-ink">
                {данные.хранилище.постоянное
                  ? 'Хранение постоянное'
                  : 'Хранение расходное'}
              </span>
              <Badge тон={данные.хранилище.постоянное ? 'успех' : 'внимание'}>
                {данные.хранилище.постоянное ? 'защищено' : 'может быть стёрто'}
              </Badge>
            </div>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-3">
              {данные.хранилище.постоянное
                ? 'Браузер обещал не удалять эти данные при нехватке места.'
                : 'Браузер вправе стереть хранилище при нехватке места — данные откатятся без предупреждения. Разрешение запрашивается при запуске; браузер может отказать, пока сайт не установлен как приложение или не добавлен в закладки.'}
            </p>
            <p className="tnum mt-1.5 text-[12px] text-ink-3">
              Занято: {объём(данные.хранилище.занято)}
              {данные.хранилище.доступно !== null
                ? ` из ${объём(данные.хранилище.доступно)}`
                : ''}
            </p>
            {!данные.хранилище.постоянное ? (
              <Button
                размер="малый"
                className="mt-2.5"
                onClick={async () => {
                  const дали = await запроситьПостоянноеХранение()
                  сообщить(
                    дали
                      ? 'Браузер разрешил постоянное хранение'
                      : 'Браузер отказал. Установите приложение на устройство — тогда он обычно соглашается',
                  )
                }}
              >
                Запросить постоянное хранение
              </Button>
            ) : null}
          </div>
          <div className="grid gap-x-6 gap-y-1 text-[12.5px] sm:grid-cols-2 lg:grid-cols-3">
            {ТАБЛИЦЫ
              .filter((имяТаблицы) => (данные.количества[имяТаблицы] ?? 0) > 0)
              .map((имяТаблицы) => (
                <div
                  key={имяТаблицы}
                  className="flex justify-between border-b border-line py-1"
                >
                  <span className="text-ink-2">{НАЗВАНИЯ_ТАБЛИЦ[имяТаблицы]}</span>
                  <span className="tnum text-ink">
                    {данные.количества[имяТаблицы]}
                  </span>
                </div>
              ))}
          </div>
          {всегоЗаписей === 0 ? (
            <p className="text-[13px] text-ink-3">База пуста.</p>
          ) : null}
        </CardBody>
      </Card>

      {/* --- Опасная зона --- */}
      <Card className="border-bad/30">
        <CardHeader
          заголовок="Удаление всех данных"
          подпись="Действие необратимо"
        />
        <CardBody>
          <Button
            вид="опасная"
            иконка={<AlertTriangle size={15} />}
            onClick={() => установитьПодтвердитьОчистку(true)}
          >
            Удалить все данные
          </Button>
        </CardBody>
      </Card>

      {/* --- Предпросмотр переноса --- */}
      <Dialog
        открыто={разборСтарого !== null}
        наЗакрытие={() => установитьРазборСтарого(null)}
        заголовок="Что будет перенесено"
        подпись="Ничего не записывается, пока вы не подтвердите"
        ширина="широкая"
        подвал={
          <>
            <Button вид="тихая" onClick={() => установитьРазборСтарого(null)}>
              Отмена
            </Button>
            <Button вид="основная" onClick={перенести} disabled={занято}>
              Перенести
            </Button>
          </>
        }
      >
        {разборСтарого ? (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge тон="сведения">
                схема прежних данных: {разборСтарого.версияСхемы ?? 'не указана'}
              </Badge>
              <Badge>коллекций: {разборСтарого.коллекций}</Badge>
              <Badge>записей: {разборСтарого.всегоЗаписей}</Badge>
            </div>

            {разборСтарого.предупреждения.length > 0 ? (
              <ul className="space-y-1 rounded-3 bg-warn-soft px-4 py-3 text-[12.5px] text-warn">
                {разборСтарого.предупреждения.map((текст) => (
                  <li key={текст}>· {текст}</li>
                ))}
              </ul>
            ) : null}

            <div className="overflow-hidden rounded-3 border border-line">
              <table className="w-full text-[12.5px]">
                <thead className="bg-sunken">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-ink-3">
                      Коллекция
                    </th>
                    <th className="px-3 py-2 text-right font-medium text-ink-3">
                      Записей
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-ink-3">
                      Куда попадёт
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {разборСтарого.найдено.map((строка) => (
                    <tr key={строка.ключ} className="border-t border-line">
                      <td className="px-3 py-1.5 text-ink">{строка.название}</td>
                      <td className="tnum px-3 py-1.5 text-right text-ink-2">
                        {строка.записей}
                      </td>
                      <td className="px-3 py-1.5 text-ink-3">{строка.куда}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-[12.5px] text-ink-3">
              Перед записью приложение автоматически сохранит текущие данные
              отдельным файлом. Исходный файл прежней версии не изменяется.
            </p>
          </div>
        ) : null}
      </Dialog>

      {/* --- Подтверждение очистки --- */}
      <Dialog
        открыто={подтвердитьОчистку}
        наЗакрытие={() => установитьПодтвердитьОчистку(false)}
        заголовок="Удалить все данные?"
        ширина="узкая"
        подвал={
          <>
            <Button вид="тихая" onClick={() => установитьПодтвердитьОчистку(false)}>
              Отмена
            </Button>
            <Button
              вид="опасная"
              disabled={занято}
              onClick={async () => {
                установитьЗанято(true)
                try {
                  await копияПередОпасным('удалением')
                  await очиститьВсё()
                  сообщить('Все данные удалены. Копия сохранена в файл.')
                  установитьПодтвердитьОчистку(false)
                } finally {
                  установитьЗанято(false)
                }
              }}
            >
              Да, удалить
            </Button>
          </>
        }
      >
        <p className="text-[13.5px] text-ink-2">
          Будут удалены все {всегоЗаписей} записей: задачи, цели, привычки, счета,
          операции, обязательства, знания и дневник. Перед удалением автоматически
          сохранится файл с копией — не закрывайте окно, пока он не скачается.
        </p>
      </Dialog>
    </div>
  )
}
