import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Входящее } from '@/core/db/types'
import { InboxReviewDialog } from './InboxReviewDialog'

const ЗАПИСИ: Входящее[] = [
  {
    id: 'inbox-1',
    createdAt: '2026-08-20T08:00:00.000Z',
    updatedAt: '2026-08-20T08:00:00.000Z',
    текст: 'Подготовить разговор с партнёром',
    разобрано: false,
    источник: 'быстрая запись',
  },
  {
    id: 'inbox-2',
    createdAt: '2026-08-21T08:00:00.000Z',
    updatedAt: '2026-08-21T08:00:00.000Z',
    текст: 'Сохранить идею для поездки',
    разобрано: false,
    источник: 'быстрая запись',
  },
]

function свойства() {
  return {
    открыто: true,
    записи: ЗАПИСИ,
    наЗакрытие: vi.fn(),
    наЗадачу: vi.fn().mockResolvedValue(undefined),
    наЗаметку: vi.fn().mockResolvedValue(undefined),
    наОтпустить: vi.fn().mockResolvedValue(undefined),
  }
}

describe('InboxReviewDialog', () => {
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

  it('создаёт только подтверждённый и отредактированный следующий шаг', async () => {
    const параметры = свойства()
    const человек = userEvent.setup()
    render(<InboxReviewDialog {...параметры} />)

    expect(screen.queryByRole('button', { name: 'Создать задачу' })).toBeNull()
    await человек.click(screen.getByRole('radio', { name: /Действовать/ }))

    const шаг = screen.getByRole('textbox', {
      name: /Один видимый следующий шаг/,
    })
    await человек.clear(шаг)
    await человек.type(шаг, 'Записать три тезиса для разговора')
    await человек.click(screen.getByRole('button', { name: 'Создать задачу' }))

    expect(параметры.наЗадачу).toHaveBeenCalledWith(
      ЗАПИСИ[0],
      expect.objectContaining({
        название: 'Записать три тезиса для разговора',
        длительностьМинут: 5,
        важность: 'обычная',
        заметка: `Исходная запись: ${ЗАПИСИ[0]!.текст}`,
      }),
    )
  })

  it('пропускает запись без изменения данных и показывает следующую', async () => {
    const параметры = свойства()
    const человек = userEvent.setup()
    render(<InboxReviewDialog {...параметры} />)

    expect(screen.getByText(ЗАПИСИ[0]!.текст)).toBeInTheDocument()
    await человек.click(screen.getByRole('button', { name: 'Пропустить' }))

    expect(screen.getByText(ЗАПИСИ[1]!.текст)).toBeInTheDocument()
    expect(параметры.наЗадачу).not.toHaveBeenCalled()
    expect(параметры.наЗаметку).not.toHaveBeenCalled()
    expect(параметры.наОтпустить).not.toHaveBeenCalled()
  })

  it('сохраняет редактируемый вывод как знание только после подтверждения', async () => {
    const параметры = свойства()
    const человек = userEvent.setup()
    render(<InboxReviewDialog {...параметры} />)

    await человек.click(screen.getByRole('radio', { name: /Сохранить/ }))
    const заголовок = screen.getByRole('textbox', { name: /^Заголовок/ })
    await человек.clear(заголовок)
    await человек.type(заголовок, 'Разговор о совместных планах')
    expect(параметры.наЗаметку).not.toHaveBeenCalled()
    await человек.click(screen.getByRole('button', { name: 'Сохранить в знания' }))

    expect(параметры.наЗаметку).toHaveBeenCalledWith(
      ЗАПИСИ[0],
      expect.objectContaining({
        заголовок: 'Разговор о совместных планах',
        текст: ЗАПИСИ[0]!.текст,
      }),
    )
  })

  it('убирает запись из очереди только после отдельного подтверждения', async () => {
    const параметры = свойства()
    const человек = userEvent.setup()
    render(<InboxReviewDialog {...параметры} />)

    await человек.click(screen.getByRole('radio', { name: /Отпустить/ }))
    expect(параметры.наОтпустить).not.toHaveBeenCalled()
    await человек.click(screen.getByRole('button', { name: 'Убрать из разбора' }))

    expect(параметры.наОтпустить).toHaveBeenCalledWith(ЗАПИСИ[0])
  })
})
