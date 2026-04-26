import { useState } from 'react'
import './App.css'
import CampsiteList from './components/CampsiteList'
import CampsiteMap from './components/CampsiteMap'
import RecommendList from './components/RecommendList'
import SearchForm from './components/SearchForm'
import { useCampsites } from './hooks/useCampsites'
import { useGeocode } from './hooks/useGeocode'
import { useMinWidthSm } from './hooks/useMinWidthSm'
import { useRecommend } from './hooks/useRecommend'
import { defaultTripDate, initialForm, PAGE_SIZE } from './utils/queryString'

export default function App() {
  const isMinWidthSm = useMinWidthSm()
  const geocode = useGeocode()
  const { form, setForm, loading, error, setError, result, setResult, mapResult, setMapResult, fetchCampsites } =
    useCampsites()
  const recommend = useRecommend()
  const [listOpen, setListOpen] = useState(true)
  const [mapOpen, setMapOpen] = useState(false)

  const offset = Number(form.offset) || 0
  const total = result?.total ?? 0
  const canPrev = offset > 0
  const canNext = offset + PAGE_SIZE < total

  const showMap = Boolean(mapResult || recommend.result)
  /** Avoid mounting Leaflet inside `display: none` (default collapsed on small screens). */
  const mapShouldMount = showMap && (isMinWidthSm || mapOpen)
  const hasSecondaryContent = Boolean(
    showMap || result || error || recommend.result || recommend.error,
  )
  const searchShellClass = hasSecondaryContent
    ? 'mx-auto max-w-3xl px-6 py-8'
    : 'flex min-h-[calc(100dvh-4.5rem)] flex-col items-center justify-center px-6 py-8'

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
    <div className="min-h-screen bg-fixed bg-cover bg-center bg-no-repeat bg-stone-200 text-stone-900 [background-image:url('/images/backgroundimage.png')]">
      <header className="border-b border-stone-200/80 bg-white/85 backdrop-blur">
        <div className="mx-auto max-w-3xl px-6 py-4">
          <h1 className="text-lg font-semibold tracking-tight">Mokucamp · Find Campsites</h1>
        </div>
      </header>

      <main>
        <div className={searchShellClass}>
          <div className="mx-auto w-full max-w-xl">
            <SearchForm
              geocode={geocode}
              form={form}
              setForm={setForm}
              loading={loading}
              onSubmit={handleSubmit}
              onReset={handleReset}
            />
          </div>
        </div>

        {/* Map — full width; collapsible toggle on small screens only */}
        {showMap && (
          <div className="px-4 pb-6 sm:px-6">
            <button
              type="button"
              aria-expanded={mapOpen}
              aria-controls="campsite-map-panel"
              onClick={() => setMapOpen((v) => !v)}
              className="mb-4 flex w-full items-center justify-between rounded-xl border border-stone-200/90 bg-white/85 px-4 py-2.5 text-sm font-medium text-stone-700 shadow-sm backdrop-blur-sm hover:bg-white/92 sm:hidden"
            >
              <span>Map</span>
              <span className="text-stone-400">{mapOpen ? '▲' : '▼'}</span>
            </button>
            <div
              id="campsite-map-panel"
              className={mapShouldMount ? 'block' : 'hidden sm:block'}
            >
              {mapShouldMount && (
                <CampsiteMap
                  mapResult={mapResult}
                  recommendResult={recommend.result}
                  selectedPlace={geocode.selectedPlace}
                  radiusKm={form.radiusKm}
                />
              )}
            </div>
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
              className="mb-4 flex w-full items-center justify-between rounded-xl border border-stone-200/90 bg-white/85 px-4 py-2.5 text-sm font-medium text-stone-700 shadow-sm backdrop-blur-sm hover:bg-white/92"
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
