import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Привычка } from '@/core/db/types'
import { HabitRecoveryDialog } from './HabitRecoveryDialog'

const ПРИВЫЧКА: Привычка = {
  id: 'habit-1',
  createdAt: '2026-08-01T08:00:00.000Z',
  updatedAt: '2026-08-20T08:00:00.000Z',
  название: 'Чтение',
  иконка: '',
  цвет: 'accent',
  частота: 'ежедневно',
  дниНедели: [],
  разВНеделю: null,
  норма: 1,
  единица: 'раз',
  цельId: null,
  сфераId: null,
  активна: true,
  постер: '',
  отметки: {},
}

describe('HabitRecoveryDialog', () => {
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

  it('не сохраняет и не отмечает привычку до явного подтверждения', async () => {
    const подтвердить = vi.fn()
    const человек = userEvent.setup()
    render(
      <HabitRecoveryDialog
        привычка={ПРИВЫЧКА}
        отметокЗаНеделю={0}
        наЗакрытие={vi.fn()}
        наПодтверждение={подтвердить}
      />,
    )

    expect(
      screen.getByRole('button', { name: 'Сохранить план возвращения' }),
    ).toBeDisabled()
    await человек.click(screen.getByRole('button', { name: 'Отмена' }))
    expect(подтвердить).not.toHaveBeenCalled()
  })

  it('передаёт только выбранное препятствие и редактируемый микрошаг', async () => {
    const подтвердить = vi.fn().mockResolvedValue(undefined)
    const человек = userEvent.setup()
    render(
      <HabitRecoveryDialog
        привычка={ПРИВЫЧКА}
        отметокЗаНеделю={2}
        наЗакрытие={vi.fn()}
        наПодтверждение={подтвердить}
      />,
    )

    await человек.click(screen.getByRole('radio', { name: 'Сейчас мало сил' }))
    const поле = screen.getByRole('textbox', { name: /Минимальное возвращение/ })
    await человек.clear(поле)
    await человек.type(поле, 'Прочитать одну страницу')
    await человек.click(
      screen.getByRole('button', { name: 'Сохранить план возвращения' }),
    )

    expect(подтвердить).toHaveBeenCalledWith(
      ПРИВЫЧКА,
      expect.objectContaining({
        причина: 'нет сил',
        роль: 'психолог',
        микрошаг: 'Прочитать одну страницу',
        минут: 2,
      }),
    )
  })
})
