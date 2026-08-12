import {
  BarChart3,
  BookOpen,
  Briefcase,
  CalendarDays,
  CircleDollarSign,
  Compass,
  GraduationCap,
  HeartHandshake,
  Inbox,
  LayoutDashboard,
  LineChart,
  ListChecks,
  NotebookPen,
  Repeat,
  Scale,
  Settings,
  Sparkles,
  Target,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react'

export interface ПунктМеню {
  путь: string
  название: string
  иконка: LucideIcon
}

export interface ГруппаМеню {
  название: string
  пункты: ПунктМеню[]
}

/**
 * Карта приложения.
 *
 * Шесть групп вместо длинного списка: человек ищет не «страницу»,
 * а ответ на вопрос — что сейчас, куда иду, как живу, как с деньгами,
 * что знаю, как система в целом.
 */
export const МЕНЮ: ГруппаМеню[] = [
  {
    название: 'Сегодня',
    пункты: [
      { путь: '/', название: 'Главная', иконка: LayoutDashboard },
      { путь: '/inbox', название: 'Разбор', иконка: Inbox },
      {
        путь: '/calendar',
        название: 'Календарь',
        иконка: CalendarDays,
      },
    ],
  },
  {
    название: 'Направление',
    пункты: [
      { путь: '/goals', название: 'Цели', иконка: Target },
      { путь: '/tasks', название: 'Задачи', иконка: ListChecks },
      {
        путь: '/projects',
        название: 'Проекты',
        иконка: Briefcase,
      },
      {
        путь: '/planning',
        название: 'Планирование',
        иконка: Compass,
      },
    ],
  },
  {
    название: 'Жизнь',
    пункты: [
      { путь: '/habits', название: 'Привычки', иконка: Repeat },
      { путь: '/people', название: 'Люди', иконка: Users },
      {
        путь: '/relationship',
        название: 'Отношения',
        иконка: HeartHandshake,
      },
      {
        путь: '/experience',
        название: 'Опыт и вызовы',
        иконка: Sparkles,
      },
    ],
  },
  {
    название: 'Деньги',
    пункты: [
      { путь: '/finance', название: 'Финансы', иконка: Wallet },
      {
        путь: '/obligations',
        название: 'Обязательства',
        иконка: Scale,
      },
      {
        путь: '/trading',
        название: 'Торговля',
        иконка: LineChart,
      },
    ],
  },
  {
    название: 'Знание',
    пункты: [
      { путь: '/knowledge', название: 'Знания', иконка: BookOpen },
      {
        путь: '/learning',
        название: 'Обучение',
        иконка: GraduationCap,
      },
      {
        путь: '/journal',
        название: 'Дневник',
        иконка: NotebookPen,
      },
    ],
  },
  {
    название: 'Система',
    пункты: [
      {
        путь: '/reviews',
        название: 'Обзоры',
        иконка: CircleDollarSign,
      },
      {
        путь: '/analytics',
        название: 'Аналитика',
        иконка: BarChart3,
      },
      { путь: '/settings', название: 'Настройки', иконка: Settings },
    ],
  },
]

/** Вложенная навигация раздела «Финансы». */
export const МЕНЮ_ФИНАНСОВ = [
  { путь: '/finance', название: 'Обзор' },
  { путь: '/finance/accounts', название: 'Счета' },
  { путь: '/finance/operations', название: 'Операции' },
  { путь: '/finance/categories', название: 'Категории' },
  { путь: '/finance/budget', название: 'Бюджет' },
  { путь: '/finance/import', название: 'Импорт выписки' },
  { путь: '/finance/reconciliation', название: 'Сверка' },
]

/** Плоский список для поиска и командного окна. */
export const ВСЕ_ПУНКТЫ: ПунктМеню[] = МЕНЮ.flatMap((группа) => группа.пункты)
