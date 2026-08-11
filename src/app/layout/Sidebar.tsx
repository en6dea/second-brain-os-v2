import { NavLink } from 'react-router-dom'
import { Brain } from 'lucide-react'
import { МЕНЮ } from '@/app/navigation'
import { cn } from '@/design-system/classNames'
import { использоватьИнтерфейс } from '@/app/providers/ui'

export function Sidebar({ наПереход }: { наПереход?: () => void }) {
  return (
    <div className="flex h-full flex-col bg-card">
      <div className="flex items-center gap-2.5 px-5 pt-5 pb-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-3 bg-accent text-on-accent">
          <Brain size={18} />
        </span>
        <span className="min-w-0">
          <span className="block text-[14px] leading-tight font-semibold text-ink">
            Второй мозг
          </span>
          <span className="block text-[11px] text-ink-3">
            панель управления жизнью
          </span>
        </span>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
        {МЕНЮ.map((группа) => (
          <div key={группа.название} className="mb-4">
            <h2 className="px-2 pb-1.5 text-[10px] font-semibold tracking-[0.16em] text-ink-3 uppercase">
              {группа.название}
            </h2>
            <ul className="space-y-0.5">
              {группа.пункты.map((пункт) => (
                <li key={пункт.путь}>
                  <NavLink
                    to={пункт.путь}
                    end={пункт.путь === '/'}
                    onClick={наПереход}
                    className={({ isActive }) =>
                      cn(
                        'group flex items-center gap-2.5 rounded-2 px-2.5 py-2 text-[13.5px]',
                        'transition-colors duration-150',
                        isActive
                          ? 'bg-accent-soft font-medium text-accent'
                          : 'text-ink-2 hover:bg-hover hover:text-ink',
                      )
                    }
                  >
                    <пункт.иконка size={16} className="shrink-0" />
                    <span className="min-w-0 flex-1 truncate">
                      {пункт.название}
                    </span>
                    {!пункт.готов ? (
                      <span
                        title="Раздел в плане — пока показывает, что в нём будет"
                        className="h-1.5 w-1.5 shrink-0 rounded-full bg-line-strong"
                      />
                    ) : null}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-line px-4 py-3">
        <button
          type="button"
          onClick={() =>
            использоватьИнтерфейс.getState().открытьКомандноеОкно(true)
          }
          className="flex w-full items-center justify-between rounded-2 border border-line px-2.5 py-1.5 text-left text-[12px] text-ink-3 transition-colors hover:border-line-strong hover:text-ink-2"
        >
          <span>Поиск и команды</span>
          <kbd className="rounded border border-line bg-sunken px-1.5 py-0.5 text-[10px]">
            Ctrl K
          </kbd>
        </button>
      </div>
    </div>
  )
}
