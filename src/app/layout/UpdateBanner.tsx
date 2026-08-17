import { useRegisterSW } from 'virtual:pwa-register/react'
import { RefreshCw, X } from 'lucide-react'
import { cn } from '@/design-system/classNames'
import { ЗНАЧОК } from '@/design-system/iconSize'
import { useПрисутствие } from '@/design-system/motion/Presence'
import { Button, IconButton } from '@/design-system/components'

const ЧАС = 60 * 60 * 1000

/**
 * Извещение о новой версии приложения.
 *
 * Раньше обновление ждало, пока человек закроет вообще все вкладки
 * приложения, — Workbox не включает уже скачанную версию, пока хоть одна
 * вкладка держит старую под управлением. Кнопка ниже сама зовёт
 * `skipWaiting`, поэтому обновиться можно не закрывая ничего руками.
 */
export function UpdateBanner() {
  const {
    needRefresh: [доступно, установитьДоступно],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, регистрация) {
      if (!регистрация) return
      setInterval(() => {
        void регистрация.update()
      }, ЧАС)
    },
  })

  const { смонтировано, закрывается, наОкончание } = useПрисутствие(доступно)

  if (!смонтировано) return null

  return (
    <div
      role="status"
      onAnimationEnd={наОкончание}
      className={cn(
        'fixed top-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3',
        'rounded-3 border border-line bg-over px-3 py-2 shadow-3',
        закрывается ? 'anim-pop-уход' : 'anim-pop',
      )}
    >
      <p className="pl-1 text-meta text-ink">Вышло обновление приложения</p>
      <Button
        вид="основная"
        размер="малый"
        иконка={<RefreshCw size={ЗНАЧОК.подпись} />}
        onClick={() => void updateServiceWorker(true)}
      >
        Обновить
      </Button>
      <IconButton подпись="Скрыть на сейчас" onClick={() => установитьДоступно(false)}>
        <X size={ЗНАЧОК.подпись} />
      </IconButton>
    </div>
  )
}
