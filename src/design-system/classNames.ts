import clsx, { type ClassValue } from 'clsx'

/** Сборка списка классов. Отдельная функция, чтобы не тянуть clsx повсюду. */
export function cn(...значения: ClassValue[]): string {
  return clsx(значения)
}
