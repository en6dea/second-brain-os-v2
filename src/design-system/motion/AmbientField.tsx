/**
 * Абстрактное приборное свечение в глубине важной поверхности.
 *
 * Здесь нет буквальных значков целей, денег или достижений: они превращали
 * приложение в игровой трекер. Два больших световых поля двигаются едва
 * заметно и создают глубину, не конкурируя с данными.
 *
 * Полное отключение при `prefers-reduced-motion` задано в `index.css`.
 */

export function AmbientField() {
  return (
    <div
      aria-hidden="true"
      className="ambient-field pointer-events-none absolute inset-0 overflow-hidden"
    >
      <span className="ambient-orb ambient-orb-a" />
      <span className="ambient-orb ambient-orb-b" />
      <span className="ambient-arc" />
    </div>
  )
}
