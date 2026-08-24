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
    <div className="sidebar-surface flex h-full flex-col">
      <div className="flex items-center gap-3 px-5 pt-6 pb-7">
        <span className="brand-mark">
          <Brain size={ЗНАЧОК.основной} />
        </span>
        <span className="min-w-0">
          <span className="block text-body leading-tight font-medium text-ink">
            Второй мозг
          </span>
          <span className="mt-1 block text-micro tracking-[0.12em] text-ink-3 uppercase">
            личная обсерватория
          </span>
        </span>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
        <p className="px-3 pb-3 text-micro font-medium tracking-[0.16em] text-ink-3 uppercase">
          Пространства
        </p>
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
                  data-active={открыт}
                  className={cn(
                    'side-nav-link group flex min-h-12 items-center gap-3 px-3 py-2.5 text-meta',
                    открыт ? 'font-medium' : undefined,
                  )}
                >
                  <span className="side-nav-icon flex h-8 w-8 shrink-0 items-center justify-center">
                    <Icon
                      значок={домен.иконка}
                      смысл={домен.смысл}
                      размер={ЗНАЧОК.строка}
                      монохромный
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
          className="command-trigger flex min-h-11 w-full items-center gap-2 rounded-2 px-3 text-left text-meta"
        >
          <Search size={ЗНАЧОК.строка} />
          <span className="min-w-0 flex-1 truncate">Поиск и команды</span>
          <kbd className="rounded-1 border border-line bg-sunken px-1.5 py-0.5 text-micro">
            {модификатор()} K
          </kbd>
        </button>
      </div>
    </div>
  )
}
