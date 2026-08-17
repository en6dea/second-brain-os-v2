import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'

// База для GitHub Pages. Локально и в тестах остаётся корнем.
const base = process.env.DEPLOY_TARGET === 'pages' ? '/second-brain-os-v2/' : '/'

const версия = process.env.npm_package_version ?? '2.0.0-alpha.1'

export default defineConfig({
  base,
  define: {
    __ВЕРСИЯ_ПРИЛОЖЕНИЯ__: JSON.stringify(версия),
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'Второй мозг — панель управления жизнью',
        short_name: 'Второй мозг',
        description:
          'Личная операционная система: день, цели, привычки, деньги, знания, обзоры.',
        lang: 'ru',
        dir: 'ltr',
        start_url: base,
        scope: base,
        display: 'standalone',
        background_color: '#f4f2ee',
        theme_color: '#f4f2ee',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Данные лежат в IndexedDB и намеренно не кэшируются:
        // устаревшие цифры о деньгах хуже, чем отсутствие цифр.
        navigateFallback: `${base}index.html`,
        cleanupOutdatedCaches: true,
      },
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    // Слушаем именно IPv4: на Windows «localhost» в браузере разрешается
    // в 127.0.0.1, а привязка только к ::1 даёт отказ в соединении.
    host: '127.0.0.1',
    // Порт задаётся переменной окружения, чтобы им управляла среда запуска.
    port: Number(process.env.PORT) || 5173,
  },
})
