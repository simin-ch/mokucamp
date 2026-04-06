import { useState } from 'react'
import './App.css'
import CampsiteList from './components/CampsiteList'
import CampsiteMap from './components/CampsiteMap'
import RecommendList from './components/RecommendList'
import SearchForm from './components/SearchForm'
import { useCampsites } from './hooks/useCampsites'
import { useGeocode } from './hooks/useGeocode'
import { useRecommend } from './hooks/useRecommend'
import { defaultTripDate, initialForm, PAGE_SIZE } from './utils/queryString'

export default function App() {
  const geocode = useGeocode()
  const { form, setForm, loading, error, setError, result, setResult, mapResult, setMapResult, fetchCampsites } =
    useCampsites()
  const recommend = useRecommend()
  const [listOpen, setListOpen] = useState(true)

  const offset = Number(form.offset) || 0
  const total = result?.total ?? 0
  const canPrev = offset > 0
  const canNext = offset + PAGE_SIZE < total

  const showMap = Boolean(mapResult || recommend.result)

  function handleSubmit(e) {
    e.preventDefault()
    const next = { ...form, offset: '0' }
    setForm(next)
    fetchCampsites(next, geocode.selectedPlace)
    recommend.fetchRecommendations(next, geocode.selectedPlace)
  }

  function handleReset() {
    setForm({ ...initialForm, date: defaultTripDate() })
    setResult(null)
    setError(null)
    setMapResult(null)
    recommend.clearResult()
    geocode.clearLocation()
  }

  function pageDelta(delta) {
    const newOffset = Math.max(0, offset + delta)
    const next = { ...form, offset: String(newOffset) }
    setForm(next)
    fetchCampsites(next, geocode.selectedPlace)
  }

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900">
      <header className="border-b border-stone-200 bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-3xl px-6 py-4">
          <h1 className="text-lg font-semibold tracking-tight">Mokucamp · Find Campsites</h1>
        </div>
      </header>

      <main>
        {/* Search form — centred narrow column */}
        <div className="mx-auto max-w-3xl px-6 py-8">
          <SearchForm
            geocode={geocode}
            form={form}
            setForm={setForm}
            loading={loading}
            onSubmit={handleSubmit}
            onReset={handleReset}
          />
        </div>

        {/* Map — full width, shown once there are results */}
        {showMap && (
          <div className="px-4 pb-6 sm:px-6">
            <CampsiteMap
              mapResult={mapResult}
              recommendResult={recommend.result}
              selectedPlace={geocode.selectedPlace}
              radiusKm={form.radiusKm}
            />
          </div>
        )}

        {/* Top Picks list — below the map */}
        {(recommend.result || recommend.error || recommend.loading) && (
          <div className="mx-auto max-w-3xl px-6 pb-2">
            <RecommendList
              result={recommend.result}
              error={recommend.error}
              loading={recommend.loading}
              tripDate={form.date}
              onClear={recommend.clearResult}
            />
          </div>
        )}

        {/* Campsite list — collapsible, centred */}
        {(result || loading || error) && (
          <div className="mx-auto max-w-3xl px-6 pb-12">
            <button
              type="button"
              onClick={() => setListOpen((v) => !v)}
              className="mb-4 flex w-full items-center justify-between rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-medium text-stone-700 shadow-sm hover:bg-stone-50"
            >
              <span>
                {result
                  ? `All results · ${total} campsite${total !== 1 ? 's' : ''}`
                  : loading
                  ? 'Loading…'
                  : 'Results'}
              </span>
              <span className="text-stone-400">{listOpen ? '▲' : '▼'}</span>
            </button>
            {listOpen && (
              <CampsiteList
                result={result}
                error={error}
                loading={loading}
                offset={offset}
                canPrev={canPrev}
                canNext={canNext}
                onPrev={() => pageDelta(-PAGE_SIZE)}
                onNext={() => pageDelta(PAGE_SIZE)}
                tripDate={form.date}
              />
            )}
          </div>
        )}
      </main>
    </div>
  )
}
