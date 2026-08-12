import { база } from '@/core/db/db'
import { новаяЗапись } from '@/core/db/repo'
import type { ДелоВдвоём, ДеньПартнёра } from '@/core/db/types'
import {
  датаИлиNull,
  деньгиИзСтарого,
  массивСтрок,
  массив,
  остаток,
  СЛУЖЕБНЫЕ,
  текст,
  времяЗаписи,
  числоИлиNull,
  type Запись,
} from './legacyFields'
import type { СтрокаОтчёта } from './legacyMoney'

/**
 * Перенос раздела отношений.
 *
 * В прежней версии эти записи лежали в `polinaDays` и `coupleActivities`.
 * Оценки переносятся как есть: где не было отметки, остаётся неизвестность,
 * а не ноль. Числовые поля прежней версии могли содержать настоящий ноль —
 * пустая строка и отсутствие поля от него отличаются.
 */

const СОСТОЯНИЕ_ДНЯ: Record<string, ДеньПартнёра['состояние']> = {
  good: 'хорошо',
  neutral: 'обычно',
  bad: 'трудно',
  хорошо: 'хорошо',
  обычно: 'обычно',
  трудно: 'трудно',
}

const ЦИКЛ: Record<string, ДеньПартнёра['цикл']> = {
  start: 'начало',
  ongoing: 'идут',
  during: 'идут',
  end: 'конец',
}

const ВИД_ДЕЛА: Record<string, string> = {
  conversation: 'разговор',
  cozy: 'уют',
  outdoor: 'прогулка',
  active: 'движение',
  culture: 'культура',
  food: 'еда',
  trip: 'поездка',
  home: 'дома',
  learning: 'учёба',
}

const ФОРМАТ_ДЕЛА: Record<string, string> = {
  outside: 'вне дома',
  home: 'дома',
  flexible: 'как получится',
  online: 'на связи',
}

const НОВИЗНА: Record<string, ДелоВдвоём['новизна']> = {
  familiar: 'знакомое',
  variation: 'вариация',
  new: 'новое',
}

const ИНТЕНСИВНОСТЬ: Record<string, string> = {
  small: 'лёгкое',
  medium: 'среднее',
  big: 'серьёзное',
}

const ЭФФЕКТ: Record<string, string> = {
  charge: 'заряжает',
  restore: 'восстанавливает',
  spend: 'требует сил',
}

const ЧЬЯ_ИДЕЯ: Record<string, string> = {
  together: 'вместе',
  me: 'моя',
  partner: 'её',
  both: 'вместе',
}

const СОСТОЯНИЕ_ДЕЛА: Record<string, ДелоВдвоём['состояние']> = {
  idea: 'задумано',
  planned: 'запланировано',
  done: 'сделано',
  completed: 'сделано',
  canceled: 'отменено',
  cancelled: 'отменено',
}

/** Перевод по словарю: неизвестное значение сохраняется как есть. */
function поСловарю(словарь: Record<string, string>, значение: unknown): string {
  const ключ = текст(значение).toLowerCase()
  if (!ключ) return ''
  return словарь[ключ] ?? текст(значение)
}

export async function перенестиДниПартнёра(
  состояние: Запись,
  человекId: string | null,
): Promise<{ строка: СтрокаОтчёта }> {
  const старые = массив(состояние, 'polinaDays')
  const новые: ДеньПартнёра[] = []

  for (const строка of старые) {
    const дата = датаИлиNull(строка.date)
    if (!дата) continue

    новые.push(
      новаяЗапись({
        человекId,
        дата,
        состояние: СОСТОЯНИЕ_ДНЯ[текст(строка.status).toLowerCase()] ?? null,
        энергия: числоИлиNull(строка.energy),
        дискомфорт: числоИлиNull(строка.discomfort),
        стресс: числоИлиNull(строка.stress),
        настроение: текст(строка.mood),
        сон: текст(строка.sleep),
        цикл: ЦИКЛ[текст(строка.periodMarker).toLowerCase()] ?? null,
        симптомы: массивСтрок(строка.symptoms),
        чтоПомогло: текст(строка.helped),
        чтоНеПомогло: текст(строка.notHelped),
        какаяПоддержкаНужна: текст(строка.supportNeeded),
        просьба: текст(строка.request),
        планы: текст(строка.plans),
        заметка: [текст(строка.comment), текст(строка.reminder)]
          .filter(Boolean)
          .join('\n'),
        ...времяЗаписи(строка),
        legacy: остаток(строка, [
          ...СЛУЖЕБНЫЕ,
          'date',
          'status',
          'energy',
          'discomfort',
          'stress',
          'mood',
          'sleep',
          'periodMarker',
          'symptoms',
          'helped',
          'notHelped',
          'supportNeeded',
          'request',
          'plans',
          'comment',
          'reminder',
        ]),
      }) as ДеньПартнёра,
    )
  }

  if (новые.length > 0) await база.partnerDays.bulkPut(новые)
  return {
    строка: {
      название: 'Дни близкого человека',
      перенесено: новые.length,
      из: старые.length,
      пояснение:
        новые.length < старые.length
          ? 'записи без даты пропущены — привязать их к дню невозможно'
          : undefined,
    },
  }
}

export async function перенестиДелаВдвоём(
  состояние: Запись,
): Promise<{ строка: СтрокаОтчёта }> {
  const старые = массив(состояние, 'coupleActivities')
  const новые = старые.map(
    (строка) =>
      новаяЗапись({
        название: текст(строка.title) || 'Без названия',
        дата: датаИлиNull(строка.date),
        время: текст(строка.time) || null,
        вид: поСловарю(ВИД_ДЕЛА, строка.category),
        формат: поСловарю(ФОРМАТ_ДЕЛА, строка.format),
        новизна: НОВИЗНА[текст(строка.novelty).toLowerCase()] ?? null,
        интенсивность: поСловарю(ИНТЕНСИВНОСТЬ, строка.intensity),
        эффект: поСловарю(ЭФФЕКТ, строка.energy),
        длительностьМинут: числоИлиNull(строка.duration),
        чьяИдея: поСловарю(ЧЬЯ_ИДЕЯ, строка.owner),
        состояние:
          СОСТОЯНИЕ_ДЕЛА[текст(строка.status).toLowerCase()] ?? 'задумано',
        бюджет: деньгиИзСтарого(строка.budget),
        заметка: текст(строка.note),
        впечатление: [текст(строка.effect), текст(строка.reflection)]
          .filter(Boolean)
          .join('\n'),
        ...времяЗаписи(строка),
        legacy: остаток(строка, [
          ...СЛУЖЕБНЫЕ,
          'title',
          'date',
          'time',
          'category',
          'format',
          'novelty',
          'intensity',
          'energy',
          'duration',
          'owner',
          'status',
          'budget',
          'note',
          'effect',
          'reflection',
        ]),
      }) as ДелоВдвоём,
  )

  if (новые.length > 0) await база.coupleActivities.bulkPut(новые)
  return {
    строка: {
      название: 'Дела вдвоём',
      перенесено: новые.length,
      из: старые.length,
    },
  }
}
