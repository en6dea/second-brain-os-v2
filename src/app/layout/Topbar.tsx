import { Menu, Plus, Search } from 'lucide-react'
import { Button, IconButton } from '@/design-system/components'
import { ЗНАЧОК } from '@/design-system/iconSize'
import { модификатор } from '@/app/keyboard'
import { useИнтерфейс } from '@/app/providers/ui'
import { приветствие } from '@/core/calendar/CalendarRu'

export function Topbar({ имя }: { имя: string }) {
  const открытьМеню = useИнтерфейс((с) => с.открытьМеню)
  const открытьКомандноеОкно = useИнтерфейс((с) => с.открытьКомандноеОкно)
  const открытьБыстроеДобавление = useИнтерфейс((с) => с.открытьБыстроеДобавление)

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-line bg-bg/85 px-3 backdrop-blur-md sm:px-5">
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
      </div>

      <button
        type="button"
        onClick={() => открытьКомандноеОкно(true)}
        className="hidden items-center gap-2 rounded-2 border border-line bg-card px-3 py-1.5 text-meta text-ink-3 transition-colors hover:border-line-strong hover:text-ink-2 md:flex"
      >
        <Search size={ЗНАЧОК.строка} />
        <span>Найти или выполнить</span>
        <kbd className="ml-4 rounded border border-line bg-sunken px-1.5 py-0.5 text-micro">
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
