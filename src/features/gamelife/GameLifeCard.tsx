import { useState } from 'react'
import { Gauge, Info } from 'lucide-react'
import type { ПоказателиGameLife } from './model/Levels'
import { ВЕС } from './model/Levels'
import { склонение } from '@/core/language/Plural'
import { Card, IconButton } from '@/design-system/components'
import { ЗНАЧОК } from '@/design-system/iconSize'

/**
 * Честный GameLife: уровень и очки, посчитанные из реальных действий.
 *
 * «Как считается» разворачивает источники по каждому весу — без этого
 * число выглядело бы так же произвольно, как в прежнем ГеймЛайфе, который
 * не перенесли из первой версии именно за это.
 */
export function GameLifeCard({ показатели }: { показатели: ПоказателиGameLife }) {
  const [показатьИсточники, установить] = useState(false)

  return (
    <Card>
      <div className="flex items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2 border border-accent-line bg-transparent text-accent">
            <Gauge size={ЗНАЧОК.основной} strokeWidth={1.55} />
          </span>
          <div>
            <p className="text-meta font-medium text-ink">
              Уровень {показатели.уровень}
            </p>
            <p className="text-caption text-ink-3">
              {показатели.очков}{' '}
              {склонение(показатели.очков, 'очко', 'очка', 'очков')} · ещё{' '}
              {показатели.доСледующегоУровня} до следующего уровня
            </p>
          </div>
        </div>
        <IconButton
          подпись={показатьИсточники ? 'Скрыть источники' : 'Как считается'}
          onClick={() => установить((значение) => !значение)}
        >
          <Info size={ЗНАЧОК.строка} />
        </IconButton>
      </div>

      {показатьИсточники ? (
        <div className="space-y-1 border-t border-line px-4 py-3 text-caption text-ink-3">
          <p>
            Сделанная задача · {ВЕС.задача}{' '}
            {склонение(ВЕС.задача, 'очко', 'очка', 'очков')}:{' '}
            {показатели.источники.задачСделано}
          </p>
          <p>
            Отметка привычки · {ВЕС.привычка}{' '}
            {склонение(ВЕС.привычка, 'очко', 'очка', 'очков')}:{' '}
            {показатели.источники.привычекОтмечено}
          </p>
          <p>
            Достигнутая цель · {ВЕС.цель}{' '}
            {склонение(ВЕС.цель, 'очко', 'очка', 'очков')}:{' '}
            {показатели.источники.целейДостигнуто}
          </p>
          <p>
            Закрытый обзор · {ВЕС.обзор}{' '}
            {склонение(ВЕС.обзор, 'очко', 'очка', 'очков')}:{' '}
            {показатели.источники.обзоровЗакрыто}
          </p>
        </div>
      ) : null}
    </Card>
  )
}
