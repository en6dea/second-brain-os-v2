import { configDefaults, defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  define: {
    __ВЕРСИЯ_ПРИЛОЖЕНИЯ__: JSON.stringify('2.0.0-alpha.1'),
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    // Рядом с репозиторием бывают вспомогательные рабочие копии (например
    // `.claude/worktrees/*` у параллельных фоновых задач) — без исключения
    // vitest находит в них те же тесты и запускает каждый по два раза.
    exclude: [...configDefaults.exclude, '.claude/**'],
  },
})
