import { NavLink, Outlet } from 'react-router-dom'
import { МЕНЮ_ФИНАНСОВ } from '@/app/navigation'
import { cn } from '@/design-system/classNames'

export function FinanceLayout() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[20px] font-semibold text-ink">Финансы</h1>
        <p className="mt-0.5 text-[13px] text-ink-3">
          Собственные деньги, обязательства и движение средств. Все суммы считаются
          из операций и остатков счетов.
        </p>
      </div>

      <nav className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
        {МЕНЮ_ФИНАНСОВ.map((пункт) => (
          <NavLink
            key={пункт.путь}
            to={пункт.путь}
            end={пункт.путь === '/finance'}
            className={({ isActive }) =>
              cn(
                'shrink-0 rounded-2 px-3 py-1.5 text-[13px] font-medium transition-colors',
                isActive
                  ? 'bg-accent-soft text-accent'
                  : 'text-ink-3 hover:bg-hover hover:text-ink',
              )
            }
          >
            {пункт.название}
          </NavLink>
        ))}
      </nav>

      <Outlet />
    </div>
  )
}
