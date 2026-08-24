import { ArrowRight, Check, CircleDot, X } from 'lucide-react'
import type { Цель } from '@/core/db/types'
import { разобратьПоSMART, самаяНеготовая } from './model/Smart'
import { cn } from '@/design-system/classNames'
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  ProgressBar,
} from '@/design-system/components'

/**
 * Разбор цели по SMART внутри окна правки.
 *
 * Показывается прямо во время заполнения и пересчитывается на каждое
 * изменение — чтобы было видно, что именно осталось дописать.
 */
export function SmartReview({ цель }: { цель: Цель }) {
  const разбор = разобратьПоSMART(цель)

  return (
    <div className="rounded-3 border border-line bg-sunken p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-meta font-medium text-ink">Разбор по SMART</p>
        <span className="tnum text-caption text-ink-3">
          {разбор.выполнено} из {разбор.всего}
        </span>
      </div>

      <div className="mt-2">
        <ProgressBar
          значение={разбор.выполнено}
          из={разбор.всего}
          тон={
            разбор.готова
              ? 'успех'
              : разбор.выполнено >= 3
                ? 'внимание'
                : 'опасность'
          }
        />
      </div>

      <ul className="mt-3 space-y-2">
        {разбор.критерии.map((критерий) => (
          <li key={критерий.ключ} className="flex items-start gap-2.5">
            <span
              className={cn(
                'mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full',
                критерий.выполнен ? 'bg-good text-on-good' : 'bg-bad-soft text-bad',
              )}
            >
              {критерий.выполнен ? <Check size={11} /> : <X size={11} />}
            </span>
            <span className="min-w-0">
              <span
                className={cn(
                  'text-caption font-medium',
                  критерий.выполнен ? 'text-ink-2' : 'text-ink',
                )}
              >
                {критерий.название}
              </span>
              <span className="block text-caption leading-relaxed text-ink-3">
                {критерий.замечание}
              </span>
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex items-start gap-2 border-t border-line pt-3">
        <ArrowRight size={14} className="mt-0.5 shrink-0 text-accent" />
        <p className="text-caption leading-relaxed text-ink-2">
          <span className="font-medium text-ink">Следующий шаг: </span>
          {разбор.следующийШаг}
        </p>
      </div>
    </div>
  )
}

/**
 * С чего начать.
 *
 * Одна цель и одно действие. Когда на экране двенадцать целей, откладывается
 * всё сразу — поэтому здесь всегда ровно один пункт, выбранный по тому, у
 * какой цели меньше всего заполнено.
 */
export function WhereToStart({
  цели,
  наПравку,
}: {
  цели: Цель[]
  наПравку: (цель: Цель) => void
}) {
  const слабая = самаяНеготовая(цели)
  if (!слабая) return null

  return (
    <Card>
      <CardHeader
        заголовок="С чего начать"
        подпись="Цель, которой не хватает описания больше остальных"
        действие={
          <Button вид="контур" размер="малый" onClick={() => наПравку(слабая.цель)}>
            Открыть цель
          </Button>
        }
      />
      <CardBody className="space-y-2.5">
        <p className="flex items-center gap-2 text-meta font-medium text-ink">
          <CircleDot size={15} className="shrink-0 text-accent" />
          {слабая.цель.название}
        </p>
        <p className="text-meta leading-relaxed text-ink-2">
          Заполнено {слабая.разбор.выполнено} из {слабая.разбор.всего} критериев.{' '}
          {слабая.разбор.следующийШаг}
        </p>
        <p className="text-caption text-ink-3">
          Откладывание чаще означает нерешённость, а не лень: пока цель звучит как
          намерение, браться не за что.
        </p>
      </CardBody>
    </Card>
  )
}
