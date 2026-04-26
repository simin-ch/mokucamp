import FacilityFilters from './FacilityFilters'
import LandscapePreference from './LandscapePreference'
import LocationSearch from './LocationSearch'
import { formatLocalDate, maxTripDate } from '../utils/queryString'

export default function SearchForm({ geocode, form, setForm, loading, onSubmit, onReset }) {
  const minDate = formatLocalDate(new Date())
  const maxDate = maxTripDate()

  return (
    <form
      onSubmit={onSubmit}
      className="mb-8 rounded-2xl border border-stone-200/90 bg-white/85 p-5 shadow-sm backdrop-blur-sm"
    >
      <div className="space-y-5">
        <div>
          <label
            htmlFor="trip-date"
            className="block text-sm font-medium text-stone-700"
          >
            Trip date
          </label>
          <input
            id="trip-date"
            type="date"
            name="date"
            required
            value={form.date ?? ''}
            min={minDate}
            max={maxDate}
            onChange={(e) => setForm((s) => ({ ...s, date: e.target.value }))}
            className="mt-1.5 w-full max-w-xs rounded-lg border border-stone-200/90 bg-white/90 px-3 py-2 text-sm text-stone-900 shadow-sm backdrop-blur-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          />
          <p className="mt-1 text-xs text-stone-500">
            Weather forecast is loaded for the selected day (today through the next 10 days).
          </p>
        </div>
        <LocationSearch
          {...geocode}
          radiusKm={form.radiusKm}
          onRadiusChange={(km) => setForm((s) => ({ ...s, radiusKm: km }))}
        />
        <FacilityFilters
          form={form}
          onChange={(key, val) => setForm((s) => ({ ...s, [key]: val }))}
        />
        <LandscapePreference
          selected={form.landscapes ?? []}
          onChange={(val) => setForm((s) => ({ ...s, landscapes: val }))}
        />
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
        >
          {loading ? 'Searching…' : 'Search'}
        </button>
        <button
          type="button"
          onClick={onReset}
          className="rounded-lg border border-stone-200/90 bg-white/75 px-4 py-2 text-sm font-medium text-stone-700 backdrop-blur-sm hover:bg-white/90"
        >
          Reset
        </button>
      </div>
    </form>
  )
}
