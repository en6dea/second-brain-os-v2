import {
  BarChart3,
  BookOpen,
  Briefcase,
  CalendarDays,
  CircleDollarSign,
  Compass,
  GraduationCap,
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
  /** Раздел готов и работает с данными, а не показывает план. */
  готов: boolean
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
      { путь: '/', название: 'Главная', иконка: LayoutDashboard, готов: true },
      { путь: '/inbox', название: 'Разбор', иконка: Inbox, готов: true },
      {
        путь: '/calendar',
        название: 'Календарь',
        иконка: CalendarDays,
        готов: false,
      },
    ],
  },
  {
    название: 'Направление',
    пункты: [
      { путь: '/goals', название: 'Цели', иконка: Target, готов: true },
      { путь: '/tasks', название: 'Задачи', иконка: ListChecks, готов: true },
      {
        путь: '/projects',
        название: 'Проекты',
        иконка: Briefcase,
        готов: false,
      },
      {
        путь: '/planning',
        название: 'Планирование',
        иконка: Compass,
        готов: false,
      },
    ],
  },
  {
    название: 'Жизнь',
    пункты: [
      { путь: '/habits', название: 'Привычки', иконка: Repeat, готов: true },
      { путь: '/people', название: 'Люди', иконка: Users, готов: true },
      {
        путь: '/experience',
        название: 'Опыт и вызовы',
        иконка: Sparkles,
        готов: false,
      },
    ],
  },
  {
    название: 'Деньги',
    пункты: [
      { путь: '/finance', название: 'Финансы', иконка: Wallet, готов: true },
      {
        путь: '/obligations',
        название: 'Обязательства',
        иконка: Scale,
        готов: true,
      },
      {
        путь: '/trading',
        название: 'Торговля',
        иконка: LineChart,
        готов: false,
      },
    ],
  },
  {
    название: 'Знание',
    пункты: [
      { путь: '/knowledge', название: 'Знания', иконка: BookOpen, готов: true },
      {
        путь: '/learning',
        название: 'Обучение',
        иконка: GraduationCap,
        готов: true,
      },
      {
        путь: '/journal',
        название: 'Дневник',
        иконка: NotebookPen,
        готов: true,
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
        готов: false,
      },
      {
        путь: '/analytics',
        название: 'Аналитика',
        иконка: BarChart3,
        готов: false,
      },
      { путь: '/settings', название: 'Настройки', иконка: Settings, готов: true },
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
