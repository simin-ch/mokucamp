import { emptyBool } from '../utils/queryString'

const FILTERS = [
  { key: 'dogsAllowedBool', label: 'Dogs allowed' },
  { key: 'hasToilets', label: 'Toilets' },
  { key: 'hasWater', label: 'Water' },
  { key: 'hasPower', label: 'Power' },
]

export default function FacilityFilters({ form, onChange }) {
  return (
    <div>
      <span className="mb-2 block text-xs font-medium uppercase tracking-wide text-stone-500">
        Facilities
      </span>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {FILTERS.map(({ key, label }) => (
          <label key={key} className="block">
            <span className="mb-1 block text-xs text-stone-500">{label}</span>
            <select
              value={form[key]}
              onChange={(e) => onChange(key, e.target.value)}
              className="w-full rounded-lg border border-stone-200/90 bg-white/90 px-3 py-2 text-sm outline-none backdrop-blur-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
            >
              <option value={emptyBool}>Any</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </label>
        ))}
      </div>
    </div>
  )
}
