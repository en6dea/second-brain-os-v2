import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Card, Skeleton } from '@/design-system/components'
import { useИнтерфейс, type ВидБыстрогоДобавления } from '@/app/providers/ui'

const ВИДЫ: Record<string, ВидБыстрогоДобавления> = {
  task: 'задача',
  note: 'заметка',
}

/**
 * Точка входа из ярлыка PWA или Apple «Команды». Данные из адреса не пишет:
 * она только открывает нужную форму, а сохранение остаётся отдельной кнопкой.
 */
export function CaptureLauncherPage() {
  const { kind = 'task' } = useParams<{ kind?: string }>()
  const открыть = useИнтерфейс((с) => с.открытьБыстроеДобавление)
  const перейти = useNavigate()

  useEffect(() => {
    открыть(true, ВИДЫ[kind] ?? 'задача')
    перейти('/', { replace: true })
  }, [kind, открыть, перейти])

  return (
    <Card className="mx-auto max-w-xl p-5" aria-label="Открываю быстрый ввод">
      <Skeleton строк={2} />
    </Card>
  )
}
