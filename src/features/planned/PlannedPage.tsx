import { Link, useLocation } from 'react-router-dom'
import { Card, CardBody, CardHeader } from '@/design-system/components'
import { МЕНЮ } from '@/app/navigation'

/**
 * Несуществующий адрес.
 *
 * Раньше эта страница описывала разделы, до которых не дошла очередь.
 * Теперь построены все, и она осталась ровно для одного случая: человек
 * попал по адресу, которого в приложении нет. Вместо пустого экрана —
 * что произошло и куда идти.
 */
export function PlannedPage() {
  const { pathname } = useLocation()

  return (
    <div className="anim-rise space-y-5">
      <Card>
        <CardHeader
          заголовок="Такого раздела нет"
          подпись={`Адрес ${pathname} ни на что не указывает`}
        />
        <CardBody>
          <p className="text-meta leading-relaxed text-ink-2">
            Возможно, ссылка устарела или в адресе опечатка. Ниже — всё, что есть в
            приложении.
          </p>

          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {МЕНЮ.map((группа) => (
              <div key={группа.название}>
                <p className="mb-1.5 text-micro font-semibold tracking-[0.16em] text-ink-3 uppercase">
                  {группа.название}
                </p>
                <ul className="space-y-1">
                  {группа.пункты.map((пункт) => (
                    <li key={пункт.путь}>
                      <Link
                        to={пункт.путь}
                        className="inline-flex items-center gap-2 text-meta text-ink-2 hover:text-accent"
                      >
                        <пункт.иконка size={14} />
                        {пункт.название}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
