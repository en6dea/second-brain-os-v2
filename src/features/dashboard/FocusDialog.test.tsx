import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ПунктПлана } from '@/core/db/types'
import { FocusDialog } from './FocusDialog'

const задача: ПунктПлана = {
  id: 'пункт-1',
  вид: 'задача',
  записьId: 'задача-1',
  заголовок: 'Сделать один важный шаг',
  зачем: 'Двигает цель вперёд',
  порядок: 0,
  выполнен: false,
  ожидаемоМинут: 45,
}

describe('FocusDialog', () => {
  it('запускает блок без записи результата и отмечает только отдельной кнопкой', async () => {
    const человек = userEvent.setup()
    const выполнить = vi.fn().mockResolvedValue(undefined)

    render(
      <FocusDialog
        пункт={задача}
        открыто
        выполнен={false}
        наЗакрытие={vi.fn()}
        наВыполнение={выполнить}
        наОткрытиеИсточника={vi.fn()}
      />,
    )

    expect(screen.getByText('45:00')).toBeInTheDocument()
    await человек.click(screen.getByRole('button', { name: 'Начать' }))
    expect(выполнить).not.toHaveBeenCalled()

    await человек.click(screen.getByRole('button', { name: 'Отметить сделанным' }))
    expect(выполнить).toHaveBeenCalledTimes(1)
  })

  it('для пункта без прямой отметки ведёт в источник', async () => {
    const человек = userEvent.setup()
    const открыть = vi.fn()

    render(
      <FocusDialog
        пункт={{ ...задача, вид: 'обязательство' }}
        открыто
        выполнен={false}
        наЗакрытие={vi.fn()}
        наВыполнение={null}
        наОткрытиеИсточника={открыть}
      />,
    )

    await человек.click(screen.getByRole('button', { name: 'Открыть источник' }))
    expect(открыть).toHaveBeenCalledTimes(1)
  })
})
