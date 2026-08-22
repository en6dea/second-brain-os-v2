import { NavLink, useLocation } from 'react-router-dom'
import { доменПоАдресу } from '@/app/navigation'
import { cn } from '@/design-system/classNames'
import { ЗНАЧОК } from '@/design-system/iconSize'
import { Icon, смыслРаздела } from '@/design-system/components'

/**
 * Второй уровень навигации.
 *
 * Боковое меню держит шесть доменов, а разделы внутри домена открываются
 * этой полосой. Так человек видит и где он находится, и что рядом, не
 * пролистывая список из двадцати двух пунктов.
 *
 * У домена с одним разделом полосы нет: показывать выбор из одного пункта
 * незачем.
 */
export function DomainNav() {
  const { pathname } = useLocation()
  const домен = доменПоАдресу(pathname)

  if (!домен || домен.разделы.length < 2) return null

  return (
    <nav
      aria-label={`Разделы: ${домен.название}`}
      className="scrollbar-none mb-5 flex gap-1 overflow-x-auto rounded-4 border border-line bg-card p-1.5 shadow-1"
    >
      {домен.разделы.map((раздел) => (
        <NavLink
          key={раздел.путь}
          to={раздел.путь}
          end={раздел.путь === '/' || раздел.путь === '/finance'}
          className={({ isActive }) =>
            cn(
              'group inline-flex min-h-11 shrink-0 items-center gap-2 rounded-3 px-3.5 text-meta',
              'transition-colors duration-150',
              isActive
                ? 'bg-accent font-semibold text-on-accent shadow-1'
                : 'text-ink-3 hover:bg-hover hover:text-ink-2',
            )
          }
        >
          <Icon
            значок={раздел.иконка}
            смысл={смыслРаздела(раздел.путь)}
            размер={ЗНАЧОК.строка}
            className="group-aria-[current=page]:text-on-accent"
          />
          {раздел.название}
        </NavLink>
      ))}
    </nav>
  )
}
