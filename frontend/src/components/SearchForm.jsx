import FacilityFilters from './FacilityFilters'
import LocationSearch from './LocationSearch'

export default function SearchForm({ geocode, form, setForm, loading, onSubmit, onReset }) {
  return (
    <form
      onSubmit={onSubmit}
      className="mb-8 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"
    >
      <div className="space-y-5">
        <LocationSearch
          {...geocode}
          radiusKm={form.radiusKm}
          onRadiusChange={(km) => setForm((s) => ({ ...s, radiusKm: km }))}
        />
        <FacilityFilters
          form={form}
          onChange={(key, val) => setForm((s) => ({ ...s, [key]: val }))}
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
          className="rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
        >
          Reset
        </button>
      </div>
    </form>
  )
}
