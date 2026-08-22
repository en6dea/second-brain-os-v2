import { Check } from 'lucide-react'
import { useОтклик } from '@/design-system/motion/CountUp'
import { Ping } from '@/design-system/motion/Ping'
import { cn } from '@/design-system/classNames'

/**
 * Отметка «сделано» с откликом.
 *
 * Кольцо расходится от отметки только при переходе в «сделано» — снятие
 * отметки не поздравляет вас за откат. Раньше это писалось заново в каждом
 * разделе почти дословно; сюда вынесено, чтобы новые места получали то же
 * поведение одним компонентом, а не копией пятнадцати строк.
 */
export function CheckMark({
  отмечено,
  подпись,
  наПереключение,
  размер = 20,
  disabled = false,
  className,
}: {
  отмечено: boolean
  /** Текст для программ чтения с экрана — что произойдёт по нажатию. */
  подпись: string
  наПереключение: () => void
  /** Сторона квадрата в пикселях. */
  размер?: number
  disabled?: boolean
  className?: string
}) {
  const [отклик, запустить] = useОтклик(900)

  return (
    <Ping активен={отклик} тон="успех" className={className}>
      <button
        type="button"
        disabled={disabled}
        aria-label={подпись}
        aria-pressed={отмечено}
        onClick={() => {
          if (!отмечено) запустить()
          наПереключение()
        }}
        className={cn(
          'group flex h-11 w-11 shrink-0 items-center justify-center rounded-full',
          'transition-transform duration-150 active:scale-90',
          disabled && 'opacity-40',
        )}
      >
        <span
          style={{ width: размер, height: размер }}
          className={cn(
            'flex items-center justify-center rounded-full border transition-[background-color,border-color]',
            отмечено
              ? 'border-transparent bg-good text-white'
              : 'border-line group-hover:border-accent group-hover:bg-accent-soft',
          )}
        >
          {отмечено ? (
            <Check
              size={Math.round(размер * 0.65)}
              className={отклик ? 'прочерк' : undefined}
            />
          ) : null}
        </span>
      </button>
    </Ping>
  )
}
