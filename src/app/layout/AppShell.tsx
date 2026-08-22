import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { NavLink, Outlet, useLocation, useMatches } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { DomainNav } from './DomainNav'
import { useНапоминания } from './useReminders'
import { useСинхронизацию } from './useSync'
import { ДОМЕНЫ } from '@/app/navigation'
import { CommandMenu } from './CommandMenu'
import { QuickAdd } from './QuickAdd'
import { UpdateBanner } from './UpdateBanner'
import { useИнтерфейс } from '@/app/providers/ui'
import { подготовитьПервыйЗапуск, читатьПрофиль } from '@/core/db/repo'
import { запроситьПостоянноеХранение } from '@/core/db/Persistence'
import { cn } from '@/design-system/classNames'
import { Icon, IconButton } from '@/design-system/components'
import { useПрисутствие } from '@/design-system/motion/Presence'

/**
 * Нижнее меню телефона.
 *
 * Те же домены, что в боковом, но без «Системы»: настройки с телефона
 * открывают редко, а шестая колонка сделала бы подписи нечитаемыми.
 */
const МЕНЮ_ТЕЛЕФОНА = ДОМЕНЫ.filter((домен) => домен.путь !== '/settings')

export function AppShell() {
  useНапоминания()
  useСинхронизацию()
  const менюОткрыто = useИнтерфейс((с) => с.менюНаТелефоне)
  const открытьМеню = useИнтерфейс((с) => с.открытьМеню)
  const уведомление = useИнтерфейс((с) => с.уведомление)
  const {
    смонтировано: уведомлениеПоказано,
    закрывается: уведомлениеУходит,
    наОкончание: наОкончаниеУведомления,
  } = useПрисутствие(уведомление !== null)
  const [текстУведомления, установитьТекстУведомления] = useState<string | null>(
    null,
  )
  useEffect(() => {
    if (уведомление !== null) установитьТекстУведомления(уведомление)
  }, [уведомление])
  const открытьКомандноеОкно = useИнтерфейс((с) => с.открытьКомандноеОкно)

  const расположение = useLocation()

  /**
   * Ключ для перезапуска входной анимации раздела.
   *
   * Раньше им был `pathname` целиком. Из-за этого переход внутри одного и
   * того же маршрута с разными параметрами — «/quick/расход;350;кофе» →
   * «/quick» после записи — читался React Router как переход на другую
   * страницу: весь раздел размонтировался, и состояние (например, карточка
   * подтверждения в быстром вводе) исчезало раньше, чем человек успевал её
   * увидеть. `id` совпавшего маршрута привязан к определению маршрута, а не
   * к конкретному адресу, и не меняется при смене одних лишь параметров.
   */
  const совпадения = useMatches()
  const ключРаздела = совпадения.at(-1)?.id ?? расположение.pathname

  // Подготовка первого запуска пишет в базу, поэтому выполняется отдельно:
  // внутри живого запроса запись запрещена.
  useEffect(() => {
    void подготовитьПервыйЗапуск()
    // Без этого браузер вправе вытеснить хранилище при нехватке места,
    // и данные исчезнут без предупреждения.
    void запроситьПостоянноеХранение()
  }, [])

  const профиль = useLiveQuery(() => читатьПрофиль(), [])

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
    <div className="flex h-full bg-bg">
      {/* Настольное меню */}
      <aside className="hidden w-[272px] shrink-0 border-r border-line bg-card lg:block">
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

      <div className="flex min-w-0 flex-1 flex-col bg-bg">
        <Topbar имя={профиль?.имя ?? ''} />
        <main className="min-h-0 flex-1 overflow-y-auto px-3 pt-4 pb-24 sm:px-6 lg:px-8 lg:pt-6 lg:pb-10">
          <div className="mx-auto w-full max-w-[1320px]">
            <DomainNav />
            <div key={ключРаздела} className="вход-раздела">
              <Outlet />
            </div>
          </div>
        </main>
      </div>

      {/* Нижнее меню телефона — самостоятельное, а не уменьшенное настольное */}
      <nav className="fixed right-0 bottom-0 left-0 z-30 grid grid-cols-5 border-t border-line bg-card/95 px-1 pb-[env(safe-area-inset-bottom)] shadow-2 backdrop-blur-md lg:hidden">
        {МЕНЮ_ТЕЛЕФОНА.map((пункт) => (
          <NavLink
            key={пункт.путь}
            to={пункт.путь}
            end={пункт.путь === '/'}
            className={({ isActive }) =>
              cn(
                'mx-0.5 my-1 flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-3 py-2 text-micro transition-colors',
                isActive
                  ? 'bg-accent-soft font-semibold text-accent'
                  : 'text-ink-3',
              )
            }
          >
            <Icon значок={пункт.иконка} смысл={пункт.смысл} />
            <span>{пункт.название}</span>
          </NavLink>
        ))}
      </nav>

      <CommandMenu />
      <QuickAdd />
      <UpdateBanner />

      {уведомлениеПоказано ? (
        <div
          role="status"
          onAnimationEnd={наОкончаниеУведомления}
          className={cn(
            'fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-3 border border-line bg-over px-4 py-2.5 text-meta text-ink shadow-3 lg:bottom-6',
            уведомлениеУходит ? 'anim-pop-уход' : 'anim-pop',
          )}
        >
          {текстУведомления}
        </div>
      ) : null}
    </div>
  )
}
