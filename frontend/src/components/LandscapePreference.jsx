import { LANDSCAPE_OPTIONS } from '../utils/queryString'

export default function LandscapePreference({ selected, onChange }) {
  function toggle(value) {
    const next = selected.includes(value)
      ? selected.filter((v) => v !== value)
      : [...selected, value]
    onChange(next)
  }

  return (
    <div>
      <span className="mb-2 block text-xs font-medium uppercase tracking-wide text-stone-500">
        Landscape preference
      </span>
      <div className="flex flex-wrap gap-2">
        {LANDSCAPE_OPTIONS.map(({ value, label }) => {
          const active = selected.includes(value)
          return (
            <button
              key={value}
              type="button"
              onClick={() => toggle(value)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                active
                  ? 'bg-emerald-600 text-white'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {label}
            </button>
          )
        })}
      </div>
      {selected.length === 0 && (
        <p className="mt-1.5 text-xs text-stone-400">No preference — all landscapes included</p>
      )}
    </div>
  )
}
