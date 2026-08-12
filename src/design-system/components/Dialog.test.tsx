import { describe, expect, it } from 'vitest'
import { useState } from 'react'
import { render, screen } from '@testing-library/react'
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
    <Dialog
      открыто
      наЗакрытие={() => установить('')}
      заголовок="Проверка ввода"
    >
      <MoneyInput
        aria-label="Сумма"
        value={значение}
        onChange={установить}
      />
    </Dialog>
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
})
