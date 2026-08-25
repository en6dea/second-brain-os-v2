import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { сегодня } from '@/core/calendar/CalendarRu'
import { DayPlanCard } from './DayPlanCard'

const подмены = vi.hoisted(() => ({
  useLiveQuery: vi.fn(),
  добавитьПлан: vi.fn(),
  сохранитьПлан: vi.fn(),
  сохранитьЗадачу: vi.fn(),
  сохранитьПривычку: vi.fn(),
  найтиПлан: vi.fn(),
  транзакция: vi.fn(),
  получитьПлан: vi.fn(),
  получитьЗадачу: vi.fn(),
  получитьПривычку: vi.fn(),
}))

vi.mock('dexie-react-hooks', () => ({
  useLiveQuery: подмены.useLiveQuery,
}))

vi.mock('@/core/db/db', () => ({
  база: {
    dayPlans: {
      add: подмены.добавитьПлан,
      put: подмены.сохранитьПлан,
      get: подмены.получитьПлан,
      where: () => ({
        equals: () => ({ first: подмены.найтиПлан }),
      }),
    },
    tasks: { get: подмены.получитьЗадачу, put: подмены.сохранитьЗадачу },
    habits: {
      get: подмены.получитьПривычку,
      put: подмены.сохранитьПривычку,
    },
    transaction: подмены.транзакция,
  },
}))

vi.mock('@/core/db/repo', () => ({
  новаяЗапись: (запись: object) => ({
    ...запись,
    id: 'план-дня',
    createdAt: '2026-08-22T09:00:00.000Z',
    updatedAt: '2026-08-22T09:00:00.000Z',
  }),
}))

describe('DayPlanCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    подмены.найтиПлан.mockResolvedValue(undefined)
    подмены.транзакция.mockImplementation(async (...аргументы: unknown[]) =>
      (аргументы.at(-1) as () => Promise<unknown>)(),
    )
    подмены.useLiveQuery.mockReturnValue({
      задачи: [
        {
          id: 'задача-1',
          createdAt: '2026-08-22T09:00:00.000Z',
          updatedAt: '2026-08-22T09:00:00.000Z',
          название: 'Подготовить важный документ',
          заметка: '',
          дата: сегодня(),
          время: null,
          длительностьМинут: 30,
          состояние: 'новая',
          важность: 'высокая',
          проектId: null,
          цельId: null,
          сфераId: null,
          выполненаВ: null,
          переносов: 0,
          повтор: null,
        },
      ],
      цели: [],
      привычки: [],
      обязательства: [],
      входящие: [],
      план: undefined,
    })
  })

  it('не записывает предложенный план до явного подтверждения', async () => {
    const человек = userEvent.setup()
    render(
      <MemoryRouter>
        <DayPlanCard />
      </MemoryRouter>,
    )

    expect(screen.getByText('Настройка дня')).toBeInTheDocument()
    expect(screen.getByText('Подготовить важный документ')).toBeInTheDocument()
    expect(подмены.добавитьПлан).not.toHaveBeenCalled()

    await человек.click(screen.getByRole('button', { name: /Принять план/ }))

    expect(подмены.добавитьПлан).toHaveBeenCalledTimes(1)
    expect(подмены.добавитьПлан).toHaveBeenCalledWith(
      expect.objectContaining({
        чекИн: {
          энергия: 3,
          сонЧасов: null,
          доступноМинут: 180,
        },
        пункты: [expect.objectContaining({ ожидаемоМинут: 30 })],
      }),
    )
  })

  it('блокирует повторное подтверждение, пока план сохраняется', async () => {
    let завершить: (() => void) | undefined
    подмены.добавитьПлан.mockImplementationOnce(
      () =>
        new Promise<void>((решить) => {
          завершить = решить
        }),
    )
    const человек = userEvent.setup()
    render(
      <MemoryRouter>
        <DayPlanCard />
      </MemoryRouter>,
    )

    const кнопка = screen.getByRole('button', { name: /Принять план/ })
    await человек.click(кнопка)
    expect(screen.getByRole('button', { name: 'Сохраняю…' })).toBeDisabled()

    await человек.click(screen.getByRole('button', { name: 'Сохраняю…' }))
    expect(подмены.добавитьПлан).toHaveBeenCalledTimes(1)

    завершить?.()
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Принять план/ })).toBeEnabled(),
    )
  })

  it('не сохраняет снятый с плана пункт', async () => {
    const человек = userEvent.setup()
    render(
      <MemoryRouter>
        <DayPlanCard />
      </MemoryRouter>,
    )

    await человек.click(
      screen.getByRole('button', {
        name: 'Включить «Подготовить важный документ» в план',
      }),
    )

    expect(screen.getByRole('button', { name: /Принять план/ })).toBeDisabled()
    expect(подмены.добавитьПлан).not.toHaveBeenCalled()
  })

  it('не сохраняет невозможное значение сна', async () => {
    const человек = userEvent.setup()
    render(
      <MemoryRouter>
        <DayPlanCard />
      </MemoryRouter>,
    )

    await человек.type(screen.getByPlaceholderText('Например, 7,5'), '25')
    await человек.click(screen.getByRole('button', { name: /Принять план/ }))

    expect(
      screen.getByText('Укажите число от 0 до 24 или оставьте поле пустым'),
    ).toBeInTheDocument()
    expect(подмены.добавитьПлан).not.toHaveBeenCalled()
  })

  it('добавляет чек-ин к прежнему плану, не меняя его пункты', async () => {
    const план = {
      id: 'старый-план',
      createdAt: '2026-08-22T09:00:00.000Z',
      updatedAt: '2026-08-22T09:00:00.000Z',
      день: сегодня(),
      пункты: [
        {
          id: 'пункт-1',
          вид: 'задача' as const,
          записьId: 'задача-1',
          заголовок: 'Подготовить важный документ',
          зачем: 'Задача на сегодня',
          порядок: 0,
          выполнен: false,
          расширениеБудущейВерсии: { сохранить: true },
        },
      ],
    }
    подмены.useLiveQuery.mockReturnValue({
      задачи: [],
      цели: [],
      привычки: [],
      обязательства: [],
      входящие: [],
      план,
    })
    подмены.получитьПлан.mockResolvedValue(план)

    const человек = userEvent.setup()
    render(
      <MemoryRouter>
        <DayPlanCard />
      </MemoryRouter>,
    )

    await человек.click(screen.getByRole('button', { name: 'Настроить' }))
    await человек.click(screen.getByRole('tab', { name: '4' }))
    await человек.type(screen.getByPlaceholderText('Например, 7,5'), '8')
    await человек.selectOptions(
      screen.getByRole('combobox', { name: /Времени на главное/ }),
      '60',
    )
    await человек.click(screen.getByRole('button', { name: 'Сохранить контекст' }))

    expect(подмены.сохранитьПлан).toHaveBeenCalledWith(
      expect.objectContaining({
        id: план.id,
        пункты: план.пункты,
        чекИн: { энергия: 4, сонЧасов: 8, доступноМинут: 60 },
      }),
    )
  })

  it('при отмене выполнения возвращает задаче исходное состояние в транзакции', async () => {
    const задача = {
      id: 'задача-1',
      createdAt: '2026-08-22T09:00:00.000Z',
      updatedAt: '2026-08-22T09:00:00.000Z',
      название: 'Подготовить важный документ',
      заметка: '',
      дата: сегодня(),
      время: null,
      длительностьМинут: 30,
      состояние: 'сделана',
      важность: 'высокая',
      проектId: null,
      цельId: null,
      сфераId: null,
      выполненаВ: '2026-08-22T10:00:00.000Z',
      переносов: 0,
      повтор: null,
    } as const
    const план = {
      id: 'план-дня',
      createdAt: '2026-08-22T09:00:00.000Z',
      updatedAt: '2026-08-22T10:00:00.000Z',
      день: сегодня(),
      пункты: [
        {
          id: 'пункт-1',
          вид: 'задача' as const,
          записьId: задача.id,
          заголовок: задача.название,
          зачем: 'Задача на сегодня',
          порядок: 0,
          выполнен: true,
          состояниеЗадачиДоВыполнения: 'в работе' as const,
          расширениеБудущейВерсии: { ключ: 'не потерять' },
        },
      ],
    }
    подмены.useLiveQuery.mockReturnValue({
      задачи: [задача],
      цели: [],
      привычки: [],
      обязательства: [],
      входящие: [],
      план,
    })
    подмены.получитьПлан.mockResolvedValue(план)
    подмены.получитьЗадачу.mockResolvedValue(задача)

    const человек = userEvent.setup()
    render(
      <MemoryRouter>
        <DayPlanCard />
      </MemoryRouter>,
    )
    await человек.click(
      screen.getByRole('button', {
        name: 'Отметить «Подготовить важный документ» выполненным',
      }),
    )

    expect(подмены.транзакция).toHaveBeenCalled()
    expect(подмены.сохранитьЗадачу).toHaveBeenCalledWith(
      expect.objectContaining({
        id: задача.id,
        состояние: 'в работе',
        выполненаВ: null,
      }),
    )
    expect(подмены.сохранитьПлан).toHaveBeenCalledWith(
      expect.objectContaining({
        пункты: [
          expect.objectContaining({
            выполнен: false,
            расширениеБудущейВерсии: { ключ: 'не потерять' },
          }),
        ],
      }),
    )
  })

  it('не позволяет плану вернуть отменённую задачу в работу', async () => {
    const задача = {
      id: 'задача-1',
      createdAt: '2026-08-22T09:00:00.000Z',
      updatedAt: '2026-08-22T10:00:00.000Z',
      название: 'Отменённая задача',
      заметка: '',
      дата: сегодня(),
      время: null,
      длительностьМинут: 30,
      состояние: 'отменена',
      важность: 'высокая',
      проектId: null,
      цельId: null,
      сфераId: null,
      выполненаВ: null,
      переносов: 0,
      повтор: null,
    } as const
    const план = {
      id: 'план-дня',
      createdAt: '2026-08-22T09:00:00.000Z',
      updatedAt: '2026-08-22T10:00:00.000Z',
      день: сегодня(),
      пункты: [
        {
          id: 'пункт-1',
          вид: 'задача' as const,
          записьId: задача.id,
          заголовок: задача.название,
          зачем: 'Старый пункт плана',
          порядок: 0,
          выполнен: false,
        },
      ],
    }
    подмены.useLiveQuery.mockReturnValue({
      задачи: [задача],
      цели: [],
      привычки: [],
      обязательства: [],
      входящие: [],
      план,
    })
    подмены.получитьПлан.mockResolvedValue(план)
    подмены.получитьЗадачу.mockResolvedValue(задача)

    render(
      <MemoryRouter>
        <DayPlanCard />
      </MemoryRouter>,
    )

    expect(
      screen.getByRole('button', {
        name: 'Отметить «Отменённая задача» выполненным',
      }),
    ).toBeDisabled()
    expect(подмены.транзакция).not.toHaveBeenCalled()
  })

  it('сохраняет подтверждённый микрошаг добавлением и не теряет поля плана', async () => {
    const задача = {
      id: 'задача-1',
      createdAt: '2026-08-22T09:00:00.000Z',
      updatedAt: '2026-08-22T09:00:00.000Z',
      название: 'Подготовить важный документ',
      заметка: '',
      дата: сегодня(),
      время: null,
      длительностьМинут: 30,
      состояние: 'новая',
      важность: 'высокая',
      проектId: null,
      цельId: null,
      сфераId: null,
      выполненаВ: null,
      переносов: 0,
      повтор: null,
    } as const
    const план = {
      id: 'план-дня',
      createdAt: '2026-08-22T09:00:00.000Z',
      updatedAt: '2026-08-22T09:00:00.000Z',
      день: сегодня(),
      пункты: [
        {
          id: 'пункт-1',
          вид: 'задача' as const,
          записьId: задача.id,
          заголовок: задача.название,
          зачем: 'Двигает цель вперёд',
          порядок: 0,
          выполнен: false,
          ожидаемоМинут: 30,
        },
      ],
      расширениеБудущейВерсии: { сохранить: true },
    }
    подмены.useLiveQuery.mockReturnValue({
      задачи: [задача],
      цели: [],
      привычки: [],
      обязательства: [],
      входящие: [],
      план,
    })
    подмены.получитьПлан.mockResolvedValue(план)

    const человек = userEvent.setup()
    render(
      <MemoryRouter>
        <DayPlanCard />
      </MemoryRouter>,
    )

    await человек.click(screen.getByRole('button', { name: 'Фокус' }))
    await человек.click(
      screen.getByRole('button', { name: 'Застрял — помочь начать' }),
    )
    await человек.click(screen.getByRole('button', { name: 'Принять микрошаг' }))

    await waitFor(() => expect(подмены.сохранитьПлан).toHaveBeenCalledTimes(1))
    expect(подмены.сохранитьПлан).toHaveBeenCalledWith(
      expect.objectContaining({
        id: план.id,
        пункты: план.пункты,
        расширениеБудущейВерсии: { сохранить: true },
        коучингСессии: [
          expect.objectContaining({
            пунктId: 'пункт-1',
            записьId: задача.id,
            причина: 'неясно',
            роль: 'бизнес-коуч',
            минут: 10,
          }),
        ],
      }),
    )
  })
})
