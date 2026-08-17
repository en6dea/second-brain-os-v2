import type { Шифротекст } from '@/core/db/types'

/**
 * Шифрование мастер-паролем.
 *
 * PBKDF2 выводит ключ из мастер-пароля и соли, AES-GCM шифрует и
 * расшифровывает. Ключ невозможно прочитать обратно из `CryptoKey`
 * (`extractable: false`) — сильнее, чем просто «не класть в localStorage».
 * Если мастер-пароль забыт — данные не восстановить: это честное условие
 * настоящего шифрования, не заглушка.
 */

const ИТЕРАЦИЙ_PBKDF2 = 310_000
const ДЛИНА_КЛЮЧА = 256
const ДЛИНА_IV = 12

function вBase64(байты: ArrayBuffer | Uint8Array): string {
  const массив = байты instanceof Uint8Array ? байты : new Uint8Array(байты)
  let строка = ''
  for (const байт of массив) строка += String.fromCharCode(байт)
  return btoa(строка)
}

function изBase64(значение: string): Uint8Array<ArrayBuffer> {
  const строка = atob(значение)
  const массив = new Uint8Array(new ArrayBuffer(строка.length))
  for (let индекс = 0; индекс < строка.length; индекс += 1) {
    массив[индекс] = строка.charCodeAt(индекс)
  }
  return массив
}

export function новаяСоль(): string {
  return вBase64(crypto.getRandomValues(new Uint8Array(16)))
}

export async function вывестиКлюч(
  мастерПароль: string,
  соль: string,
): Promise<CryptoKey> {
  const материал = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(мастерПароль),
    'PBKDF2',
    false,
    ['deriveKey'],
  )
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: изBase64(соль),
      iterations: ИТЕРАЦИЙ_PBKDF2,
      hash: 'SHA-256',
    },
    материал,
    { name: 'AES-GCM', length: ДЛИНА_КЛЮЧА },
    false,
    ['encrypt', 'decrypt'],
  )
}

export async function зашифровать(
  ключ: CryptoKey,
  текст: string,
): Promise<Шифротекст> {
  const vector = crypto.getRandomValues(new Uint8Array(ДЛИНА_IV))
  const данные = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: vector },
    ключ,
    new TextEncoder().encode(текст),
  )
  return { данные: вBase64(данные), vector: вBase64(vector) }
}

export async function расшифровать(
  ключ: CryptoKey,
  шифр: Шифротекст,
): Promise<string> {
  const данные = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: изBase64(шифр.vector) },
    ключ,
    изBase64(шифр.данные),
  )
  return new TextDecoder().decode(данные)
}
