import { NavLink, useLocation } from 'react-router-dom'
import { Brain } from 'lucide-react'
import { ДОМЕНЫ, доменПоАдресу } from '@/app/navigation'
import { модификатор } from '@/app/keyboard'
import { cn } from '@/design-system/classNames'
import { ЗНАЧОК } from '@/design-system/iconSize'
import { useИнтерфейс } from '@/app/providers/ui'

export function Sidebar({ наПереход }: { наПереход?: () => void }) {
  const { pathname } = useLocation()
  const текущий = доменПоАдресу(pathname)

  return (
    <div className="flex h-full flex-col bg-card">
      <div className="flex items-center gap-2.5 px-5 pt-5 pb-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-3 bg-accent text-on-accent">
          <Brain size={ЗНАЧОК.крупный} />
        </span>
        <span className="min-w-0">
          <span className="block text-body leading-tight font-semibold text-ink">
            Второй мозг
          </span>
          <span className="block text-caption text-ink-3">личная система</span>
        </span>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
        <ul className="space-y-1">
          {ДОМЕНЫ.map((домен) => {
            // Домен подсвечен, когда открыт любой из его разделов, а не только
            // его собственная страница: иначе «Деньги» гаснут на «Обязательствах».
            const открыт = текущий?.путь === домен.путь
            return (
              <li key={домен.путь}>
                <NavLink
                  to={домен.путь}
                  end={домен.путь === '/'}
                  onClick={наПереход}
                  className={cn(
                    'group flex min-h-11 items-center gap-3 rounded-3 px-3 py-2.5 text-body',
                    'transition-colors duration-150',
                    открыт
                      ? 'bg-accent-soft font-semibold text-accent'
                      : 'text-ink-2 hover:bg-hover hover:text-ink',
                  )}
                >
                  <домен.иконка
                    size={ЗНАЧОК.крупный}
                    strokeWidth={1.75}
                    className="shrink-0"
                  />
                  <span className="min-w-0 flex-1 truncate">{домен.название}</span>
                </NavLink>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="border-t border-line px-4 py-3">
        <button
          type="button"
          onClick={() => useИнтерфейс.getState().открытьКомандноеОкно(true)}
          className="flex w-full items-center justify-between rounded-2 border border-line px-2.5 py-1.5 text-left text-meta text-ink-3 transition-colors hover:border-line-strong hover:text-ink-2"
        >
          <span>Поиск и команды</span>
          <kbd className="rounded border border-line bg-sunken px-1.5 py-0.5 text-micro">
            {модификатор()} K
          </kbd>
        </button>
      </div>
    </div>
  )
}
