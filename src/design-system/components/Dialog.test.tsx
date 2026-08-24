import { describe, expect, it } from 'vitest'
import { useState } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Dialog } from './Dialog'
import { MoneyInput } from './Form'

/**
 * Проверка на возврат ошибки, из-за которой в поле окна получалось ввести
 * только один символ.
 *
 * Родитель почти всегда передаёт обработчик закрытия стрелкой прямо в
 * разметке, то есть новой функцией на каждую перерисовку. Пока обработчик
 * стоял в зависимостях эффекта, эффект срабатывал на каждый символ и уводил
 * фокус на само окно. Тест набирает несколько символов подряд: если фокус
 * уходит, в поле останется только первый.
 */
function DialogWithField() {
  const [значение, установить] = useState('')
  return (
    <Dialog открыто наЗакрытие={() => установить('')} заголовок="Проверка ввода">
      <MoneyInput aria-label="Сумма" value={значение} onChange={установить} />
    </Dialog>
  )
}

function ManagedDialog() {
  const [открыто, установитьОткрыто] = useState(false)
  return (
    <>
      <button type="button" onClick={() => установитьОткрыто(true)}>
        Открыть проверку
      </button>
      <Dialog
        открыто={открыто}
        наЗакрытие={() => установитьОткрыто(false)}
        заголовок="Управляемое окно"
      >
        <button type="button">Первое действие</button>
        <button type="button">Последнее действие</button>
      </Dialog>
    </>
  )
}

function AutoFocusDialog() {
  const [открыто, установитьОткрыто] = useState(false)
  return (
    <>
      <button type="button" onClick={() => установитьОткрыто(true)}>
        Открыть форму
      </button>
      <Dialog
        открыто={открыто}
        наЗакрытие={() => установитьОткрыто(false)}
        заголовок="Форма с автофокусом"
      >
        <input aria-label="Название" autoFocus />
      </Dialog>
    </>
  )
}

function StackedDialogs() {
  const [первое, открытьПервое] = useState(false)
  const [второе, открытьВторое] = useState(false)
  return (
    <>
      <button type="button" onClick={() => открытьПервое(true)}>
        Открыть первый слой
      </button>
      <Dialog
        открыто={первое}
        наЗакрытие={() => открытьПервое(false)}
        заголовок="Первый слой"
      >
        <button type="button" onClick={() => открытьВторое(true)}>
          Открыть второй слой
        </button>
      </Dialog>
      <Dialog
        открыто={второе}
        наЗакрытие={() => открытьВторое(false)}
        заголовок="Второй слой"
      >
        <button type="button">Действие второго слоя</button>
      </Dialog>
    </>
  )
}

describe('Dialog', () => {
  it('позволяет набрать в поле несколько символов подряд', async () => {
    const человек = userEvent.setup()
    render(<DialogWithField />)

    const поле = screen.getByLabelText('Сумма')
    await человек.type(поле, '1500')

    expect(поле).toHaveValue('1500')
  })

  it('не теряет фокус поля при вводе', async () => {
    const человек = userEvent.setup()
    render(<DialogWithField />)

    const поле = screen.getByLabelText('Сумма')
    await человек.type(поле, '42')

    expect(document.activeElement).toBe(поле)
  })

  it('удерживает Tab внутри окна', async () => {
    const человек = userEvent.setup()
    render(<ManagedDialog />)

    await человек.click(screen.getByRole('button', { name: 'Открыть проверку' }))
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Закрыть' })).toHaveFocus(),
    )

    await человек.tab({ shift: true })
    expect(screen.getByRole('button', { name: 'Последнее действие' })).toHaveFocus()

    await человек.tab()
    expect(screen.getByRole('button', { name: 'Закрыть' })).toHaveFocus()
  })

  it('закрывается по Escape и возвращает фокус инициатору', async () => {
    const человек = userEvent.setup()
    render(<ManagedDialog />)

    const инициатор = screen.getByRole('button', { name: 'Открыть проверку' })
    await человек.click(инициатор)
    await человек.click(screen.getByRole('button', { name: 'Первое действие' }))
    await человек.keyboard('{Escape}')

    const панель = screen.getByRole('dialog').querySelector('.dialog-panel')
    expect(панель).not.toBeNull()
    await waitFor(() => expect(панель).toHaveClass('anim-pop-уход'))
    fireEvent.animationEnd(панель!, { animationName: 'pop-уход' })

    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    )
    expect(инициатор).toHaveFocus()
  })

  it('сохраняет autoFocus поля и возвращает фокус кнопке открытия', async () => {
    const человек = userEvent.setup()
    render(<AutoFocusDialog />)

    const инициатор = screen.getByRole('button', { name: 'Открыть форму' })
    await человек.click(инициатор)
    const поле = screen.getByRole('textbox', { name: 'Название' })
    await waitFor(() => expect(поле).toHaveFocus())

    await человек.keyboard('{Escape}')
    const панель = screen.getByRole('dialog').querySelector('.dialog-panel')
    fireEvent.animationEnd(панель!, { animationName: 'pop-уход' })

    await waitFor(() => expect(инициатор).toHaveFocus())
  })

  it('Escape закрывает только верхний модальный слой', async () => {
    const человек = userEvent.setup()
    render(<StackedDialogs />)

    await человек.click(
      screen.getByRole('button', { name: 'Открыть первый слой' }),
    )
    const открытьВторой = await screen.findByRole('button', {
      name: 'Открыть второй слой',
    })
    await человек.click(открытьВторой)
    await screen.findByRole('dialog', { name: 'Второй слой' })

    await человек.keyboard('{Escape}')

    const первый = screen.getByRole('dialog', { name: 'Первый слой' })
    expect(первый.querySelector('.dialog-panel')).not.toHaveClass(
      'anim-pop-уход',
    )
    const второй = screen.getByRole('dialog', { name: 'Второй слой' })
    expect(второй.querySelector('.dialog-panel')).toHaveClass('anim-pop-уход')
  })
})
