import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Состояние {
  ошибка: Error | null
}

/**
 * Граница ошибки.
 *
 * Приложение про деньги и планы не должно исчезать в белый экран.
 * Если что-то сломалось — человек видит, что именно, и знает, что данные
 * в хранилище не пострадали.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, Состояние> {
  override state: Состояние = { ошибка: null }

  static getDerivedStateFromError(ошибка: Error): Состояние {
    return { ошибка }
  }

  override componentDidCatch(ошибка: Error, сведения: ErrorInfo) {
    console.error('Сбой в интерфейсе:', ошибка, сведения.componentStack)
  }

  override render() {
    if (!this.state.ошибка) return this.props.children

    return (
      <div className="flex min-h-full items-center justify-center p-6">
        <div className="w-full max-w-md rounded-4 border border-line bg-card p-6 shadow-2">
          <h1 className="text-body font-semibold text-ink">
            Что-то сломалось в интерфейсе
          </h1>
          <p className="mt-2 text-meta leading-relaxed text-ink-2">
            Данные в хранилище не изменились — сбой произошёл при отрисовке.
            Перезагрузите страницу. Если повторится, выгрузите копию данных в
            настройках и сообщите, на каком разделе это случилось.
          </p>
          <pre className="mt-3 max-h-40 overflow-auto rounded-2 bg-sunken p-3 text-caption text-ink-3">
            {this.state.ошибка.message}
          </pre>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 inline-flex h-10 items-center rounded-2 bg-accent px-4 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover"
          >
            Перезагрузить
          </button>
        </div>
      </div>
    )
  }
}
