import { Menu, Plus, Search } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { Button, IconButton } from '@/design-system/components'
import { ЗНАЧОК } from '@/design-system/iconSize'
import { модификатор } from '@/app/keyboard'
import { доменПоАдресу } from '@/app/navigation'
import { useИнтерфейс } from '@/app/providers/ui'
import {
  деньКратко,
  деньНедели,
  приветствие,
  сегодня,
} from '@/core/calendar/CalendarRu'

export function Topbar({ имя }: { имя: string }) {
  const { pathname } = useLocation()
  const домен = доменПоАдресу(pathname)
  const открытьМеню = useИнтерфейс((с) => с.открытьМеню)
  const открытьКомандноеОкно = useИнтерфейс((с) => с.открытьКомандноеОкно)
  const открытьБыстроеДобавление = useИнтерфейс((с) => с.открытьБыстроеДобавление)

  return (
    <header className="topbar-shell sticky top-2 z-30 flex min-h-16 items-center gap-2 px-3 sm:px-5 lg:min-h-[68px] lg:px-6">
      <IconButton
        подпись="Открыть меню"
        className="lg:hidden"
        onClick={() => открытьМеню(true)}
      >
        <Menu size={ЗНАЧОК.крупный} />
      </IconButton>

      <div className="min-w-0 flex-1">
        <p className="truncate text-body font-medium text-ink">
          {приветствие()}
          {имя ? `, ${имя}` : ''}
        </p>
        <p className="hidden truncate text-caption text-ink-3 sm:block">
          {домен?.название ?? 'Личная система'} · {деньНедели(сегодня())},{' '}
          {деньКратко(сегодня())}
        </p>
      </div>

      <button
        type="button"
        onClick={() => открытьКомандноеОкно(true)}
        className="command-trigger hidden min-h-11 min-w-[244px] items-center gap-2 rounded-2 px-3 text-meta md:flex"
      >
        <Search size={ЗНАЧОК.строка} />
        <span>Найти или выполнить</span>
        <kbd className="ml-auto rounded-1 border border-line bg-sunken px-1.5 py-0.5 text-micro">
          {модификатор()} K
        </kbd>
      </button>

      <IconButton
        подпись="Поиск и команды"
        className="md:hidden"
        onClick={() => открытьКомандноеОкно(true)}
      >
        <Search size={ЗНАЧОК.крупный} />
      </IconButton>

      <Button
        вид="основная"
        размер="малый"
        иконка={<Plus size={ЗНАЧОК.основной} />}
        onClick={() => открытьБыстроеДобавление(true)}
      >
        <span className="hidden sm:inline">Добавить</span>
      </Button>
    </header>
  )
}
