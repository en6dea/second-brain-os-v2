import { createBrowserRouter, createHashRouter } from 'react-router-dom'
import { AppShell } from '@/app/layout/AppShell'
import { DashboardPage } from '@/features/dashboard/DashboardPage'

/**
 * Маршруты.
 *
 * Главная загружается сразу — с неё начинается работа.
 * Остальные разделы подгружаются по требованию: тяжёлые графики не должны
 * замедлять первый экран.
 */
const маршруты = [
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <DashboardPage /> },
      {
        path: 'inbox',
        lazy: async () => ({
          Component: (await import('@/features/inbox/InboxPage')).InboxPage,
        }),
      },
      {
        path: 'tasks',
        lazy: async () => ({
          Component: (await import('@/features/tasks/TasksPage')).TasksPage,
        }),
      },
      {
        path: 'goals',
        lazy: async () => ({
          Component: (await import('@/features/goals/GoalsPage')).GoalsPage,
        }),
      },
      {
        path: 'habits',
        lazy: async () => ({
          Component: (await import('@/features/habits/HabitsPage')).HabitsPage,
        }),
      },
      {
        path: 'journal',
        lazy: async () => ({
          Component: (await import('@/features/journal/JournalPage')).JournalPage,
        }),
      },
      {
        path: 'obligations',
        lazy: async () => ({
          Component: (await import('@/features/obligations/ObligationsPage'))
            .ObligationsPage,
        }),
      },
      {
        path: 'settings',
        lazy: async () => ({
          Component: (await import('@/features/settings/SettingsPage'))
            .SettingsPage,
        }),
      },
      {
        path: 'finance',
        lazy: async () => ({
          Component: (await import('@/features/finance/FinanceLayout'))
            .FinanceLayout,
        }),
        children: [
          {
            index: true,
            lazy: async () => ({
              Component: (await import('@/features/finance/pages/Overview'))
                .FinanceOverview,
            }),
          },
          {
            path: 'accounts',
            lazy: async () => ({
              Component: (await import('@/features/finance/pages/Accounts'))
                .AccountsPage,
            }),
          },
          {
            path: 'operations',
            lazy: async () => ({
              Component: (await import('@/features/finance/pages/Operations'))
                .OperationsPage,
            }),
          },
          {
            path: 'categories',
            lazy: async () => ({
              Component: (await import('@/features/finance/pages/Categories'))
                .CategoriesPage,
            }),
          },
          {
            path: 'budget',
            lazy: async () => ({
              Component: (await import('@/features/finance/pages/Budget'))
                .BudgetPage,
            }),
          },
          {
            path: 'import',
            lazy: async () => ({
              Component: (await import('@/features/finance/pages/Import'))
                .ImportPage,
            }),
          },
          {
            path: 'reconciliation',
            lazy: async () => ({
              Component: (await import('@/features/finance/pages/Reconciliation'))
                .ReconciliationPage,
            }),
          },
        ],
      },
      {
        path: 'knowledge',
        lazy: async () => ({
          Component: (await import('@/features/knowledge/KnowledgePage'))
            .KnowledgePage,
        }),
      },
      {
        path: 'people',
        lazy: async () => ({
          Component: (await import('@/features/people/PeoplePage')).PeoplePage,
        }),
      },
      {
        path: 'learning',
        lazy: async () => ({
          Component: (await import('@/features/learning/LearningPage'))
            .LearningPage,
        }),
      },
      {
        path: 'calendar',
        lazy: async () => ({
          Component: (await import('@/features/calendar/CalendarPage'))
            .CalendarPage,
        }),
      },
      {
        path: 'trading',
        lazy: async () => ({
          Component: (await import('@/features/trading/TradingPage')).TradingPage,
        }),
      },
      {
        path: 'reviews',
        lazy: async () => ({
          Component: (await import('@/features/reviews/ReviewsPage')).ReviewsPage,
        }),
      },
      {
        path: 'analytics',
        lazy: async () => ({
          Component: (await import('@/features/analytics/AnalyticsPage'))
            .AnalyticsPage,
        }),
      },
      // Разделы, которые ещё не построены. Страница честно описывает,
      // что в них будет и на каком этапе.
      ...['projects', 'planning', 'experience', '*'].map((путь) => ({
        path: путь,
        lazy: async () => ({
          Component: (await import('@/features/planned/PlannedPage')).PlannedPage,
        }),
      })),
    ],
  },
]

/**
 * На GitHub Pages нет серверной обработки путей, поэтому там используется
 * адресация через решётку — иначе обновление страницы отдаёт ошибку 404.
 */
export const маршрутизатор =
  import.meta.env.MODE === 'production' && import.meta.env.BASE_URL !== '/'
    ? createHashRouter(маршруты)
    : createBrowserRouter(маршруты, { basename: import.meta.env.BASE_URL })
