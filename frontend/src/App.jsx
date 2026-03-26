import './App.css'
import CampsiteList from './components/CampsiteList'
import SearchForm from './components/SearchForm'
import { useCampsites } from './hooks/useCampsites'
import { useGeocode } from './hooks/useGeocode'
import { initialForm, PAGE_SIZE } from './utils/queryString'

export default function App() {
  const geocode = useGeocode()
  const { form, setForm, loading, error, setError, result, setResult, fetchCampsites } =
    useCampsites()

  const offset = Number(form.offset) || 0
  const total = result?.total ?? 0
  const canPrev = offset > 0
  const canNext = offset + PAGE_SIZE < total

  function handleSubmit(e) {
    e.preventDefault()
    const next = { ...form, offset: '0' }
    setForm(next)
    fetchCampsites(next, geocode.selectedPlace)
  }

  function handleReset() {
    setForm(initialForm)
    setResult(null)
    setError(null)
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

      <main className="mx-auto max-w-3xl px-6 py-8">
        <SearchForm
          geocode={geocode}
          form={form}
          setForm={setForm}
          loading={loading}
          onSubmit={handleSubmit}
          onReset={handleReset}
        />
        <CampsiteList
          result={result}
          error={error}
          loading={loading}
          offset={offset}
          canPrev={canPrev}
          canNext={canNext}
          onPrev={() => pageDelta(-PAGE_SIZE)}
          onNext={() => pageDelta(PAGE_SIZE)}
        />
      </main>
    </div>
  )
}
