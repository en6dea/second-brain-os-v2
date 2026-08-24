import { NavLink, Outlet } from 'react-router-dom'
import { МЕНЮ_ФИНАНСОВ } from '@/app/navigation'
import { cn } from '@/design-system/classNames'

export function FinanceLayout() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-h2 font-medium text-ink">Финансы</h1>
        <p className="mt-0.5 text-meta text-ink-3">
          Собственные деньги, обязательства и движение средств. Все суммы считаются
          из операций и остатков счетов.
        </p>
      </div>

      <nav className="domain-nav scrollbar-none -mx-1 px-1">
        {МЕНЮ_ФИНАНСОВ.map((пункт) => (
          <NavLink
            key={пункт.путь}
            to={пункт.путь}
            end={пункт.путь === '/finance'}
            className={({ isActive }) =>
              cn(
                'domain-tab shrink-0 px-0 text-meta',
                isActive ? 'font-medium text-ink' : 'text-ink-3',
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
