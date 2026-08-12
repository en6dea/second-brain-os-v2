import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ShieldCheck } from 'lucide-react'
import { база } from '@/core/db/db'
import { Card, Skeleton } from '@/design-system/components'
import { DayPanel } from './panels/DayPanel'
import { TogetherPanel } from './panels/TogetherPanel'
import { PlansPanel } from './panels/PlansPanel'

type Вкладка = 'дни' | 'вдвоём' | 'планы'

const ВКЛАДКИ: { ключ: Вкладка; подпись: string }[] = [
  { ключ: 'дни', подпись: 'Дни' },
  { ключ: 'вдвоём', подпись: 'Вдвоём' },
  { ключ: 'планы', подпись: 'Планы' },
]

/**
 * Отношения.
 *
 * Самый закрытый раздел приложения: записи о самочувствии другого человека
 * никуда не уходят с устройства. Это сказано прямо на странице, а не спрятано
 * в настройках.
 */
export function RelationshipPage() {
  const [вкладка, установитьВкладку] = useState<Вкладка>('дни')

  const данные = useLiveQuery(async () => {
    const [дни, дела, планы, люди, опыт] = await Promise.all([
      база.partnerDays.toArray(),
      база.coupleActivities.toArray(),
      база.couplePlans.toArray(),
      база.people.toArray(),
      база.experiences.toArray(),
    ])
    return { дни, дела, планы, люди, опыт }
  }, [])

  if (!данные) {
    return (
      <Card className="p-5">
        <Skeleton строк={6} />
      </Card>
    )
  }

  const человек =
    данные.люди.find((запись) =>
      данные.дни.some((день) => день.человекId === запись.id),
    ) ?? null
  const имяПартнёра = человек?.имя ?? ''

  return (
    <div className="anim-rise space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[20px] font-semibold text-ink">Отношения</h1>
          <p className="mt-0.5 flex items-center gap-1.5 text-[13px] text-ink-3">
            <ShieldCheck size={14} />
            Записи хранятся только на этом устройстве
          </p>
        </div>

        <div className="flex items-center gap-0.5 rounded-2 border border-line bg-sunken p-0.5">
          {ВКЛАДКИ.map((вариант) => (
            <button
              key={вариант.ключ}
              type="button"
              aria-pressed={вкладка === вариант.ключ}
              onClick={() => установитьВкладку(вариант.ключ)}
              className={
                вкладка === вариант.ключ
                  ? 'rounded-[10px] bg-card px-3.5 py-1.5 text-[13px] font-medium text-ink shadow-1'
                  : 'rounded-[10px] px-3.5 py-1.5 text-[13px] font-medium text-ink-3 transition-colors hover:text-ink-2'
              }
            >
              {вариант.подпись}
            </button>
          ))}
        </div>
      </div>

      {вкладка === 'дни' ? (
        <DayPanel дни={данные.дни} люди={данные.люди} />
      ) : вкладка === 'вдвоём' ? (
        <TogetherPanel
          дела={данные.дела}
          опыт={данные.опыт}
          имяПартнёра={имяПартнёра}
        />
      ) : (
        <PlansPanel планы={данные.планы} имяПартнёра={имяПартнёра} />
      )}
    </div>
  )
}
