import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Info } from 'lucide-react'
import type { СледующееДействие } from '@/core/day/NextAction'
import { склонение } from '@/core/language/Plural'
import { Button, Card, CardBody } from '@/design-system/components'
import { ЗНАЧОК } from '@/design-system/iconSize'
import { AmbientField } from '@/design-system/motion/AmbientField'

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
    <Card className="hero-surface relative overflow-hidden">
      <AmbientField />
      <div className="relative grid min-h-[300px] gap-0 lg:grid-cols-[1.55fr_1fr]">
        <CardBody className="flex flex-col justify-center gap-5 p-6 sm:p-8 lg:p-9">
          <p className="hero-kicker text-micro font-medium">Один выбор</p>

          <div>
            <h1 className="hero-title text-ink">{действие.заголовок}</h1>
            <p className="mt-2 text-body leading-relaxed text-ink-2">
              {действие.зачем}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              to={действие.раздел}
              className="button-base button-primary inline-flex h-11 items-center justify-center gap-2 rounded-2 px-4 text-body font-medium"
            >
              Открыть
              <span className="button-trailing flex h-7 w-7 items-center justify-center rounded-full">
                <ArrowRight size={ЗНАЧОК.строка} />
              </span>
            </Link>
            <Button
              вид="обычная"
              иконка={<Info size={ЗНАЧОК.строка} />}
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

        <div className="decision-reason border-t border-line p-6 lg:border-t-0 lg:border-l">
          <p className="mb-4 text-micro font-medium tracking-[0.14em] text-ink-3 uppercase">
            Почему это сейчас
          </p>
          <ul className="space-y-3.5">
            {действие.основания.map((основание) => (
              <li key={основание.заголовок}>
                <p className="text-meta font-medium text-ink">
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
              <p className="text-meta font-medium text-ink">Если отложить</p>
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
