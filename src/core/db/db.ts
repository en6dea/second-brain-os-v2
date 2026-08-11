import Dexie, { type EntityTable } from 'dexie'
import type {
  БюджетМесяца,
  Вложение,
  Входящее,
  Вызов,
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
