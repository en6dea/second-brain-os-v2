import { Link } from 'react-router-dom'
import { Activity, ArrowUpRight } from 'lucide-react'
import type { РефлексияЦели, Цель } from '@/core/db/types'
import { число } from '@/core/language/Numerals'
import { склонение } from '@/core/language/Plural'
import { Badge, Button } from '@/design-system/components'
import { ЗНАЧОК } from '@/design-system/iconSize'
import { динамикаЦели, рефлексияЦелиЗаПериод } from './model/Reflection'

const ПОДПИСЬ_ПУЛЬСА: Record<РефлексияЦели['пульс'], string> = {
  движется: 'движется',
  застряла: 'застряла',
  пересмотреть: 'пересмотреть',
}

export function GoalPulseCard({
  цель,
  период,
  наРефлексию,
  наПодготовкуЗадачи,
}: {
  цель: Цель
  период: string
  наРефлексию: (цель: Цель) => void
  наПодготовкуЗадачи: (цель: Цель, рефлексия: РефлексияЦели) => void
}) {
  const недельнаяРефлексия = рефлексияЦелиЗаПериод(цель, период)
  const динамика = динамикаЦели(цель)

  return (
    <div className="rounded-3 border border-accent-line bg-accent-soft/45 px-3 py-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2.5">
          <Activity size={ЗНАЧОК.строка} className="mt-0.5 shrink-0 text-accent" />
          <div className="min-w-0">
            <p className="text-micro font-semibold tracking-[0.12em] text-ink-3 uppercase">
              Пульс недели
            </p>
            {недельнаяРефлексия ? (
              <p className="mt-1 text-caption text-ink-2">
                Вы выбрали: {ПОДПИСЬ_ПУЛЬСА[недельнаяРефлексия.пульс]}
              </p>
            ) : (
              <p className="mt-1 text-caption text-ink-3">
                3 минуты: факт, препятствие и одно решение.
              </p>
            )}
          </div>
        </div>
        <Badge
          тон={
            недельнаяРефлексия?.пульс === 'движется'
              ? 'успех'
              : недельнаяРефлексия?.пульс === 'застряла'
                ? 'внимание'
                : 'нейтральный'
          }
        >
          {недельнаяРефлексия ? 'зафиксирован' : 'не заполнен'}
        </Badge>
      </div>

      {динамика ? (
        <p className="mt-2 text-caption text-ink-3">
          История: {цель.историяПрогресса?.length ?? 0}{' '}
          {склонение(
            цель.историяПрогресса?.length ?? 0,
            'замер',
            'замера',
            'замеров',
          )}
          {динамика.изменение === null
            ? ` · точка отсчёта ${число(динамика.последнее)} ${цель.единица}`
            : ` · ${динамика.изменение > 0 ? '+' : ''}${число(динамика.изменение)} ${цель.единица} с прошлого замера`}
        </p>
      ) : null}

      {недельнаяРефлексия?.следующийШаг ? (
        <div className="mt-3 border-t border-accent-line pt-3">
          <p className="text-caption text-ink-3">Решение недели</p>
          <p className="mt-0.5 text-meta font-medium text-ink">
            {недельнаяРефлексия.следующийШаг}
          </p>
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        <Button вид="контур" размер="малый" onClick={() => наРефлексию(цель)}>
          {недельнаяРефлексия ? 'Обновить неделю' : 'Разобрать неделю'}
        </Button>
        {недельнаяРефлексия?.следующийШаг && !недельнаяРефлексия.задачаId ? (
          <Button
            вид="тихая"
            размер="малый"
            иконка={<ArrowUpRight size={ЗНАЧОК.подпись} />}
            onClick={() => наПодготовкуЗадачи(цель, недельнаяРефлексия)}
          >
            Подготовить задачу
          </Button>
        ) : недельнаяРефлексия?.задачаId ? (
          <Link
            to="/tasks"
            className="inline-flex h-11 items-center rounded-2 px-3 text-meta font-medium text-good hover:bg-good-soft"
          >
            Задача создана
          </Link>
        ) : null}
      </div>
    </div>
  )
}
