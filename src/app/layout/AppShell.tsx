import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { NavLink, Outlet, useLocation, useMatches } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { DomainNav } from './DomainNav'
import { useНапоминания } from './useReminders'
import { useСинхронизацию } from './useSync'
import { useTelegramBridge } from './useTelegramBridge'
import { ДОМЕНЫ } from '@/app/navigation'
import { CommandMenu } from './CommandMenu'
import { QuickAdd } from './QuickAdd'
import { UpdateBanner } from './UpdateBanner'
import { useИнтерфейс } from '@/app/providers/ui'
import {
  подготовитьПервыйЗапуск,
  читатьНастройки,
  читатьПрофиль,
} from '@/core/db/repo'
import { запроситьПостоянноеХранение } from '@/core/db/Persistence'
import { cn } from '@/design-system/classNames'
import { Icon, IconButton } from '@/design-system/components'
import { useПрисутствие } from '@/design-system/motion/Presence'
import { useТему } from './useTheme'
import {
  естьАктивныйМодальныйСлой,
  useModalFocus,
} from '@/design-system/a11y/useModalFocus'

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
  useTelegramBridge()
  const менюОткрыто = useИнтерфейс((с) => с.менюНаТелефоне)
  const открытьМеню = useИнтерфейс((с) => с.открытьМеню)
  const панельМеню = useRef<HTMLDivElement>(null)
  const {
    смонтировано: менюПоказано,
    закрывается: менюЗакрывается,
    наОкончание: наОкончаниеМеню,
  } = useПрисутствие(менюОткрыто)
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

  useModalFocus({
    активно: менюПоказано,
    контейнер: панельМеню,
    наEscape: () => открытьМеню(false),
  })

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

  const представление = useLiveQuery(async () => {
    const [профиль, настройки] = await Promise.all([
      читатьПрофиль(),
      читатьНастройки(),
    ])
    return { профиль, настройки }
  }, [])
  useТему(представление?.настройки.тема ?? 'system')

  useEffect(() => {
    const наКлавишу = (событие: KeyboardEvent) => {
      if (
        (событие.ctrlKey || событие.metaKey) &&
        событие.key.toLowerCase() === 'k'
      ) {
        событие.preventDefault()
        if (естьАктивныйМодальныйСлой()) return
        открытьКомандноеОкно(true)
      }
    }
    window.addEventListener('keydown', наКлавишу)
    return () => window.removeEventListener('keydown', наКлавишу)
  }, [открытьКомандноеОкно])

  return (
    <div className="app-shell flex h-full">
      {/* Настольное меню */}
      <aside className="app-rail hidden w-[252px] shrink-0 lg:block">
        <Sidebar />
      </aside>

      {/* Меню на телефоне */}
      {менюПоказано ? (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Навигация"
        >
          <button
            type="button"
            aria-label="Закрыть меню"
            onClick={() => открытьМеню(false)}
            className={cn(
              'absolute inset-0 bg-black/70',
              менюЗакрывается ? 'anim-затемнение-наружу' : 'anim-затемнение-внутрь',
            )}
          />
          <div
            ref={панельМеню}
            tabIndex={-1}
            onAnimationEnd={(событие) => {
              if (событие.target === событие.currentTarget) наОкончаниеМеню()
            }}
            className={cn(
              'drawer-panel relative h-full w-[276px] border-r border-line shadow-3 outline-none',
              менюЗакрывается && 'drawer-panel-exit',
            )}
          >
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

      <div className="flex min-w-0 flex-1 flex-col bg-transparent">
        <Topbar имя={представление?.профиль.имя ?? ''} />
        <main className="min-h-0 flex-1 overflow-y-auto px-4 pt-5 pb-24 sm:px-6 lg:px-8 lg:pt-7 lg:pb-12">
          <div className="mx-auto w-full max-w-[1380px]">
            <DomainNav />
            <div key={ключРаздела} className="вход-раздела">
              <Outlet />
            </div>
          </div>
        </main>
      </div>

      {/* Нижнее меню телефона — самостоятельное, а не уменьшенное настольное */}
      <nav className="mobile-nav fixed right-0 bottom-0 left-0 z-30 grid grid-cols-5 rounded-t-4 px-1 pb-[env(safe-area-inset-bottom)] lg:hidden">
        {МЕНЮ_ТЕЛЕФОНА.map((пункт) => (
          <NavLink
            key={пункт.путь}
            to={пункт.путь}
            end={пункт.путь === '/'}
            className={({ isActive }) =>
              cn(
                'mobile-nav-link mx-0.5 my-1 flex min-h-14 flex-col items-center justify-center gap-0.5 py-2 text-micro',
                isActive ? 'font-medium text-ink' : 'text-ink-3',
              )
            }
          >
            <Icon значок={пункт.иконка} смысл={пункт.смысл} монохромный />
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
          onAnimationEnd={(событие) => {
            if (событие.target === событие.currentTarget) наОкончаниеУведомления()
          }}
          className={cn(
            'premium-card fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-2 px-4 py-2.5 text-meta text-ink shadow-3 lg:bottom-6',
            уведомлениеУходит ? 'anim-pop-уход' : 'anim-pop',
          )}
        >
          {текстУведомления}
        </div>
      ) : null}
    </div>
  )
}
