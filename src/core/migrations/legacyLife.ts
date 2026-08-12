import { база } from '@/core/db/db'
import { новаяЗапись } from '@/core/db/repo'
import type {
  Входящее,
  Задача,
  Привычка,
  Событие,
  Сфера,
  Цель,
  Человек,
} from '@/core/db/types'
import {
  датаИлиNull,
  массив,
  остаток,
  СЛУЖЕБНЫЕ,
  собратьТекст,
  текст,
  времяЗаписи,
  числоИлиNull,
  type Запись,
} from './legacyFields'
import type { СтрокаОтчёта } from './legacyMoney'

const СОСТОЯНИЯ_ЗАДАЧ: Record<string, Задача['состояние']> = {
  done: 'сделана',
  completed: 'сделана',
  сделано: 'сделана',
  canceled: 'отменена',
  cancelled: 'отменена',
  'in-progress': 'в работе',
  active: 'в работе',
}

const ВАЖНОСТЬ: Record<string, Задача['важность']> = {
  low: 'низкая',
  normal: 'обычная',
  medium: 'обычная',
  high: 'высокая',
  urgent: 'срочная',
}

export async function перенестиСферы(
  состояние: Запись,
): Promise<{ строка: СтрокаОтчёта; поСтаромуId: Map<string, string> }> {
  const старые = массив(состояние, 'spheres')
  const поСтаромуId = new Map<string, string>()
  const новые: Сфера[] = []

  старые.forEach((строка, индекс) => {
    const запись = новаяЗапись({
      название: текст(строка.title) || `Сфера ${индекс + 1}`,
      цвет: 'accent',
      иконка: текст(строка.icon),
      порядок: индекс,
      архив: false,
      ...времяЗаписи(строка),
      legacy: остаток(строка, [...СЛУЖЕБНЫЕ, 'title', 'icon']),
    }) as Сфера
    новые.push(запись)
    const староеId = текст(строка.id)
    if (староеId) поСтаромуId.set(староеId, запись.id)
  })

  if (новые.length > 0) await база.areas.bulkPut(новые)
  return {
    строка: {
      название: 'Сферы жизни',
      перенесено: новые.length,
      из: старые.length,
    },
    поСтаромуId,
  }
}

export async function перенестиЦели(
  состояние: Запись,
): Promise<{ строка: СтрокаОтчёта; поСтаромуId: Map<string, string> }> {
  const старые = массив(состояние, 'goals')
  const поСтаромуId = new Map<string, string>()
  const новые: Цель[] = []

  старые.forEach((строка, индекс) => {
    const статус = текст(строка.status).toLowerCase()
    const состояниеЦели: Цель['состояние'] =
      статус === 'done' || статус === 'achieved'
        ? 'достигнута'
        : статус === 'canceled' || статус === 'cancelled'
          ? 'отменена'
          : statusОтложена(статус)
            ? 'отложена'
            : 'активна'

    const запись = новаяЗапись({
      название: текст(строка.title) || 'Цель',
      зачем: собратьТекст(строка, [
        ['why', ''],
        ['metric', 'Показатель'],
        ['nextAction', 'Следующий шаг'],
        ['currentPoint', 'Где я сейчас'],
      ]),
      сфераId: null,
      состояние: состояниеЦели,
      срок: датаИлиNull(строка.due ?? строка.date),
      цель: числоИлиNull(строка.target),
      текущее: числоИлиNull(строка.current),
      единица: текст(строка.unit),
      порядок: индекс,
      вехи: этапыВВехи(строка.stages),
      постер: текст(строка.imageUrl) || текст(строка.image),
      последняяАктивность:
        текст(строка.lastActivityAt) || текст(строка.updatedAt) || null,
      ...времяЗаписи(строка),
      legacy: остаток(строка, [
        ...СЛУЖЕБНЫЕ,
        'title',
        'why',
        'metric',
        'nextAction',
        'currentPoint',
        'status',
        'due',
        'date',
        'target',
        'current',
        'unit',
        'stages',
        'lastActivityAt',
        'imageUrl',
        'image',
      ]),
    }) as Цель
    новые.push(запись)
    const староеId = текст(строка.id)
    if (староеId) поСтаромуId.set(староеId, запись.id)
  })

  if (новые.length > 0) await база.goals.bulkPut(новые)
  return {
    строка: { название: 'Цели', перенесено: новые.length, из: старые.length },
    поСтаромуId,
  }
}

function statusОтложена(статус: string): boolean {
  return статус === 'paused' || статус === 'on-hold' || статус === 'later'
}

function этапыВВехи(значение: unknown): Цель['вехи'] {
  if (!Array.isArray(значение)) return []
  return значение
    .filter((этап): этап is Запись => Boolean(этап) && typeof этап === 'object')
    .map((этап, индекс) => ({
      id: текст(этап.id) || `веха-${индекс}`,
      название: текст(этап.title) || текст(этап.name) || `Этап ${индекс + 1}`,
      срок: датаИлиNull(этап.due ?? этап.date),
      выполнена: Boolean(этап.done ?? этап.completed),
    }))
}

export async function перенестиЗадачи(
  состояние: Запись,
  цельПоСтаромуId: Map<string, string>,
): Promise<{ строка: СтрокаОтчёта }> {
  const старые = массив(состояние, 'tasks')
  const новые = старые.map(
    (строка) =>
      новаяЗапись({
        название: текст(строка.title) || 'Задача без названия',
        заметка: собратьТекст(строка, [
          ['note', ''],
          ['location', 'Место'],
        ]),
        дата: датаИлиNull(строка.date),
        время: текст(строка.time) || null,
        длительностьМинут: числоИлиNull(строка.durationMinutes),
        состояние: СОСТОЯНИЯ_ЗАДАЧ[текст(строка.status)] ?? 'новая',
        важность: ВАЖНОСТЬ[текст(строка.priority)] ?? 'обычная',
        проектId: null,
        цельId: цельПоСтаромуId.get(текст(строка.goalId)) ?? null,
        сфераId: null,
        выполненаВ: текст(строка.completedAt) || null,
        переносов: числоИлиNull(строка.postponed) ?? 0,
        повтор: текст(строка.automationKey) || null,
        ...времяЗаписи(строка),
        legacy: остаток(строка, [
          ...СЛУЖЕБНЫЕ,
          'title',
          'note',
          'location',
          'date',
          'time',
          'durationMinutes',
          'status',
          'priority',
          'completedAt',
          'postponed',
          'automationKey',
          'goalId',
        ]),
      }) as Задача,
  )

  if (новые.length > 0) await база.tasks.bulkPut(новые)
  return {
    строка: { название: 'Задачи', перенесено: новые.length, из: старые.length },
  }
}

/**
 * Привычки. Отметки лежали в двух местах: словарём внутри привычки и
 * отдельной коллекцией `habitLogs`. Обе сводятся в один словарь по датам.
 */
export async function перенестиПривычки(
  состояние: Запись,
  цельПоСтаромуId: Map<string, string>,
): Promise<{ строки: СтрокаОтчёта[] }> {
  const старые = массив(состояние, 'habits')
  const журнал = массив(состояние, 'habitLogs')

  const отметкиИзЖурнала = new Map<string, Record<string, number>>()
  for (const строка of журнал) {
    if (строка.done === false) continue
    const привычкаId = текст(строка.habitId)
    const дата = датаИлиNull(строка.date)
    if (!привычкаId || !дата) continue
    const набор = отметкиИзЖурнала.get(привычкаId) ?? {}
    набор[дата] = 1
    отметкиИзЖурнала.set(привычкаId, набор)
  }

  const новые: Привычка[] = []
  for (const строка of старые) {
    const староеId = текст(строка.id)
    const исходные = (строка.marks ?? {}) as Record<string, unknown>
    const отметки: Record<string, number> = {}

    for (const ключ of Object.keys(исходные)) {
      const значение = исходные[ключ]
      const число =
        typeof значение === 'number'
          ? значение
          : значение === true
            ? 1
            : (числоИлиNull(значение) ?? 0)
      if (число > 0) отметки[ключ] = число
    }
    Object.assign(отметки, отметкиИзЖурнала.get(староеId) ?? {})

    новые.push(
      новаяЗапись({
        название: текст(строка.name) || 'Привычка',
        иконка: текст(строка.icon),
        цвет: текст(строка.color) || 'accent',
        частота: 'ежедневно',
        дниНедели: [],
        разВНеделю: null,
        норма: числоИлиNull(строка.target) ?? 1,
        единица: текст(строка.unit) || 'раз',
        цельId: цельПоСтаромуId.get(текст(строка.goalId)) ?? null,
        сфераId: null,
        активна: строка.active !== false,
        постер: текст(строка.imageUrl) || текст(строка.icon).startsWith('http')
          ? текст(строка.imageUrl) || текст(строка.icon)
          : '',
        отметки,
        ...времяЗаписи(строка),
        legacy: остаток(строка, [
          ...СЛУЖЕБНЫЕ,
          'name',
          'icon',
          'color',
          'marks',
          'target',
          'unit',
          'frequency',
          'active',
          'streak',
        ]),
      }) as Привычка,
    )
  }

  if (новые.length > 0) await база.habits.bulkPut(новые)

  const задуманные = массив(состояние, 'habitWishlist')
  const идеи = задуманные.map((строка) =>
    новаяЗапись({
      текст: `Задуманная привычка: ${текст(строка.name) || текст(строка.title)}`,
      разобрано: false,
      источник: 'импорт' as const,
      ...времяЗаписи(строка),
      legacy: остаток(строка, [...СЛУЖЕБНЫЕ, 'name', 'title']),
    }),
  ) as Входящее[]
  if (идеи.length > 0) await база.inbox.bulkPut(идеи)

  return {
    строки: [
      {
        название: 'Привычки',
        перенесено: новые.length,
        из: старые.length,
      },
      {
        название: 'Задуманные привычки',
        перенесено: идеи.length,
        из: задуманные.length,
      },
    ],
  }
}

export async function перенестиСобытия(
  состояние: Запись,
): Promise<{ строка: СтрокаОтчёта }> {
  const старые = массив(состояние, 'calendarEvents')
  const новые = старые
    .map((строка) => {
      const дата = датаИлиNull(строка.date)
      if (!дата) return null
      return новаяЗапись({
        название: текст(строка.title) || 'Событие',
        дата,
        время: текст(строка.time) || null,
        длительностьМинут: null,
        место: '',
        заметка: текст(строка.note),
        сфераId: null,
        весьДень: !текст(строка.time),
        ...времяЗаписи(строка),
        legacy: остаток(строка, [...СЛУЖЕБНЫЕ, 'title', 'date', 'time', 'note']),
      }) as Событие
    })
    .filter((запись): запись is Событие => запись !== null)

  if (новые.length > 0) await база.events.bulkPut(новые)
  return {
    строка: { название: 'События', перенесено: новые.length, из: старые.length },
  }
}

export async function перенестиЛюдей(
  состояние: Запись,
): Promise<{ строка: СтрокаОтчёта }> {
  const старые = массив(состояние, 'people')
  const клиенты = массив(состояние, 'clients')

  const собрать = (строка: Запись, роль: string) =>
    новаяЗапись({
      имя: текст(строка.name) || 'Без имени',
      отношения: текст(строка.role) || текст(строка.category) || роль,
      телефон: текст(строка.phone),
      почта: текст(строка.email),
      деньРождения: датаИлиNull(строка.birthday),
      важныеДаты: [],
      заметка: собратьТекст(строка, [
        ['note', ''],
        ['importantFacts', 'Важное'],
        ['interests', 'Интересы'],
        ['likes', 'Нравится'],
        ['dislikes', 'Не нравится'],
        ['joy', 'Радует'],
        ['avoid', 'Избегать'],
        ['talkIdeas', 'О чём поговорить'],
        ['importantDates', 'Важные даты'],
        ['telegram', 'Телеграм'],
        ['city', 'Город'],
      ]),
      обещания: собратьТекст(строка, [
        ['promisesMine', 'Я обещал'],
        ['promisesTheirs', 'Мне обещали'],
        ['nextPromise', 'Ближайшее обещание'],
        ['promiseDue', 'Срок'],
      ]),
      подарки: собратьТекст(строка, [
        ['giftIdeas', 'Идеи подарков'],
        ['gifts', 'Дарил'],
        ['wishlist', 'Хочет'],
      ]),
      последнийКонтакт: датаИлиNull(строка.lastContact),
      напоминатьЧерезДней:
        числоИлиNull(строка.contactCadenceDays) ??
        числоИлиNull(строка.birthdayReminderDays),
      постер: текст(строка.avatar) || текст(строка.photo),
      ...времяЗаписи(строка),
      legacy: остаток(строка, [
        ...СЛУЖЕБНЫЕ,
        'name',
        'role',
        'category',
        'phone',
        'email',
        'birthday',
        'note',
        'importantFacts',
        'interests',
        'likes',
        'dislikes',
        'joy',
        'avoid',
        'talkIdeas',
        'importantDates',
        'telegram',
        'city',
        'promisesMine',
        'promisesTheirs',
        'nextPromise',
        'promiseDue',
        'giftIdeas',
        'gifts',
        'wishlist',
        'lastContact',
        'contactCadenceDays',
        'birthdayReminderDays',
        'avatar',
        'photo',
      ]),
    }) as Человек

  const новые = [
    ...старые.map((строка) => собрать(строка, 'знакомый')),
    ...клиенты.map((строка) => собрать(строка, 'клиент')),
  ]

  if (новые.length > 0) await база.people.bulkPut(новые)
  return {
    строка: {
      название: 'Люди',
      перенесено: новые.length,
      из: старые.length + клиенты.length,
    },
  }
}

export async function перенестиВходящие(
  состояние: Запись,
): Promise<{ строка: СтрокаОтчёта }> {
  const старые = массив(состояние, 'inbox')
  const новые = старые.map((строка) =>
    новаяЗапись({
      текст: [текст(строка.title), текст(строка.text)].filter(Boolean).join(' — '),
      разобрано: false,
      источник: 'импорт' as const,
      ...времяЗаписи(строка),
      legacy: остаток(строка, [...СЛУЖЕБНЫЕ, 'title', 'text']),
    }),
  ) as Входящее[]

  if (новые.length > 0) await база.inbox.bulkPut(новые)
  return {
    строка: { название: 'Входящие', перенесено: новые.length, из: старые.length },
  }
}

/** Архив прежней версии сохраняется как быстрые записи с исходным содержимым. */
export async function перенестиАрхив(
  состояние: Запись,
): Promise<{ строка: СтрокаОтчёта }> {
  const старые = массив(состояние, 'archive')
  const новые = старые.map((строка) =>
    новаяЗапись({
      текст: `Из архива (${текст(строка.type) || 'запись'}): ${текст(строка.title)}`,
      разобрано: true,
      источник: 'импорт' as const,
      legacy: { прежняяКоллекция: 'archive', ...остаток(строка, []) },
    }),
  ) as Входящее[]

  if (новые.length > 0) await база.inbox.bulkPut(новые)
  return {
    строка: { название: 'Архив', перенесено: новые.length, из: старые.length },
  }
}
