import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Цель } from '@/core/db/types'
import { GoalNextMoveDialog } from './GoalNextMoveDialog'

const ЦЕЛЬ: Цель = {
  id: 'цель',
  createdAt: '2026-08-24T08:00:00.000Z',
  updatedAt: '2026-08-24T08:00:00.000Z',
  название: 'Запустить продукт',
  зачем: '',
  сфераId: null,
  состояние: 'активна',
  срок: null,
  цель: null,
  текущее: null,
  единица: '',
  порядок: 0,
  вехи: [
    { id: 'веха', название: 'Проверить гипотезу', срок: null, выполнена: false },
  ],
  последняяАктивность: null,
  постер: '',
}

describe('GoalNextMoveDialog', () => {
  it('создаёт только подтверждённый следующий ход с длительностью', async () => {
    const подтвердить = vi.fn()
    const человек = userEvent.setup()
    render(
      <GoalNextMoveDialog
        цель={ЦЕЛЬ}
        наЗакрытие={vi.fn()}
        наПодтверждение={подтвердить}
      />,
    )

    expect(screen.getByDisplayValue('Проверить гипотезу')).toBeInTheDocument()
    await человек.click(screen.getByRole('button', { name: 'Создать задачу' }))

    expect(подтвердить).toHaveBeenCalledWith(
      expect.objectContaining({
        название: 'Проверить гипотезу',
        длительностьМинут: 25,
        важность: 'обычная',
      }),
    )
  })

  it('отмена не создаёт задачу', async () => {
    const подтвердить = vi.fn()
    const закрыть = vi.fn()
    const человек = userEvent.setup()
    render(
      <GoalNextMoveDialog
        цель={ЦЕЛЬ}
        наЗакрытие={закрыть}
        наПодтверждение={подтвердить}
      />,
    )

    await человек.click(screen.getByRole('button', { name: 'Отмена' }))
    expect(закрыть).toHaveBeenCalled()
    expect(подтвердить).not.toHaveBeenCalled()
  })

  it('не принимает невозможную длительность', async () => {
    const подтвердить = vi.fn()
    const человек = userEvent.setup()
    render(
      <GoalNextMoveDialog
        цель={ЦЕЛЬ}
        наЗакрытие={vi.fn()}
        наПодтверждение={подтвердить}
      />,
    )

    const минуты = screen.getByRole('spinbutton', { name: /Минут/ })
    await человек.clear(минуты)
    await человек.type(минуты, '900')
    await человек.click(screen.getByRole('button', { name: 'Создать задачу' }))

    expect(
      screen.getByText('Укажите от 5 до 480 минут или оставьте поле пустым'),
    ).toBeInTheDocument()
    expect(подтвердить).not.toHaveBeenCalled()
  })
})
