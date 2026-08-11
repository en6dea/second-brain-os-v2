/** Идентификатор записи. Устойчив к отсутствию crypto.randomUUID. */
export function новыйId(): string {
  const c = globalThis.crypto
  if (c && typeof c.randomUUID === 'function') return c.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

/** Метка времени в формате ISO. */
export function сейчас(): string {
  return new Date().toISOString()
}
