import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { CornerDownLeft, Search } from 'lucide-react'
import { useИнтерфейс } from '@/app/providers/ui'
import { ВСЕ_РАЗДЕЛЫ } from '@/app/navigation'
import { искать, type НайденноеСовпадение } from '@/core/search/search'
import { cn } from '@/design-system/classNames'

interface Строка {
  ключ: string
  группа: string
  заголовок: string
  подпись: string
  действие: () => void
}

export function CommandMenu() {
  const открыто = useИнтерфейс((с) => с.командноеОкно)
  const открыть = useИнтерфейс((с) => с.открытьКомандноеОкно)
  const открытьБыстроеДобавление = useИнтерфейс((с) => с.открытьБыстроеДобавление)
  const перейти = useNavigate()

  const [запрос, установитьЗапрос] = useState('')
  const [совпадения, установитьСовпадения] = useState<НайденноеСовпадение[]>([])
  const [выбран, установитьВыбран] = useState(0)
  const полеВвода = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (открыто) {
      установитьЗапрос('')
      установитьСовпадения([])
      установитьВыбран(0)
      setTimeout(() => полеВвода.current?.focus(), 30)
    }
  }, [открыто])

  useEffect(() => {
    let отменено = false
    if (запрос.trim().length < 2) {
      установитьСовпадения([])
      return
    }
    искать(запрос).then((найдено) => {
      if (!отменено) установитьСовпадения(найдено)
    })
    return () => {
      отменено = true
    }
  }, [запрос])

  const строки = useMemo<Строка[]>(() => {
    const запросНиз = запрос.trim().toLowerCase()

    const разделы: Строка[] = ВСЕ_РАЗДЕЛЫ
      .filter((пункт) =>
        запросНиз ? пункт.название.toLowerCase().includes(запросНиз) : true,
      )
      .map((пункт) => ({
        ключ: `раздел-${пункт.путь}`,
        группа: 'Разделы',
        заголовок: пункт.название,
        подпись: 'перейти',
        действие: () => {
          перейти(пункт.путь)
          открыть(false)
        },
      }))

    const действия: Строка[] = [
      {
        ключ: 'действие-добавить',
        группа: 'Действия',
        заголовок: 'Быстро добавить запись',
        подпись: 'задача, расход, заметка, идея',
        действие: () => {
          открыть(false)
          открытьБыстроеДобавление(true)
        },
      },
      {
        ключ: 'действие-операция',
        группа: 'Действия',
        заголовок: 'Записать операцию',
        подпись: 'доход, расход или перевод',
        действие: () => {
          перейти('/finance/operations?создать=1')
          открыть(false)
        },
      },
    ].filter((строка) =>
      запросНиз ? строка.заголовок.toLowerCase().includes(запросНиз) : true,
    )

    const записи: Строка[] = совпадения.map((совпадение) => ({
      ключ: `запись-${совпадение.id}`,
      группа: совпадение.раздел,
      заголовок: совпадение.заголовок,
      подпись: совпадение.подпись,
      действие: () => {
        перейти(совпадение.путь)
        открыть(false)
      },
    }))

    return [...записи, ...разделы, ...действия]
  }, [запрос, совпадения, перейти, открыть, открытьБыстроеДобавление])

  useEffect(() => {
    установитьВыбран(0)
  }, [строки.length])

  if (!открыто) return null

  const группы = строки.reduce<Record<string, Строка[]>>((итог, строка) => {
    ;(итог[строка.группа] ??= []).push(строка)
    return итог
  }, {})

  let индекс = -1

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center px-3 pt-[12vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Поиск и команды"
    >
      <button
        type="button"
        aria-label="Закрыть поиск"
        onClick={() => открыть(false)}
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
      />
      <div className="anim-pop relative flex max-h-[70vh] w-full max-w-xl flex-col overflow-hidden rounded-5 border border-line bg-over shadow-3">
        <div className="flex items-center gap-2.5 border-b border-line px-4 py-3">
          <Search size={17} className="shrink-0 text-ink-3" />
          <input
            ref={полеВвода}
            value={запрос}
            onChange={(событие) => установитьЗапрос(событие.target.value)}
            onKeyDown={(событие) => {
              if (событие.key === 'Escape') открыть(false)
              if (событие.key === 'ArrowDown') {
                событие.preventDefault()
                установитьВыбран((текущий) =>
                  Math.min(текущий + 1, строки.length - 1),
                )
              }
              if (событие.key === 'ArrowUp') {
                событие.preventDefault()
                установитьВыбран((текущий) => Math.max(текущий - 1, 0))
              }
              if (событие.key === 'Enter') {
                событие.preventDefault()
                строки[выбран]?.действие()
              }
            }}
            placeholder="Найти запись или перейти в раздел"
            className="w-full bg-transparent text-body text-ink outline-none placeholder:text-ink-3"
          />
          <kbd className="hidden rounded border border-line bg-sunken px-1.5 py-0.5 text-micro text-ink-3 sm:block">
            Esc
          </kbd>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto py-2">
          {строки.length === 0 ? (
            <p className="px-4 py-8 text-center text-meta text-ink-3">
              {запрос.trim().length < 2
                ? 'Введите хотя бы два символа'
                : 'Ничего не найдено'}
            </p>
          ) : (
            Object.entries(группы).map(([название, элементы]) => (
              <div key={название} className="mb-1">
                <p className="px-4 py-1 text-micro font-semibold tracking-[0.14em] text-ink-3 uppercase">
                  {название}
                </p>
                {элементы.map((строка) => {
                  индекс += 1
                  const текущий = индекс
                  return (
                    <button
                      key={строка.ключ}
                      type="button"
                      onMouseEnter={() => установитьВыбран(текущий)}
                      onClick={строка.действие}
                      className={cn(
                        'flex w-full items-center justify-between gap-3 px-4 py-2 text-left',
                        выбран === текущий ? 'bg-accent-soft' : 'hover:bg-hover',
                      )}
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-meta text-ink">
                          {строка.заголовок}
                        </span>
                        <span className="block truncate text-caption text-ink-3">
                          {строка.подпись}
                        </span>
                      </span>
                      {выбран === текущий ? (
                        <CornerDownLeft size={14} className="shrink-0 text-ink-3" />
                      ) : null}
                    </button>
                  )
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
