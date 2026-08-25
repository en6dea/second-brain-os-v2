import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Цель } from '@/core/db/types'
import { GoalReflectionDialog } from './GoalReflectionDialog'

const ЦЕЛЬ: Цель = {
  id: 'цель',
  createdAt: '2026-08-24T08:00:00.000Z',
  updatedAt: '2026-08-24T08:00:00.000Z',
  название: 'Запустить продукт',
  зачем: '',
  сфераId: null,
  состояние: 'активна',
  срок: null,
  цель: 100,
  текущее: 10,
  единица: 'клиентов',
  порядок: 0,
  вехи: [],
  последняяАктивность: null,
  постер: '',
}

describe('GoalReflectionDialog', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    )
  })

  it('ничего не сохраняет до явного выбора и подтверждения', async () => {
    const подтвердить = vi.fn()
    const человек = userEvent.setup()
    render(
      <GoalReflectionDialog
        цель={ЦЕЛЬ}
        задачи={[]}
        наЗакрытие={vi.fn()}
        наПодтверждение={подтвердить}
      />,
    )

    expect(
      screen.getByRole('button', { name: 'Сохранить рефлексию' }),
    ).toBeDisabled()
    await человек.click(screen.getByRole('button', { name: 'Отмена' }))
    expect(подтвердить).not.toHaveBeenCalled()
  })

  it('передаёт факт и решение, но только готовит отдельное создание задачи', async () => {
    const подтвердить = vi.fn()
    const человек = userEvent.setup()
    render(
      <GoalReflectionDialog
        цель={ЦЕЛЬ}
        задачи={[]}
        наЗакрытие={vi.fn()}
        наПодтверждение={подтвердить}
      />,
    )

    await человек.click(screen.getByRole('radio', { name: /Застряла/ }))
    const шаг = screen.getByRole('textbox', { name: /Решение на неделю/ })
    await человек.type(шаг, 'Провести три интервью')
    await человек.click(
      screen.getByRole('button', { name: 'Подготовить задачу после сохранения' }),
    )
    await человек.click(screen.getByRole('button', { name: 'Сохранить рефлексию' }))

    expect(подтвердить).toHaveBeenCalledWith(
      expect.objectContaining({
        подготовитьЗадачу: true,
        черновик: expect.objectContaining({
          пульс: 'застряла',
          следующийШаг: 'Провести три интервью',
          значение: 10,
        }),
      }),
    )
  })
})
