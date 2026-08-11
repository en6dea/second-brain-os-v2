import { Menu, Moon, Plus, Search, Sun, SunMoon } from 'lucide-react'
import { Button, IconButton } from '@/design-system/components'
import { использоватьИнтерфейс } from '@/app/providers/ui'
import { использоватьТему, type РежимТемы } from '@/app/providers/theme'
import { приветствие } from '@/core/calendar/CalendarRu'

const следующаяТема: Record<РежимТемы, РежимТемы> = {
  light: 'dark',
  dark: 'system',
  system: 'light',
}

const подписьТемы: Record<РежимТемы, string> = {
  light: 'Тема: светлая. Нажмите, чтобы включить тёмную',
  dark: 'Тема: тёмная. Нажмите, чтобы следовать системе',
  system: 'Тема: как в системе. Нажмите, чтобы включить светлую',
}

export function Topbar({ имя }: { имя: string }) {
  const { режим, установить } = использоватьТему()
  const открытьМеню = использоватьИнтерфейс((с) => с.открытьМеню)
  const открытьКомандноеОкно = использоватьИнтерфейс((с) => с.открытьКомандноеОкно)
  const открытьБыстроеДобавление = использоватьИнтерфейс(
    (с) => с.открытьБыстроеДобавление,
  )

  const Иконка = режим === 'light' ? Sun : режим === 'dark' ? Moon : SunMoon

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-line bg-bg/85 px-3 backdrop-blur-md sm:px-5">
      <IconButton
        подпись="Открыть меню"
        className="lg:hidden"
        onClick={() => открытьМеню(true)}
      >
        <Menu size={18} />
      </IconButton>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-medium text-ink">
          {приветствие()}
          {имя ? `, ${имя}` : ''}
        </p>
      </div>

      <button
        type="button"
        onClick={() => открытьКомандноеОкно(true)}
        className="hidden items-center gap-2 rounded-2 border border-line bg-card px-3 py-1.5 text-[13px] text-ink-3 transition-colors hover:border-line-strong hover:text-ink-2 md:flex"
      >
        <Search size={14} />
        <span>Найти или выполнить</span>
        <kbd className="ml-4 rounded border border-line bg-sunken px-1.5 py-0.5 text-[10px]">
          Ctrl K
        </kbd>
      </button>

      <IconButton
        подпись="Поиск и команды"
        className="md:hidden"
        onClick={() => открытьКомандноеОкно(true)}
      >
        <Search size={18} />
      </IconButton>

      <IconButton
        подпись={подписьТемы[режим]}
        onClick={() => установить(следующаяТема[режим])}
      >
        <Иконка size={18} />
      </IconButton>

      <Button
        вид="основная"
        размер="малый"
        иконка={<Plus size={16} />}
        onClick={() => открытьБыстроеДобавление(true)}
      >
        <span className="hidden sm:inline">Добавить</span>
      </Button>
    </header>
  )
}
