import type { СмыслЗначка } from './Icon'

/**
 * Смысл раздела по его адресу.
 *
 * Живёт отдельно от компонента: функция рядом с компонентом ломает горячую
 * перезагрузку, и правило проверки это ловит.
 */
export function смыслРаздела(путь: string): СмыслЗначка {
  if (путь === '/') return 'время'
  if (путь.startsWith('/calendar')) return 'время'
  if (путь.startsWith('/tasks') || путь.startsWith('/projects')) return 'дело'
  if (путь.startsWith('/goals') || путь.startsWith('/plann')) return 'цель'
  if (путь.startsWith('/habits') || путь.startsWith('/experience')) return 'привычка'
  if (путь.startsWith('/relationship')) return 'близкий'
  if (путь.startsWith('/people')) return 'человек'
  if (путь.startsWith('/obligations')) return 'долг'
  if (путь.startsWith('/finance') || путь.startsWith('/trading')) return 'деньги'
  if (путь.startsWith('/knowledge') || путь.startsWith('/learning')) return 'знание'
  if (путь.startsWith('/journal') || путь.startsWith('/inbox')) return 'запись'
  if (путь.startsWith('/quick')) return 'внимание'
  if (путь.startsWith('/passwords')) return 'система'
  return 'система'
}
