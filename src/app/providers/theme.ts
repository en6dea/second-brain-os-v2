import { create } from 'zustand'

export type РежимТемы = 'light' | 'dark' | 'system'

const КЛЮЧ = 'второй-мозг.тема'

function прочитать(): РежимТемы {
  try {
    const значение = localStorage.getItem(КЛЮЧ)
    if (значение === 'light' || значение === 'dark' || значение === 'system')
      return значение
  } catch {
    /* приватный режим браузера — молча берём системную */
  }
  return 'system'
}

function применить(режим: РежимТемы) {
  const тёмная =
    режим === 'dark' ||
    (режим === 'system' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.dataset.theme = тёмная ? 'dark' : 'light'
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', тёмная ? '#111210' : '#eff1f0')
}

interface СостояниеТемы {
  режим: РежимТемы
  установить: (режим: РежимТемы) => void
}

export const использоватьТему = create<СостояниеТемы>((set) => ({
  режим: прочитать(),
  установить: (режим) => {
    try {
      localStorage.setItem(КЛЮЧ, режим)
    } catch {
      /* не критично: тема просто не запомнится */
    }
    применить(режим)
    set({ режим })
  },
}))

/** Следим за системной темой, пока выбран режим «как в системе». */
export function слушатьСистемнуюТему() {
  const запрос = window.matchMedia('(prefers-color-scheme: dark)')
  const обработчик = () => {
    if (использоватьТему.getState().режим === 'system') применить('system')
  }
  запрос.addEventListener('change', обработчик)
  применить(использоватьТему.getState().режим)
  return () => запрос.removeEventListener('change', обработчик)
}
