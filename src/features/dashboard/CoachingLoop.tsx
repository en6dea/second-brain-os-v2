import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Clock3,
  Crosshair,
  FolderKanban,
  ShieldCheck,
} from 'lucide-react'
import { Card, CardBody, CardHeader } from '@/design-system/components'
import { деньги } from '@/core/money/Money'
import { склонение } from '@/core/language/Plural'
import { ЗНАЧОК } from '@/design-system/iconSize'

export function CourseOfDay({
  задачВсего,
  задачОткрыто,
  минутЗапланировано,
  безОценкиВремени,
  связаноСКурсом,
  доступно,
  деньгиИзвестны,
  данныеДенегПолны,
}: {
  задачВсего: number
  задачОткрыто: number
  минутЗапланировано: number
  безОценкиВремени: number
  связаноСКурсом: number
  доступно: number
  деньгиИзвестны: boolean
  данныеДенегПолны: boolean
}) {
  const факты = [
    {
      название: 'Фокус',
      значение:
        задачВсего === 0 ? 'задач нет' : `${задачОткрыто} из ${задачВсего}`,
      пояснение:
        задачВсего === 0
          ? 'план задач на сегодня пуст'
          : `${задачОткрыто} ${склонение(задачОткрыто, 'задача открыта', 'задачи открыты', 'задач открыто')}`,
      путь: '/tasks',
      Иконка: Crosshair,
    },
    {
      название: 'Время',
      значение: минутЗапланировано > 0 ? `${минутЗапланировано} мин` : 'не оценено',
      пояснение:
        безОценкиВремени > 0
          ? `${безОценкиВремени} ${склонение(безОценкиВремени, 'задача без времени', 'задачи без времени', 'задач без времени')}`
          : 'у задач указана длительность',
      путь: '/planner',
      Иконка: Clock3,
    },
    {
      название: 'Направление',
      значение: String(связаноСКурсом),
      пояснение:
        связаноСКурсом === 0
          ? 'задачи не связаны с целью или проектом'
          : 'задач связано с целью или проектом',
      путь: '/goals',
      Иконка: FolderKanban,
    },
    {
      название: 'Финансовый запас',
      значение: деньгиИзвестны ? деньги(доступно) : 'нет данных',
      пояснение: !деньгиИзвестны
        ? 'заполните остаток хотя бы одного счёта'
        : данныеДенегПолны
          ? 'по заполненным счетам и обязательствам'
          : 'часть счетов или обязательств не заполнена',
      путь: '/finance',
      Иконка: ShieldCheck,
    },
  ]

  return (
    <Card className="coach-surface overflow-hidden">
      <CardHeader
        заголовок="Курс дня"
        подпись="Четыре факта для решения — не оценка вас"
      />
      <div className="grid border-t border-line sm:grid-cols-2 xl:grid-cols-4">
        {факты.map(({ название, значение, пояснение, путь, Иконка }) => (
          <Link
            key={название}
            to={путь}
            className="coach-cell group min-w-0 p-4 sm:p-5"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-caption font-medium tracking-[0.08em] text-ink-3 uppercase">
                {название}
              </span>
              <Иконка size={ЗНАЧОК.строка} className="text-accent" />
            </div>
            <p className="tnum mt-3 truncate text-h3 font-medium text-ink sm:text-h2">
              {значение}
            </p>
            <p className="mt-1 min-h-10 text-caption leading-snug text-ink-3">
              {пояснение}
            </p>
          </Link>
        ))}
      </div>
    </Card>
  )
}

export function SecondBrainFlow({
  входящих,
  активныхПроектов,
  обзоровСВыводом,
  закрытоИзЗадачНаСегодня,
}: {
  входящих: number
  активныхПроектов: number
  обзоровСВыводом: number
  закрытоИзЗадачНаСегодня: number
}) {
  const шаги = [
    {
      номер: '01',
      название: 'Зафиксировать',
      значение: входящих,
      пояснение: 'ждут разбора',
      путь: '/quick',
    },
    {
      номер: '02',
      название: 'Организовать',
      значение: активныхПроектов,
      пояснение: 'активных проектов',
      путь: '/projects',
    },
    {
      номер: '03',
      название: 'Выделить',
      значение: обзоровСВыводом,
      пояснение: 'обзоров с выводами',
      путь: '/reviews',
    },
    {
      номер: '04',
      название: 'Применить',
      значение: закрытоИзЗадачНаСегодня,
      пояснение: 'задач на сегодня закрыто',
      путь: '/tasks',
    },
  ]

  return (
    <Card className="knowledge-flow h-full overflow-hidden">
      <CardHeader
        заголовок="Контур Second Brain"
        подпись="Знание приносит пользу, когда доходит до действия"
      />
      <CardBody className="pt-1">
        <ol className="space-y-1">
          {шаги.map((шаг) => (
            <li key={шаг.номер}>
              <Link
                to={шаг.путь}
                className="flow-step group flex min-h-16 items-center gap-3 rounded-2 px-3 py-2"
              >
                <span className="unit w-6 shrink-0">{шаг.номер}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-meta font-medium text-ink">
                    {шаг.название}
                  </span>
                  <span className="block text-caption text-ink-3">
                    {шаг.пояснение}
                  </span>
                </span>
                <span className="tnum text-h3 font-medium text-ink">
                  {шаг.значение}
                </span>
                <ArrowRight
                  size={ЗНАЧОК.строка}
                  className="flow-arrow shrink-0 text-ink-3"
                />
              </Link>
            </li>
          ))}
        </ol>
      </CardBody>
    </Card>
  )
}
