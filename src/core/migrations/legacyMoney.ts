import { база } from '@/core/db/db'
import { новаяЗапись } from '@/core/db/repo'
import { сейчас } from '@/core/db/RecordId'
import type {
  БюджетМесяца,
  КатегорияДенег,
  КлассРасхода,
  Обязательство,
  Операция,
  ПлановыйПлатёж,
  ПлатёжПоОбязательству,
  Счёт,
  ТипОперации,
  ТипСчёта,
} from '@/core/db/types'
import {
  датаИлиNull,
  деньгиИзСтарого,
  массив,
  остаток,
  СЛУЖЕБНЫЕ,
  текст,
  числоИлиNull,
  type Запись,
} from './legacyFields'

export interface СтрокаОтчёта {
  название: string
  перенесено: number
  из: number
  /** Почему число перенесённых отличается от исходного. */
  пояснение?: string
}

const ТИПЫ_СЧЕТОВ: Record<string, ТипСчёта> = {
  cash: 'наличные',
  bank_card: 'карта',
  card: 'карта',
  debit: 'карта',
  deposit: 'вклад',
  savings: 'накопительный',
  credit_card: 'кредитная карта',
  credit: 'кредитная карта',
  other: 'иное',
}

const ТИПЫ_ОПЕРАЦИЙ: Record<string, ТипОперации> = {
  income: 'доход',
  expense: 'расход',
  transfer: 'перевод',
  refund: 'возврат',
  adjustment: 'корректировка',
}

const КЛАССЫ_РАСХОДА: Record<string, КлассРасхода> = {
  mandatory: 'обязательный',
  required: 'обязательный',
  needed: 'нужный',
  necessary: 'нужный',
  optional: 'желаемый',
  wanted: 'желаемый',
  want: 'желаемый',
}

/** Категории денег: две прежние коллекции сводятся в одну без дублей. */
export async function перенестиКатегории(
  состояние: Запись,
): Promise<{ строка: СтрокаОтчёта; поИмени: Map<string, string> }> {
  const поИмени = new Map<string, string>()
  for (const существующая of await база.moneyCategories.toArray()) {
    поИмени.set(существующая.название.toLowerCase(), существующая.id)
  }

  const подробные = массив(состояние, 'financeCategories')
  const простые = массив(состояние, 'categories')
  const новые: КатегорияДенег[] = []

  for (const строка of подробные) {
    const название = текст(строка.name)
    if (!название || поИмени.has(название.toLowerCase())) continue
    const запись = новаяЗапись({
      название,
      вид: текст(строка.type) === 'income' ? 'доход' : 'расход',
      иконка: текст(строка.icon),
      цвет: текст(строка.color) || 'ink-2',
      месячныйЛимит: деньгиИзСтарого(строка.monthlyLimit),
      классПоУмолчанию: КЛАССЫ_РАСХОДА[текст(строка.defaultExpenseClass)] ?? null,
      архив: Boolean(строка.archived) || строка.active === false,
      порядок: числоИлиNull(строка.order) ?? 0,
      правила: [],
      legacy: остаток(строка, [
        ...СЛУЖЕБНЫЕ,
        'name',
        'type',
        'icon',
        'color',
        'monthlyLimit',
        'defaultExpenseClass',
        'archived',
        'active',
        'order',
      ]),
    }) as КатегорияДенег
    новые.push(запись)
    поИмени.set(название.toLowerCase(), запись.id)
  }

  // Старый плоский список: берём только то, чего ещё нет.
  for (const строка of простые) {
    const название = текст(строка.name)
    if (!название || поИмени.has(название.toLowerCase())) continue
    const запись = новаяЗапись({
      название,
      вид: текст(строка.type) === 'income' ? 'доход' : 'расход',
      иконка: '',
      цвет: 'ink-2',
      месячныйЛимит: деньгиИзСтарого(строка.limit),
      классПоУмолчанию: null,
      архив: false,
      порядок: 100,
      правила: [],
      legacy: { прежняяКоллекция: 'categories' },
    }) as КатегорияДенег
    новые.push(запись)
    поИмени.set(название.toLowerCase(), запись.id)
  }

  if (новые.length > 0) await база.moneyCategories.bulkPut(новые)

  const всего = подробные.length + простые.length
  const совпало = всего - новые.length

  return {
    строка: {
      название: 'Категории денег',
      перенесено: новые.length,
      из: всего,
      пояснение:
        совпало > 0
          ? `${совпало} совпали по названию с уже имеющимися и не задвоились`
          : undefined,
    },
    поИмени,
  }
}

export async function перенестиСчета(состояние: Запись): Promise<{
  строка: СтрокаОтчёта
  поСтаромуId: Map<string, string>
  поИмени: Map<string, string>
}> {
  const старые = массив(состояние, 'financeAccounts')
  const поСтаромуId = new Map<string, string>()
  const поИмени = new Map<string, string>()
  const новые: Счёт[] = []

  старые.forEach((строка, индекс) => {
    const название = текст(строка.name) || `Счёт ${индекс + 1}`
    const остатокСчёта = деньгиИзСтарого(строка.actualBalance)
    const запись = новаяЗапись({
      название,
      тип: ТИПЫ_СЧЕТОВ[текст(строка.type)] ?? 'иное',
      валюта: 'RUB',
      // Незаполненный остаток остаётся незаполненным: это не ноль.
      фактическийОстаток: остатокСчёта,
      подтверждён:
        остатокСчёта === null ? null : текст(строка.reconciledAt) || сейчас(),
      кредитныйЛимит: деньгиИзСтарого(строка.creditLimit),
      учитыватьВДоступных: строка.includeAvailable !== false,
      архив: строка.active === false,
      порядок: индекс,
      legacy: остаток(строка, [
        ...СЛУЖЕБНЫЕ,
        'name',
        'type',
        'currency',
        'actualBalance',
        'reconciledAt',
        'creditLimit',
        'includeAvailable',
        'active',
      ]),
    }) as Счёт
    новые.push(запись)
    const староеId = текст(строка.id)
    if (староеId) поСтаромуId.set(староеId, запись.id)
    поИмени.set(название.toLowerCase(), запись.id)
  })

  if (новые.length > 0) await база.accounts.bulkPut(новые)

  return {
    строка: { название: 'Счета', перенесено: новые.length, из: старые.length },
    поСтаромуId,
    поИмени,
  }
}

export async function перенестиОперации(
  состояние: Запись,
  справочники: {
    категорияПоИмени: Map<string, string>
    счётПоСтаромуId: Map<string, string>
    счётПоИмени: Map<string, string>
  },
): Promise<{ строка: СтрокаОтчёта; предупреждения: string[] }> {
  const старые = массив(состояние, 'operations')
  const новые: Операция[] = []
  const предупреждения: string[] = []
  let безДаты = 0

  for (const строка of старые) {
    const дата = датаИлиNull(строка.date)
    if (!дата) {
      безДаты += 1
      continue
    }

    const названиеКатегории = текст(строка.category)
    const счётId =
      справочники.счётПоСтаромуId.get(текст(строка.accountId)) ??
      справочники.счётПоИмени.get(текст(строка.account).toLowerCase()) ??
      null

    новые.push(
      новаяЗапись({
        дата,
        тип: ТИПЫ_ОПЕРАЦИЙ[текст(строка.type)] ?? 'расход',
        сумма: Math.abs(деньгиИзСтарого(строка.amount) ?? 0),
        счётId,
        счётПолучательId: null,
        категорияId:
          справочники.категорияПоИмени.get(названиеКатегории.toLowerCase()) ?? null,
        классРасхода: КЛАССЫ_РАСХОДА[текст(строка.expenseClass)] ?? null,
        заметка: текст(строка.note) || названиеКатегории,
        планId: null,
        отпечатокИмпорта: текст(строка.importSource) || null,
        // Признак прежней версии точнее, чем догадка по наличию категории.
        разобрана: строка.needsCategoryReview ? false : Boolean(названиеКатегории),
        legacy: остаток(строка, [
          ...СЛУЖЕБНЫЕ,
          'date',
          'type',
          'amount',
          'category',
          'expenseClass',
          'account',
          'accountId',
          'note',
          'importSource',
          'needsCategoryReview',
        ]),
      }) as Операция,
    )
  }

  if (новые.length > 0) await база.operations.bulkPut(новые)
  if (безДаты > 0) {
    предупреждения.push(
      `Операций без даты пропущено: ${безДаты}. Без даты операция не участвует в расчёте периода.`,
    )
  }

  return {
    строка: { название: 'Операции', перенесено: новые.length, из: старые.length },
    предупреждения,
  }
}

export async function перенестиОбязательства(состояние: Запись): Promise<{
  строки: СтрокаОтчёта[]
}> {
  const старые = массив(состояние, 'debts')
  const поСтаромуId = new Map<string, string>()
  const новые: Обязательство[] = []

  const закрытые = ['закрыт', 'закрыто', 'оплачен', 'оплачено', 'closed', 'done']

  for (const строка of старые) {
    const направление =
      текст(строка.direction) === 'in' || текст(строка.direction) === 'incoming'
        ? 'мне должны'
        : 'я должен'

    const запись = новаяЗапись({
      название: текст(строка.creditor) || текст(строка.person) || 'Обязательство',
      направление,
      вид: 'иное',
      телоОстаток:
        деньгиИзСтарого(строка.principalBalance) ??
        деньгиИзСтарого(строка.currentBalance) ??
        деньгиИзСтарого(строка.amount),
      начисленныеПроценты: деньгиИзСтарого(строка.accruedInterest),
      штрафы: деньгиИзСтарого(строка.penalties),
      ставкаГодовых: числоИлиNull(строка.interestRate),
      минимальныйПлатёж: деньгиИзСтарого(строка.minimumPayment),
      датаСледующегоПлатежа: датаИлиNull(строка.nextPaymentDate ?? строка.due),
      датаОкончания: датаИлиNull(строка.endDate),
      контрагент: текст(строка.person) || текст(строка.creditor),
      закрыто:
        Boolean(текст(строка.closedAt)) ||
        закрытые.includes(текст(строка.status).toLowerCase()),
      заметка: текст(строка.note),
      legacy: остаток(строка, [
        ...СЛУЖЕБНЫЕ,
        'direction',
        'creditor',
        'person',
        'status',
        'principalBalance',
        'currentBalance',
        'amount',
        'accruedInterest',
        'penalties',
        'interestRate',
        'minimumPayment',
        'nextPaymentDate',
        'due',
        'endDate',
        'closedAt',
        'note',
      ]),
    }) as Обязательство

    новые.push(запись)
    const староеId = текст(строка.id)
    if (староеId) поСтаромуId.set(староеId, запись.id)
  }

  if (новые.length > 0) await база.obligations.bulkPut(новые)

  const старыеПлатежи = массив(состояние, 'debtPayments')
  const платежи: ПлатёжПоОбязательству[] = []
  for (const строка of старыеПлатежи) {
    const обязательствоId = поСтаромуId.get(текст(строка.debtId))
    if (!обязательствоId) continue
    const тело = деньгиИзСтарого(строка.principal) ?? 0
    const проценты = деньгиИзСтарого(строка.interest) ?? 0
    const штрафы = деньгиИзСтарого(строка.penalties) ?? 0
    платежи.push(
      новаяЗапись({
        обязательствоId,
        дата: датаИлиNull(строка.date) ?? сейчас().slice(0, 10),
        всего: деньгиИзСтарого(строка.amount) ?? тело + проценты + штрафы,
        тело,
        проценты,
        штрафы,
        операцияId: null,
        legacy: остаток(строка, [
          ...СЛУЖЕБНЫЕ,
          'debtId',
          'date',
          'amount',
          'principal',
          'interest',
          'penalties',
        ]),
      }) as ПлатёжПоОбязательству,
    )
  }
  if (платежи.length > 0) await база.obligationPayments.bulkPut(платежи)

  return {
    строки: [
      { название: 'Обязательства', перенесено: новые.length, из: старые.length },
      {
        название: 'Платежи по обязательствам',
        перенесено: платежи.length,
        из: старыеПлатежи.length,
      },
    ],
  }
}

/** Плановые расходы и покупки сводятся в плановые платежи. */
export async function перенестиПланыИБюджеты(
  состояние: Запись,
  категорияПоИмени: Map<string, string>,
): Promise<{ строки: СтрокаОтчёта[] }> {
  const планы = массив(состояние, 'financePlans')
  const покупки = массив(состояние, 'plannedExpenses')
  const платежи: ПлановыйПлатёж[] = []

  const собрать = (строка: Запись, обязательный: boolean) => {
    const месяц = текст(строка.month)
    const день = числоИлиNull(строка.dueDay ?? строка.day) ?? 1
    const дата =
      датаИлиNull(строка.date) ??
      (месяц ? `${месяц}-${String(день).padStart(2, '0')}` : null)
    if (!дата) return
    платежи.push(
      новаяЗапись({
        название: текст(строка.title) || 'Плановый платёж',
        сумма: деньгиИзСтарого(строка.amount) ?? 0,
        дата,
        категорияId:
          категорияПоИмени.get(текст(строка.category).toLowerCase()) ?? null,
        счётId: null,
        обязательный: Boolean(строка.mandatory) || обязательный,
        оплачен:
          текст(строка.status) === 'paid' || Boolean(строка.actualOperationId),
        операцияId: null,
        legacy: остаток(строка, [
          ...СЛУЖЕБНЫЕ,
          'title',
          'amount',
          'month',
          'dueDay',
          'day',
          'date',
          'category',
          'mandatory',
          'status',
          'actualOperationId',
        ]),
      }) as ПлановыйПлатёж,
    )
  }

  for (const строка of планы) собрать(строка, false)
  for (const строка of покупки) собрать(строка, true)
  if (платежи.length > 0) await база.plannedPayments.bulkPut(платежи)

  // Бюджеты прежней версии — строка на категорию; собираем по месяцам.
  const строкиБюджета = массив(состояние, 'budgets')
  const поМесяцам = new Map<string, { категорияId: string; лимит: number }[]>()
  for (const строка of строкиБюджета) {
    const месяц = текст(строка.month)
    const категорияId = категорияПоИмени.get(текст(строка.category).toLowerCase())
    const лимит = деньгиИзСтарого(строка.limit)
    if (!месяц || !категорияId || лимит === null) continue
    const список = поМесяцам.get(месяц) ?? []
    список.push({ категорияId, лимит })
    поМесяцам.set(месяц, список)
  }

  const бюджеты: БюджетМесяца[] = [...поМесяцам.entries()].map(([месяц, строки]) =>
    новаяЗапись({
      месяц,
      плановыйДоход: null,
      строки,
    }),
  ) as БюджетМесяца[]
  if (бюджеты.length > 0) await база.budgets.bulkPut(бюджеты)

  return {
    строки: [
      {
        название: 'Плановые платежи',
        перенесено: платежи.length,
        из: планы.length + покупки.length,
      },
      {
        название: 'Лимиты бюджета',
        // Считаем строки лимитов: бюджет месяца собирает их в одну запись.
        перенесено: [...поМесяцам.values()].reduce((итог, с) => итог + с.length, 0),
        из: строкиБюджета.length,
        пояснение:
          бюджеты.length > 0
            ? `сведены в ${бюджеты.length} ${бюджеты.length === 1 ? 'бюджет месяца' : 'бюджета месяцев'}`
            : undefined,
      },
    ],
  }
}
