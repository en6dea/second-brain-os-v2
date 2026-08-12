import { useEffect } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Inbox, LayoutDashboard, ListChecks, Repeat, Wallet, X } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { CommandMenu } from './CommandMenu'
import { QuickAdd } from './QuickAdd'
import { useИнтерфейс } from '@/app/providers/ui'
import { слушатьСистемнуюТему } from '@/app/providers/theme'
import { подготовитьПервыйЗапуск, читатьПрофиль } from '@/core/db/repo'
import { запроситьПостоянноеХранение } from '@/core/db/Persistence'
import { cn } from '@/design-system/classNames'
import { IconButton } from '@/design-system/components'

const МЕНЮ_ТЕЛЕФОНА = [
  { путь: '/', название: 'Главная', иконка: LayoutDashboard },
  { путь: '/tasks', название: 'Задачи', иконка: ListChecks },
  { путь: '/habits', название: 'Привычки', иконка: Repeat },
  { путь: '/finance', название: 'Деньги', иконка: Wallet },
  { путь: '/inbox', название: 'Разбор', иконка: Inbox },
]

export function AppShell() {
  const менюОткрыто = useИнтерфейс((с) => с.менюНаТелефоне)
  const открытьМеню = useИнтерфейс((с) => с.открытьМеню)
  const уведомление = useИнтерфейс((с) => с.уведомление)
  const открытьКомандноеОкно = useИнтерфейс((с) => с.открытьКомандноеОкно)

  const расположение = useLocation()

  // Подготовка первого запуска пишет в базу, поэтому выполняется отдельно:
  // внутри живого запроса запись запрещена.
  useEffect(() => {
    void подготовитьПервыйЗапуск()
    // Без этого браузер вправе вытеснить хранилище при нехватке места,
    // и данные исчезнут без предупреждения.
    void запроситьПостоянноеХранение()
  }, [])

  const профиль = useLiveQuery(() => читатьПрофиль(), [])

  useEffect(() => слушатьСистемнуюТему(), [])

  useEffect(() => {
    const наКлавишу = (событие: KeyboardEvent) => {
      if (
        (событие.ctrlKey || событие.metaKey) &&
        событие.key.toLowerCase() === 'k'
      ) {
        событие.preventDefault()
        открытьКомандноеОкно(true)
      }
    }
    window.addEventListener('keydown', наКлавишу)
    return () => window.removeEventListener('keydown', наКлавишу)
  }, [открытьКомандноеОкно])

  return (
    <div className="flex h-full">
      {/* Настольное меню */}
      <aside className="hidden w-[248px] shrink-0 border-r border-line lg:block">
        <Sidebar />
      </aside>

      {/* Меню на телефоне */}
      {менюОткрыто ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Закрыть меню"
            onClick={() => открытьМеню(false)}
            className="absolute inset-0 bg-black/45"
          />
          <div className="anim-rise relative h-full w-[268px] border-r border-line shadow-3">
            <Sidebar наПереход={() => открытьМеню(false)} />
            <IconButton
              подпись="Закрыть меню"
              onClick={() => открытьМеню(false)}
              className="absolute top-4 right-3"
            >
              <X size={18} />
            </IconButton>
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar имя={профиль?.имя ?? ''} />
        <main className="min-h-0 flex-1 overflow-y-auto px-3 pt-4 pb-24 sm:px-5 lg:pb-8">
          <div
            key={расположение.pathname}
            className="вход-раздела mx-auto w-full max-w-[1180px]"
          >
            <Outlet />
          </div>
        </main>
      </div>

      {/* Нижнее меню телефона — самостоятельное, а не уменьшенное настольное */}
      <nav className="fixed right-0 bottom-0 left-0 z-30 grid grid-cols-5 border-t border-line bg-card/95 backdrop-blur-md lg:hidden">
        {МЕНЮ_ТЕЛЕФОНА.map((пункт) => (
          <NavLink
            key={пункт.путь}
            to={пункт.путь}
            end={пункт.путь === '/'}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-0.5 py-2 text-[10px] transition-colors',
                isActive ? 'text-accent' : 'text-ink-3',
              )
            }
          >
            <пункт.иконка size={19} />
            <span>{пункт.название}</span>
          </NavLink>
        ))}
      </nav>

      <CommandMenu />
      <QuickAdd />

      {уведомление ? (
        <div
          role="status"
          className="anim-pop fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-3 border border-line bg-over px-4 py-2.5 text-[13px] text-ink shadow-3 lg:bottom-6"
        >
          {уведомление}
        </div>
      ) : null}
    </div>
  )
}
