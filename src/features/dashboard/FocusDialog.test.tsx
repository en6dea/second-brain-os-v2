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

  it('превращает выбранную причину ступора в подтверждённый микрошаг', async () => {
    const человек = userEvent.setup()
    const сохранить = vi.fn().mockResolvedValue(undefined)
    const выполнить = vi.fn().mockResolvedValue(undefined)

    render(
      <FocusDialog
        пункт={задача}
        открыто
        выполнен={false}
        наЗакрытие={vi.fn()}
        наВыполнение={выполнить}
        наОткрытиеИсточника={vi.fn()}
        наСохранениеМикрошага={сохранить}
      />,
    )

    await человек.click(
      screen.getByRole('button', { name: 'Застрял — помочь начать' }),
    )
    await человек.click(
      screen.getByRole('radio', { name: 'Страшно сделать плохо' }),
    )

    expect(screen.getByText('Режим: психолог')).toBeInTheDocument()
    const поле = screen.getByRole('textbox', { name: 'Первый видимый шаг' })
    await человек.clear(поле)
    await человек.type(поле, 'Набросать первые три тезиса')
    await человек.click(screen.getByRole('button', { name: 'Принять микрошаг' }))

    expect(сохранить).toHaveBeenCalledWith({
      причина: 'страшно ошибиться',
      роль: 'психолог',
      микрошаг: 'Набросать первые три тезиса',
      минут: 10,
    })
    expect(screen.getByText('Набросать первые три тезиса')).toBeInTheDocument()
    expect(screen.getByText('10:00')).toBeInTheDocument()
    expect(выполнить).not.toHaveBeenCalled()
  })

  it('при ошибке сохранения не подменяет исходное действие микрошагом', async () => {
    const человек = userEvent.setup()

    render(
      <FocusDialog
        пункт={задача}
        открыто
        выполнен={false}
        наЗакрытие={vi.fn()}
        наВыполнение={null}
        наОткрытиеИсточника={vi.fn()}
        наСохранениеМикрошага={vi.fn().mockRejectedValue(new Error('storage'))}
      />,
    )

    await человек.click(
      screen.getByRole('button', { name: 'Застрял — помочь начать' }),
    )
    await человек.click(screen.getByRole('button', { name: 'Принять микрошаг' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Ваш план не изменён',
    )
    expect(screen.getByText(задача.заголовок)).toBeInTheDocument()
    expect(screen.getByText('45:00')).toBeInTheDocument()
  })
})
