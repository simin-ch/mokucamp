import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import CampsiteMap from '../components/CampsiteMap'
import LoginModal from '../components/LoginModal'
import SearchForm from '../components/SearchForm'
import ShortlistDropdown from '../components/ShortlistDropdown'
import { useAuth } from '../hooks/useAuth'
import { useCampsites } from '../hooks/useCampsites'
import { useGeocode } from '../hooks/useGeocode'
import { useMinWidthSm } from '../hooks/useMinWidthSm'
import { useRecommend } from '../hooks/useRecommend'
import { useShortlist } from '../hooks/useShortlist'
import { apiUrl } from '../utils/apiUrl'
import { defaultTripDate, initialForm } from '../utils/queryString'

export default function HomePage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [loginOpen, setLoginOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const isMinWidthSm = useMinWidthSm()
  const geocode = useGeocode()
  const { form, setForm, loading, setError, result, setResult, mapResult, setMapResult, fetchCampsites } =
    useCampsites()
  const recommend = useRecommend()
  const shortlist = useShortlist()
  const [activeTab, setActiveTab] = useState('filter')
  const [shortlistOpen, setShortlistOpen] = useState(false)

  // Campsite to focus/fly-to when navigating back from profile
  const [focusCampsite, setFocusCampsite] = useState(null)
  /** Bumped on search/reset so the map clears nearby hiking tracks. */
  const [mapSearchEpoch, setMapSearchEpoch] = useState(0)

  useEffect(() => {
    const { focusCampsiteId } = location.state ?? {}
    if (!focusCampsiteId) return

    fetch(apiUrl(`/api/campsites/${focusCampsiteId}`))
      .then((r) => r.ok ? r.json() : null)
      .then((campsite) => {
        if (campsite) {
          setFocusCampsite(campsite)
          setActiveTab('map')
        }
      })
      .catch(() => {})

    // Clear state so a page refresh doesn't re-trigger
    window.history.replaceState({}, '')
  }, [location.state])

  /** Mount Leaflet on desktop always; on mobile only when the Map tab is visible. */
  const mapShouldMount = isMinWidthSm || activeTab === 'map'

  function handleSubmit(e) {
    e.preventDefault()
    const next = { ...form, offset: '0' }
    setForm(next)
    setMapSearchEpoch((n) => n + 1)
    fetchCampsites(next, geocode.selectedPlace)
    recommend.fetchRecommendations(next, geocode.selectedPlace)
    setActiveTab('map')
  }

  function handleReset() {
    setForm({ ...initialForm, date: defaultTripDate() })
    setResult(null)
    setError(null)
    setMapResult(null)
    setMapSearchEpoch((n) => n + 1)
    recommend.clearResult()
    geocode.clearLocation()
  }

  const shortlistProps = {
    onToggleShortlist: shortlist.toggle,
    isShortlisted: shortlist.isShortlisted,
  }

  return (
    <div className="flex h-screen flex-col bg-fixed bg-cover bg-center bg-no-repeat bg-stone-200 text-stone-900 [background-image:url('/images/backgroundimage.png')]">
      {/* Header */}
      <header className="relative z-[1001] shrink-0 border-b border-stone-200/80 bg-white/85 backdrop-blur">
        <div className="flex items-center justify-between px-5 py-3.5">
          <h1 className="text-lg font-semibold tracking-tight sm:text-xl">MōkuCamp · Find Campsites in New Zealand</h1>
          <div className="flex items-center gap-2">
            {/* Auth button */}
            {user ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setMenuOpen((v) => !v)}
                  className="flex items-center gap-1.5 rounded-lg border border-stone-200/90 bg-white/60 px-3 py-1.5 text-sm font-medium text-stone-600 transition-colors hover:bg-white/90 hover:text-stone-800"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-emerald-600" viewBox="0 0 24 24" fill="currentColor">
                    <path fillRule="evenodd" d="M18.685 19.097A9.723 9.723 0 0 0 21.75 12c0-5.385-4.365-9.75-9.75-9.75S2.25 6.615 2.25 12a9.723 9.723 0 0 0 3.065 7.097A9.716 9.716 0 0 0 12 21.75a9.716 9.716 0 0 0 6.685-2.653Zm-12.54-1.285A7.486 7.486 0 0 1 12 15a7.486 7.486 0 0 1 5.855 2.812A8.224 8.224 0 0 1 12 20.25a8.224 8.224 0 0 1-5.855-2.438ZM15.75 9a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" clipRule="evenodd" />
                  </svg>
                  <span className="hidden max-w-[120px] truncate sm:inline">
                    {user.username || user.email}
                  </span>
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-3 w-3 transition-transform ${menuOpen ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {/* Dropdown */}
                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-[9998]" onClick={() => setMenuOpen(false)} />
                    <div className="absolute right-0 top-full z-[9999] mt-1.5 w-48 rounded-xl border border-stone-200 bg-white py-1 shadow-lg">
                      <p className="truncate px-3 py-2 text-xs text-stone-400">{user.email}</p>
                      <hr className="border-stone-100" />
                      <button
                        type="button"
                        onClick={() => { setMenuOpen(false); navigate('/profile') }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-stone-700 hover:bg-stone-50"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-stone-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                        My profile
                      </button>
                      <button
                        type="button"
                        onClick={() => { setMenuOpen(false); logout() }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                          <polyline points="16 17 21 12 16 7" />
                          <line x1="21" y1="12" x2="9" y2="12" />
                        </svg>
                        Log out
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setLoginOpen(true)}
                className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50/80 px-3 py-1.5 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-100"
              >
                Log in
              </button>
            )}

            {/* Shortlist button + dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShortlistOpen((v) => !v)}
                className="flex items-center gap-2 rounded-lg border border-stone-200/90 bg-white/60 px-3 py-1.5 text-sm font-medium text-stone-600 transition-colors hover:bg-white/90 hover:text-stone-800"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={shortlist.items.length > 0 ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`h-4 w-4 ${shortlist.items.length > 0 ? 'text-violet-500' : ''}`}>
                  <path d="M6 2a2 2 0 0 0-2 2v18l8-4 8 4V4a2 2 0 0 0-2-2H6Z" />
                </svg>
                <span>Shortlist</span>
                {shortlist.items.length > 0 && (
                  <span className="rounded-full bg-violet-100 px-1.5 py-0.5 text-xs font-semibold text-violet-700">
                    {shortlist.items.length}
                  </span>
                )}
              </button>

              <ShortlistDropdown
                open={shortlistOpen}
                onClose={() => setShortlistOpen(false)}
                items={shortlist.items}
                onToggleShortlist={shortlist.toggle}
                onClear={shortlist.clear}
                onLocate={(campsite) => {
                  setFocusCampsite(campsite)
                  setActiveTab('map')
                  setShortlistOpen(false)
                }}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Mobile tab bar */}
      <div className="shrink-0 flex border-b border-stone-200/80 bg-white/90 backdrop-blur sm:hidden">
        <button
          type="button"
          onClick={() => setActiveTab('filter')}
          className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
            activeTab === 'filter'
              ? 'border-b-2 border-emerald-600 text-emerald-700'
              : 'text-stone-500 hover:text-stone-700'
          }`}
        >
          Filter
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('map')}
          className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
            activeTab === 'map'
              ? 'border-b-2 border-emerald-600 text-emerald-700'
              : 'text-stone-500 hover:text-stone-700'
          }`}
        >
          Map
        </button>
      </div>

      {/* Main content: panel + map */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel */}
        <aside
          className={`overflow-y-auto border-r border-stone-200/80 bg-white/85 backdrop-blur-sm sm:w-80 sm:shrink-0 ${
            activeTab === 'map' ? 'hidden sm:flex sm:flex-col' : 'flex w-full flex-col'
          }`}
        >
          <div className="p-5">
            <SearchForm
              geocode={geocode}
              form={form}
              setForm={setForm}
              loading={loading}
              searchResult={result}
              onSubmit={handleSubmit}
              onReset={handleReset}
            />
          </div>
        </aside>

        {/* Map area */}
        <div
          className={`overflow-hidden sm:flex-1 ${
            activeTab === 'filter' ? 'hidden sm:block' : 'flex flex-1'
          }`}
        >
          {mapShouldMount && (
            <CampsiteMap
              mapResult={mapResult}
              recommendResult={recommend.result}
              selectedPlace={geocode.selectedPlace}
              radiusKm={form.radiusKm}
              shortlistItems={shortlist.items}
              tripDate={form.date}
              focusCampsite={focusCampsite}
              mapSearchEpoch={mapSearchEpoch}
              onFocusConsumed={() => setFocusCampsite(null)}
              {...shortlistProps}
            />
          )}
        </div>
      </div>

      <footer className="shrink-0 border-t border-stone-200/80 bg-white/85 px-5 py-2.5 text-center text-xs text-stone-500 backdrop-blur">
        <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
          <span>© {new Date().getFullYear()} MōkuCamp · Find campsites in New Zealand</span>
          <span className="text-stone-300" aria-hidden>
            ·
          </span>
          <span>
            Contact:{' '}
            <a
              href="mailto:simincheng6@gmail.com"
              className="font-medium text-emerald-700 underline-offset-2 hover:underline"
            >
              simincheng6@gmail.com
            </a>
          </span>
        </p>
      </footer>

      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </div>
  )
}
