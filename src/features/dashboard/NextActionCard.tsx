import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Info, Sparkles } from 'lucide-react'
import type { СледующееДействие } from '@/core/day/NextAction'
import { склонение } from '@/core/language/Plural'
import { Button, Card, CardBody } from '@/design-system/components'

/**
 * Что сделать сейчас.
 *
 * Одно действие вместо списка. Рядом кнопка «Почему это»: человек должен
 * видеть, из каких его записей выведено предложение, иначе рекомендация
 * ничем не отличается от гадания.
 *
 * Когда оснований нет, карточка не появляется вовсе. Придумать занятие,
 * чтобы экран не пустовал, — худшее, что здесь можно сделать.
 */
export function NextActionCard({ действие }: { действие: СледующееДействие }) {
  const [почему, показатьПочему] = useState(false)

  return (
    <Card className="overflow-hidden">
      <div className="grid gap-0 lg:grid-cols-[1.5fr_1fr]">
        <CardBody className="flex flex-col justify-center gap-4 p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
              <Sparkles size={22} strokeWidth={1.75} />
            </span>
            <p className="text-meta font-semibold text-accent">Сейчас лучше всего</p>
          </div>

          <div>
            <h2 className="text-h2 leading-tight font-semibold text-ink">
              {действие.заголовок}
            </h2>
            <p className="mt-2 text-body leading-relaxed text-ink-2">
              {действие.зачем}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link to={действие.раздел}>
              <Button вид="основная" иконка={<ArrowRight size={17} />}>
                Открыть
              </Button>
            </Link>
            <Button
              вид="обычная"
              иконка={<Info size={17} />}
              aria-expanded={почему}
              onClick={() => показатьПочему((было) => !было)}
            >
              {почему ? 'Скрыть основания' : 'Почему это'}
            </Button>
            {действие.минут !== null ? (
              <span className="text-caption text-ink-3">
                займёт {действие.минут}{' '}
                {склонение(действие.минут, 'минуту', 'минуты', 'минут')}
              </span>
            ) : (
              <span className="text-caption text-ink-3">время не указано</span>
            )}
          </div>
        </CardBody>

        <div className="border-t border-line bg-sunken p-6 lg:border-t-0 lg:border-l">
          <ul className="space-y-3.5">
            {действие.основания.map((основание) => (
              <li key={основание.заголовок}>
                <p className="text-meta font-semibold text-ink">
                  {основание.заголовок}
                </p>
                <p className="mt-0.5 text-caption leading-relaxed text-ink-2">
                  {основание.текст}
                </p>
              </li>
            ))}
          </ul>

          {почему ? (
            <div className="mt-4 border-t border-line pt-3.5">
              <p className="text-meta font-semibold text-ink">Если отложить</p>
              <p className="mt-0.5 text-caption leading-relaxed text-ink-2">
                {действие.еслиОтложить}
              </p>
              <p className="mt-3 text-caption leading-relaxed text-ink-3">
                Предложение выведено из ваших записей по правилам, которые можно
                прочитать. Приложение не знает, когда у вас пик внимания, и не
                делает вид, что знает.
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </Card>
  )
}
