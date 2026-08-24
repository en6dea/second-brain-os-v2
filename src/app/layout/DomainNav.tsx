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
      className="domain-nav scrollbar-none mb-6"
    >
      {домен.разделы.map((раздел) => (
        <NavLink
          key={раздел.путь}
          to={раздел.путь}
          end={раздел.путь === '/' || раздел.путь === '/finance'}
          className={({ isActive }) =>
            cn(
              'domain-tab group inline-flex shrink-0 items-center gap-2 px-0 text-meta',
              isActive ? 'font-medium text-ink' : 'text-ink-3',
            )
          }
        >
          <Icon
            значок={раздел.иконка}
            смысл={смыслРаздела(раздел.путь)}
            размер={ЗНАЧОК.строка}
            монохромный
          />
          {раздел.название}
        </NavLink>
      ))}
    </nav>
  )
}
