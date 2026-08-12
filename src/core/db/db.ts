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
 * Всё пользовательское содержимое лежит здесь, в IndexedDB.
 * В localStorage допустимы только тема, мелкие настройки вида и признаки
 * возможностей — данные там не хранятся никогда.
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
