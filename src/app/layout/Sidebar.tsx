import { NavLink, useLocation } from 'react-router-dom'
import { Brain, Search } from 'lucide-react'
import { ДОМЕНЫ, доменПоАдресу } from '@/app/navigation'
import { модификатор } from '@/app/keyboard'
import { cn } from '@/design-system/classNames'
import { ЗНАЧОК } from '@/design-system/iconSize'
import { useИнтерфейс } from '@/app/providers/ui'
import { Icon } from '@/design-system/components'

export function Sidebar({ наПереход }: { наПереход?: () => void }) {
  const { pathname } = useLocation()
  const текущий = доменПоАдресу(pathname)

  return (
    <div className="flex h-full flex-col bg-card">
      <div className="flex items-center gap-3 px-5 pt-6 pb-5">
        <span className="flex h-11 w-11 items-center justify-center rounded-3 bg-accent text-on-accent shadow-1">
          <Brain size={ЗНАЧОК.крупный} />
        </span>
        <span className="min-w-0">
          <span className="block text-body leading-tight font-semibold text-ink">
            Второй мозг
          </span>
          <span className="mt-0.5 block text-caption text-ink-3">
            личная система
          </span>
        </span>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
        <p className="px-3 pb-2 text-micro font-semibold tracking-[0.12em] text-ink-3 uppercase">
          Навигация
        </p>
        <ul className="space-y-1.5">
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
                    'group flex min-h-12 items-center gap-3 rounded-3 px-3 py-2.5 text-body',
                    'transition-[background-color,color,box-shadow] duration-150',
                    открыт
                      ? 'bg-accent-soft font-semibold text-accent shadow-[inset_0_0_0_1px_var(--accent-line)]'
                      : 'text-ink-2 hover:bg-hover hover:text-ink',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-2 transition-colors',
                      открыт ? 'bg-card' : 'bg-sunken group-hover:bg-card',
                    )}
                  >
                    <Icon
                      значок={домен.иконка}
                      смысл={домен.смысл}
                      размер={ЗНАЧОК.строка}
                    />
                  </span>
                  <span className="min-w-0 flex-1 truncate">{домен.название}</span>
                </NavLink>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="border-t border-line px-4 py-4">
        <button
          type="button"
          onClick={() => useИнтерфейс.getState().открытьКомандноеОкно(true)}
          className="flex min-h-11 w-full items-center gap-2 rounded-3 border border-line bg-bg px-3 text-left text-meta text-ink-3 transition-colors hover:border-line-strong hover:bg-hover hover:text-ink-2"
        >
          <Search size={ЗНАЧОК.строка} />
          <span className="min-w-0 flex-1 truncate">Поиск и команды</span>
          <kbd className="rounded border border-line bg-card px-1.5 py-0.5 text-micro">
            {модификатор()} K
          </kbd>
        </button>
      </div>
    </div>
  )
}
