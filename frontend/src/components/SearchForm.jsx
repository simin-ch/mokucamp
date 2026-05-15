import ActivityPreference from './ActivityPreference'
import FacilityFilters from './FacilityFilters'
import LandscapePreference from './LandscapePreference'
import LocationSearch from './LocationSearch'
import { SEARCH_FIELD_CONTROL_MT, SEARCH_FIELD_LABEL } from './searchFormStyles'
import { formatLocalDate, maxTripDate } from '../utils/queryString'

export default function SearchForm({ geocode, form, setForm, loading, onSubmit, onReset, searchResult }) {
  const showNoResults = searchResult != null && searchResult.total === 0
  const minDate = formatLocalDate(new Date())
  const maxDate = maxTripDate()

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <label htmlFor="trip-date" className={SEARCH_FIELD_LABEL}>
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
          className={`${SEARCH_FIELD_CONTROL_MT} max-w-xs`}
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
        selected={form.facilities ?? []}
        onChange={(val) => setForm((s) => ({ ...s, facilities: val }))}
      />

      <LandscapePreference
        selected={form.landscapes ?? []}
        onChange={(val) => setForm((s) => ({ ...s, landscapes: val }))}
      />

      <ActivityPreference
        selected={form.activities ?? []}
        onChange={(val) => setForm((s) => ({ ...s, activities: val }))}
      />

      {showNoResults && (
        <p
          role="status"
          className="rounded-lg border border-amber-200/90 bg-amber-50/90 px-3 py-2.5 text-sm text-amber-900"
        >
          No campsites match your search — try adjusting your filters.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3 pt-1">
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
