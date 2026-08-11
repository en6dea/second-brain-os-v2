// Генератор иконок приложения. Запускается вручную: node scripts/make-icons.mjs
// Рисует значок «связанные узлы» — связь записей между собой, а не склад.
// Без внешних зависимостей: пиксели считаются здесь, PNG кодируется через zlib.

import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const корень = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const ФОН = [17, 18, 16]
const АКЦЕНТ = [63, 181, 174]
const СВЕТЛЫЙ = [232, 235, 231]

function crc32(данные) {
  let таблица = crc32.таблица
  if (!таблица) {
    таблица = crc32.таблица = new Int32Array(256)
    for (let i = 0; i < 256; i += 1) {
      let c = i
      for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      таблица[i] = c
    }
  }
  let crc = -1
  for (let i = 0; i < данные.length; i += 1)
    crc = (crc >>> 8) ^ таблица[(crc ^ данные[i]) & 0xff]
  return (crc ^ -1) >>> 0
}

function блок(тип, тело) {
  const длина = Buffer.alloc(4)
  длина.writeUInt32BE(тело.length)
  const имя = Buffer.from(тип, 'ascii')
  const контроль = Buffer.alloc(4)
  контроль.writeUInt32BE(crc32(Buffer.concat([имя, тело])))
  return Buffer.concat([длина, имя, тело, контроль])
}

function вPng(ширина, высота, пиксели) {
  const заголовок = Buffer.alloc(13)
  заголовок.writeUInt32BE(ширина, 0)
  заголовок.writeUInt32BE(высота, 4)
  заголовок[8] = 8 // бит на канал
  заголовок[9] = 6 // RGBA
  const строки = Buffer.alloc((ширина * 4 + 1) * высота)
  for (let y = 0; y < высота; y += 1) {
    строки[y * (ширина * 4 + 1)] = 0
    пиксели.copy(
      строки,
      y * (ширина * 4 + 1) + 1,
      y * ширина * 4,
      (y + 1) * ширина * 4,
    )
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    блок('IHDR', заголовок),
    блок('IDAT', deflateSync(строки, { level: 9 })),
    блок('IEND', Buffer.alloc(0)),
  ])
}

function смешать(низ, верх, доля) {
  return низ.map((канал, индекс) =>
    Math.round(канал + (верх[индекс] - канал) * доля),
  )
}

function нарисовать(размер) {
  const пиксели = Buffer.alloc(размер * размер * 4)
  const радиусФона = размер * 0.22
  const узлы = [
    { x: 0.5, y: 0.27, r: 0.085, цвет: СВЕТЛЫЙ },
    { x: 0.27, y: 0.66, r: 0.07, цвет: АКЦЕНТ },
    { x: 0.73, y: 0.66, r: 0.07, цвет: АКЦЕНТ },
    { x: 0.5, y: 0.5, r: 0.045, цвет: АКЦЕНТ },
  ]
  const связи = [
    [0, 3],
    [1, 3],
    [2, 3],
    [1, 2],
  ]

  for (let y = 0; y < размер; y += 1) {
    for (let x = 0; x < размер; x += 1) {
      const смещение = (y * размер + x) * 4
      const внутриФона = скруглённыйКвадрат(x, y, размер, радиусФона)
      if (внутриФона <= 0) {
        пиксели.writeUInt32BE(0, смещение)
        continue
      }

      let цвет = ФОН
      const непрозрачность = внутриФона

      for (const [а, б] of связи) {
        const расстояние = доОтрезка(
          x / размер,
          y / размер,
          узлы[а].x,
          узлы[а].y,
          узлы[б].x,
          узлы[б].y,
        )
        const толщина = 0.012
        const мягкость = Math.max(0, 1 - (расстояние - толщина) / 0.006)
        if (мягкость > 0)
          цвет = смешать(цвет, АКЦЕНТ, Math.min(1, мягкость) * 0.55)
      }

      for (const узел of узлы) {
        const dx = x / размер - узел.x
        const dy = y / размер - узел.y
        const расстояние = Math.sqrt(dx * dx + dy * dy)
        const мягкость = Math.max(0, 1 - (расстояние - узел.r) / 0.006)
        if (мягкость > 0) цвет = смешать(цвет, узел.цвет, Math.min(1, мягкость))
      }

      пиксели[смещение] = цвет[0]
      пиксели[смещение + 1] = цвет[1]
      пиксели[смещение + 2] = цвет[2]
      пиксели[смещение + 3] = Math.round(255 * непрозрачность)
    }
  }
  return пиксели
}

function скруглённыйКвадрат(x, y, размер, радиус) {
  const cx = Math.min(Math.max(x, радиус), размер - радиус)
  const cy = Math.min(Math.max(y, радиус), размер - радиус)
  const dx = x - cx
  const dy = y - cy
  const расстояние = Math.sqrt(dx * dx + dy * dy)
  return Math.min(1, Math.max(0, радиус - расстояние + 1))
}

function доОтрезка(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1
  const dy = y2 - y1
  const длина = dx * dx + dy * dy
  const t =
    длина === 0
      ? 0
      : Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / длина))
  const cx = x1 + t * dx
  const cy = y1 + t * dy
  return Math.sqrt((px - cx) ** 2 + (py - cy) ** 2)
}

mkdirSync(resolve(корень, 'public'), { recursive: true })

for (const размер of [192, 512]) {
  writeFileSync(
    resolve(корень, `public/icon-${размер}.png`),
    вPng(размер, размер, нарисовать(размер)),
  )
  console.log(`public/icon-${размер}.png`)
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="#111210"/>
  <line x1="32" y1="17" x2="32" y2="32" stroke="#3fb5ae" stroke-width="1.6" opacity="0.55"/>
  <line x1="17" y1="42" x2="32" y2="32" stroke="#3fb5ae" stroke-width="1.6" opacity="0.55"/>
  <line x1="47" y1="42" x2="32" y2="32" stroke="#3fb5ae" stroke-width="1.6" opacity="0.55"/>
  <line x1="17" y1="42" x2="47" y2="42" stroke="#3fb5ae" stroke-width="1.6" opacity="0.55"/>
  <circle cx="32" cy="17" r="5.5" fill="#e8ebe7"/>
  <circle cx="17" cy="42" r="4.5" fill="#3fb5ae"/>
  <circle cx="47" cy="42" r="4.5" fill="#3fb5ae"/>
  <circle cx="32" cy="32" r="2.9" fill="#3fb5ae"/>
</svg>
`
writeFileSync(resolve(корень, 'public/favicon.svg'), svg)
console.log('public/favicon.svg')
