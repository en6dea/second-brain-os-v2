import Dexie, { type EntityTable } from 'dexie'
import type {
  БюджетМесяца,
  Вложение,
  Входящее,
  Вызов,
  ДелоВдвоём,
  Замысел,
  ДеньПартнёра,
  ЗаписьДневника,
  ЗаписьЗнания,
  Задача,
  КатегорияДенег,
  МатериалОбучения,
  Метка,
  Напоминание,
  Настройки,
  Обзор,
  Обязательство,
  Операция,
  Опыт,
  План,
  ПланВдвоём,
  ПлановыйПлатёж,
  ПлатёжПоОбязательству,
  Папка,
  Надгробие,
  Показатель,
  Привычка,
  Проект,
  Профиль,
  Сверка,
  Сделка,
  Событие,
  Сфера,
  Счёт,
  Цель,
  Человек,
} from './types'

/**
 * Хранилище приложения.
 *
 * Всё пользовательское содержимое лежит здесь, в IndexedDB, включая тему,
 * уведомления и прочие настройки вида. localStorage не используется вовсе:
 * ему негде хранить данные, которых он не потеряет при очистке браузером.
 */
export class БазаВторойМозг extends Dexie {
  profile!: EntityTable<Профиль, 'id'>
  areas!: EntityTable<Сфера, 'id'>
  folders!: EntityTable<Папка, 'id'>
  tags!: EntityTable<Метка, 'id'>

  goals!: EntityTable<Цель, 'id'>
  projects!: EntityTable<Проект, 'id'>
  tasks!: EntityTable<Задача, 'id'>
  inbox!: EntityTable<Входящее, 'id'>
  plans!: EntityTable<План, 'id'>

  habits!: EntityTable<Привычка, 'id'>
  events!: EntityTable<Событие, 'id'>
  people!: EntityTable<Человек, 'id'>
  experiences!: EntityTable<Опыт, 'id'>
  challenges!: EntityTable<Вызов, 'id'>
  reminders!: EntityTable<Напоминание, 'id'>

  partnerDays!: EntityTable<ДеньПартнёра, 'id'>
  coupleActivities!: EntityTable<ДелоВдвоём, 'id'>
  couplePlans!: EntityTable<ПланВдвоём, 'id'>

  intentions!: EntityTable<Замысел, 'id'>

  accounts!: EntityTable<Счёт, 'id'>
  operations!: EntityTable<Операция, 'id'>
  moneyCategories!: EntityTable<КатегорияДенег, 'id'>
  budgets!: EntityTable<БюджетМесяца, 'id'>
  plannedPayments!: EntityTable<ПлановыйПлатёж, 'id'>
  obligations!: EntityTable<Обязательство, 'id'>
  obligationPayments!: EntityTable<ПлатёжПоОбязательству, 'id'>
  reconciliations!: EntityTable<Сверка, 'id'>

  trades!: EntityTable<Сделка, 'id'>

  knowledge!: EntityTable<ЗаписьЗнания, 'id'>
  learning!: EntityTable<МатериалОбучения, 'id'>
  journal!: EntityTable<ЗаписьДневника, 'id'>

  reviews!: EntityTable<Обзор, 'id'>
  metrics!: EntityTable<Показатель, 'id'>
  attachments!: EntityTable<Вложение, 'id'>
  settings!: EntityTable<Настройки, 'id'>

  syncTombstones!: EntityTable<Надгробие, 'id'>

  constructor(имяБазы = 'ВторойМозг2') {
    super(имяБазы)

    this.version(1).stores({
      profile: 'id',
      areas: 'id, порядок, архив',
      folders: 'id, родительId, сфераId, порядок',
      tags: 'id, название',

      goals: 'id, состояние, сфераId, срок, порядок',
      projects: 'id, состояние, сфераId, срок',
      tasks: 'id, дата, состояние, проектId, цельId, сфераId, [состояние+дата]',
      inbox: 'id, разобрано, createdAt',
      plans: 'id, тип, период, [тип+период]',

      habits: 'id, активна, цельId, сфераId',
      events: 'id, дата, сфераId',
      people: 'id, имя, деньРождения, последнийКонтакт',
      experiences: 'id, месяц, состояние',
      challenges: 'id, месяц, завершён',
      reminders: 'id, когда, выполнено',

      accounts: 'id, тип, архив, порядок',
      operations:
        'id, дата, тип, счётId, категорияId, разобрана, отпечатокИмпорта, [тип+дата]',
      moneyCategories: 'id, вид, архив, порядок',
      budgets: 'id, месяц',
      plannedPayments: 'id, дата, оплачен, обязательный',
      obligations: 'id, направление, закрыто, датаСледующегоПлатежа',
      obligationPayments: 'id, обязательствоId, дата',
      reconciliations: 'id, счётId, дата, закрыта',

      trades: 'id, счётТипа, инструмент, открыта, закрыта',

      knowledge: 'id, вид, папкаId, проектId, цельId, избранное',
      learning: 'id, состояние, цельId',
      journal: 'id, дата, вид, личное',

      reviews: 'id, вид, период, [вид+период]',
      metrics: 'id, ключ, дата, [ключ+дата]',
      attachments: 'id, связьТип, связьId',
      settings: 'id',
    })

    // Версия 2: у знаний, целей, привычек, людей и материалов обучения
    // появилась картинка. Поля не
    // переименованы и ничего не удалено — существующие записи получают
    // пустую строку, чтобы «картинки нет» было явным значением,
    // а не отсутствием поля.
    this.version(2)
      .stores({})
      .upgrade(async (перенос) => {
        for (const имя of ['knowledge', 'goals', 'habits', 'people', 'learning']) {
          await перенос
            .table(имя)
            .toCollection()
            .modify((запись: { постер?: string }) => {
              if (запись.постер === undefined) запись.постер = ''
            })
        }
        await перенос
          .table('settings')
          .toCollection()
          .modify((запись: { показыватьПостеры?: boolean }) => {
            if (запись.показыватьПостеры === undefined)
              запись.показыватьПостеры = true
          })
      })

    // Версия 3: раздел отношений — дни близкого человека, дела вдвоём и планы
    // вдвоём. У опыта появилось поле «чей»: в игре с новым опытом каждый
    // выбирает за себя. Прежние записи опыта остаются моими.
    this.version(3)
      .stores({
        partnerDays: 'id, дата, человекId, цикл',
        coupleActivities: 'id, дата, состояние',
        couplePlans: 'id, горизонт, период, [горизонт+период]',
      })
      .upgrade(async (перенос) => {
        await перенос
          .table('experiences')
          .toCollection()
          .modify((запись: { чей?: string }) => {
            if (запись.чей === undefined) запись.чей = ''
          })
      })

    // Версия 4: у записей дневника появился разговор с собой — утверждение дня
    // и три ответа на него. Прежние записи получают пустые поля: пустое здесь
    // означает «не заполняли», а не «нечего сказать».
    this.version(4)
      .stores({})
      .upgrade(async (перенос) => {
        await перенос
          .table('journal')
          .toCollection()
          .modify(
            (запись: {
              утверждение?: string
              чтоЧувствую?: string
              чтоДумаю?: string
              согласие?: string | null
            }) => {
              if (запись.утверждение === undefined) запись.утверждение = ''
              if (запись.чтоЧувствую === undefined) запись.чтоЧувствую = ''
              if (запись.чтоДумаю === undefined) запись.чтоДумаю = ''
              if (запись.согласие === undefined) запись.согласие = null
            },
          )
        await перенос
          .table('settings')
          .toCollection()
          .modify((запись: { своиУтверждения?: string[] }) => {
            if (запись.своиУтверждения === undefined) запись.своиУтверждения = []
          })
      })

    // Версия 5: универсальный планер. Покупка, поездка, проект, событие и
    // обычный план живут в одной таблице: поля у них одни и те же, а вид
    // меняет только подсказки и сводку.
    this.version(5).stores({
      intentions: 'id, вид, состояние, датаЦели',
    })

    // Версия 6: у замысла появился признак «вдвоём». Совместная поездка
    // заводится один раз и видна в обоих разделах. Прежние замыслы остаются
    // своими: приписывать человеку общие планы задним числом нельзя.
    this.version(6)
      .stores({
        intentions: 'id, вид, состояние, датаЦели, вдвоём',
      })
      .upgrade(async (перенос) => {
        await перенос
          .table('intentions')
          .toCollection()
          .modify((запись: { вдвоём?: boolean }) => {
            if (запись.вдвоём === undefined) запись.вдвоём = false
          })
      })

    // Версия 7: уведомления. Выключены по умолчанию — человек включает их
    // сам явным действием, как того требует браузер. Список показанного
    // хранится, чтобы обновление страницы не повторило напоминание.
    this.version(7)
      .stores({})
      .upgrade(async (перенос) => {
        await перенос
          .table('settings')
          .toCollection()
          .modify(
            (запись: {
              уведомленияВключены?: boolean
              показанныеНапоминания?: { день: string; ключи: string[] }
            }) => {
              if (запись.уведомленияВключены === undefined) {
                запись.уведомленияВключены = false
              }
              if (запись.показанныеНапоминания === undefined) {
                запись.показанныеНапоминания = { день: '', ключи: [] }
              }
            },
          )
      })

    // Версия 8: надгробия удалений для синхронизации. Своя таблица, а не
    // поле «удалено» на существующих записях — так ни одна прежняя таблица
    // не меняет форму, и добавление синхронизации ничем не рискует данными,
    // которые уже есть.
    this.version(8).stores({
      syncTombstones: 'id, таблица, удаленоВ',
    })

    // Версия 9: подключение к синхронизации. Выключено по умолчанию —
    // до этого коммита раздела «Синхронизация» в приложении не было вовсе.
    this.version(9)
      .stores({})
      .upgrade(async (перенос) => {
        await перенос
          .table('settings')
          .toCollection()
          .modify(
            (запись: {
              синхронизация?: { конфигурация: unknown; отметка: string | null }
            }) => {
              if (запись.синхронизация === undefined) {
                запись.синхронизация = { конфигурация: null, отметка: null }
              }
            },
          )
      })

    // Версия 10: у обязательства появилась периодичность платежа. `null` —
    // прежнее поведение без изменений: дату следующего платежа человек
    // передвигает сам. Существующие обязательства получают `null`, а не
    // угаданную периодичность — это было бы числом из ничего.
    this.version(10)
      .stores({})
      .upgrade(async (перенос) => {
        await перенос
          .table('obligations')
          .toCollection()
          .modify((запись: { повторПлатежа?: string | null }) => {
            if (запись.повторПлатежа === undefined) запись.повторПлатежа = null
          })
      })

    this.on('ready', () => регистрироватьНадгробия(this), true)
  }
}

/**
 * Надгробие на каждое удаление из синхронизируемой таблицы.
 *
 * Один хук на таблицу вместо правки каждого места в коде, где сейчас или
 * когда-нибудь появится вызов `.delete()`: их по всему приложению больше
 * сорока, и пропустить один — значит незаметно сломать синхронизацию для
 * одной таблицы. Хук стоит на самой базе и сработает для любого способа
 * удаления, включая тот, что ещё не написан.
 *
 * Настройки и надгробия сами себя не хоронят: первые не синхронизируются
 * вовсе, вторые не должны бесконечно порождать надгробия на надгробия.
 */
function регистрироватьНадгробия(база: БазаВторойМозг) {
  for (const имя of ТАБЛИЦЫ) {
    if (имя === 'settings') continue
    база.table(имя).hook('deleting', function (primKey) {
      // Хук выполняется внутри транзакции удаления, которая открыта только
      // на эту таблицу: писать в другую таблицу («надгробия») прямо здесь
      // некуда — Dexie не даёт присоединиться к транзакции, для которой она
      // не объявлена. `onsuccess` срабатывает после того, как удаление уже
      // зафиксировано, и открывает собственную, отдельную транзакцию.
      // Это исключает совпадающий, но не атомарный шаг: удаление и
      // надгробие — два отдельных момента, а не один. Для личного
      // приложения с периодической синхронизацией это приемлемо; ради
      // этого не пришлось трогать ни одно из мест в коде, где вызывается
      // `.delete()`.
      ;(this as { onsuccess?: () => void }).onsuccess = () => {
        // `onsuccess` всё ещё выполняется в «зоне» исходной транзакции Dexie
        // (только на эту таблицу) — обычный вызов `.put()` здесь пытается
        // присоединиться именно к ней и падает: она не включает
        // «надгробия». `ignoreTransaction` — документированный способ выйти
        // из этой зоны и открыть новую, отдельную транзакцию.
        Dexie.ignoreTransaction(() => {
          void база.syncTombstones.put({
            id: `${имя}:${String(primKey)}`,
            таблица: имя,
            recordId: String(primKey),
            удаленоВ: new Date().toISOString(),
          })
        })
      }
    })
  }
}

export const база = new БазаВторойМозг()

/** Перечень таблиц — используется копированием, поиском и переносом данных. */
export const ТАБЛИЦЫ = [
  'profile',
  'areas',
  'folders',
  'tags',
  'goals',
  'projects',
  'tasks',
  'inbox',
  'plans',
  'habits',
  'events',
  'people',
  'experiences',
  'challenges',
  'reminders',
  'partnerDays',
  'coupleActivities',
  'couplePlans',
  'intentions',
  'accounts',
  'operations',
  'moneyCategories',
  'budgets',
  'plannedPayments',
  'obligations',
  'obligationPayments',
  'reconciliations',
  'trades',
  'knowledge',
  'learning',
  'journal',
  'reviews',
  'metrics',
  'settings',
] as const

export type ИмяТаблицы = (typeof ТАБЛИЦЫ)[number]

/** Человеческие названия таблиц для отчётов о переносе и копировании. */
export const НАЗВАНИЯ_ТАБЛИЦ: Record<ИмяТаблицы, string> = {
  profile: 'Профиль',
  areas: 'Сферы жизни',
  folders: 'Папки',
  tags: 'Метки',
  goals: 'Цели',
  projects: 'Проекты',
  tasks: 'Задачи',
  inbox: 'Входящие',
  plans: 'Планы',
  habits: 'Привычки',
  events: 'События',
  people: 'Люди',
  experiences: 'Новый опыт',
  challenges: 'Вызовы месяца',
  reminders: 'Напоминания',
  partnerDays: 'Дни близкого человека',
  coupleActivities: 'Дела вдвоём',
  couplePlans: 'Планы вдвоём',
  intentions: 'Планер',
  accounts: 'Счета',
  operations: 'Операции',
  moneyCategories: 'Категории денег',
  budgets: 'Бюджеты',
  plannedPayments: 'Плановые платежи',
  obligations: 'Обязательства',
  obligationPayments: 'Платежи по обязательствам',
  reconciliations: 'Сверки',
  trades: 'Сделки',
  knowledge: 'Знания',
  learning: 'Обучение',
  journal: 'Дневник',
  reviews: 'Обзоры',
  metrics: 'Показатели',
  settings: 'Настройки',
}
