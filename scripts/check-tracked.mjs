// Проверка: весь исходный код лежит в репозитории.
//
// Правило `backup/` в .gitignore задумывалось для личных копий, но без косой
// черты в начале оно сработало и на src/core/backup — файл не попал в git.
// Локально всё собиралось, потому что он был на диске; на сборочном сервере
// сборка падала. Такую ошибку нельзя ловить глазами, поэтому её ловит проверка.

import { execSync } from 'node:child_process'
import { readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const корень = process.cwd()
const РАСШИРЕНИЯ = /\.(ts|tsx|css)$/

function всеФайлы(каталог) {
  const итог = []
  for (const имя of readdirSync(каталог)) {
    const путь = join(каталог, имя)
    if (statSync(путь).isDirectory()) итог.push(...всеФайлы(путь))
    else if (РАСШИРЕНИЯ.test(имя)) итог.push(путь)
  }
  return итог
}

const вРепозитории = new Set(
  execSync('git ls-files src', { encoding: 'utf8' }).split('\n').filter(Boolean),
)

const наДиске = всеФайлы(join(корень, 'src')).map((путь) =>
  relative(корень, путь).split('\\').join('/'),
)

const пропущенные = наДиске.filter((путь) => !вРепозитории.has(путь))

if (пропущенные.length > 0) {
  console.error('Эти файлы есть на диске, но их нет в репозитории:')
  for (const путь of пропущенные) {
    let причина = 'не добавлены в git'
    try {
      причина = execSync(`git check-ignore -v "${путь}"`, {
        encoding: 'utf8',
      }).trim()
    } catch {
      /* файл просто не добавлен, правила игнорирования ни при чём */
    }
    console.error(`  ${путь} — ${причина}`)
  }
  console.error('\nСборка на сервере упадёт: там этих файлов не будет.')
  process.exit(1)
}

console.log(`Весь исходный код в репозитории: ${наДиске.length} файлов.`)
