import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowRight, CheckCircle2, Eye, Info } from 'lucide-react'
import type { Сигнал, УровеньСигнала } from '@/core/db/types'
import { cn } from '@/design-system/classNames'
import { ЗНАЧОК } from '@/design-system/iconSize'

const ИКОНКА: Record<УровеньСигнала, typeof Info> = {
  критично: AlertTriangle,
  внимание: Eye,
  наблюдение: Info,
  хорошо: CheckCircle2,
}

const ТОН: Record<УровеньСигнала, string> = {
  критично: 'text-bad',
  внимание: 'text-warn',
  наблюдение: 'text-info',
  хорошо: 'text-good',
}

const ПОКАЗАТЬ = 3

/**
 * Компактная полоска сигналов — для страниц без своей карточки «Сейчас».
 *
 * Полная карточка сигнала живёт на Главной (`SignalRow` в
 * `DashboardPage.tsx`, крупнее, с объяснением). Здесь только узнаваемость:
 * та же иконка и цвет, одна строка вместо абзаца, и ссылка на Главную за
 * остальным — полоска не должна разрастаться на весь экран.
 */
export function SignalsStrip({ сигналы }: { сигналы: Сигнал[] }) {
  if (сигналы.length === 0) return null

  const видимые = сигналы.slice(0, ПОКАЗАТЬ)
  const остаток = сигналы.length - видимые.length

  return (
    <div className="divide-y divide-line overflow-hidden rounded-3 border border-line bg-card">
      {видимые.map((сигнал) => (
        <СтрокаСигнала key={сигнал.id} сигнал={сигнал} />
      ))}
      {остаток > 0 ? (
        <Link
          to="/"
          className="flex items-center justify-between px-4 py-2.5 text-caption text-accent hover:underline"
        >
          <span>ещё {остаток}</span>
          <ArrowRight size={ЗНАЧОК.подпись} />
        </Link>
      ) : null}
    </div>
  )
}

function СтрокаСигнала({ сигнал }: { сигнал: Сигнал }) {
  const Иконка = ИКОНКА[сигнал.уровень]
  const содержимое = (
    <div className="flex items-center gap-2.5 px-4 py-2.5">
      <Иконка
        size={ЗНАЧОК.подпись}
        className={cn('shrink-0', ТОН[сигнал.уровень])}
      />
      <p className="min-w-0 flex-1 truncate text-meta text-ink">{сигнал.текст}</p>
    </div>
  )

  return сигнал.ссылка ? (
    <Link to={сигнал.ссылка} className="block transition-colors hover:bg-hover">
      {содержимое}
    </Link>
  ) : (
    содержимое
  )
}
