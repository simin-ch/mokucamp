import { useEffect, useState } from 'react'
import { formatTripDateLabel } from '../utils/formatTripDate'
import {
  hasWalkingAndTramping,
  NEARBY_TRACKS_LIMIT,
  NEARBY_TRACKS_RADIUS_KM,
} from '../utils/nearbyTracks'
import { summarizeForecast } from '../utils/weatherSummary'
import ReviewsTab from './ReviewsTab'

const API_BASE = import.meta.env.VITE_API_URL ?? ''

const ACCESS_ICONS = {
  'Car': '🚗',
  'Campervan': '🚐',
  'Caravan': '🏕️',
  'Walk-in': '🥾',
  'Walk': '🥾',
  'Boat': '⛵',
  'Helicopter': '🚁',
  'Bicycle': '🚴',
  '4WD': '🚙',
}

const ACTIVITY_ICONS = {
  'Mountain biking': '🚵',
  'Swimming': '🏊',
  'Walking and tramping': '🥾',
  'Fishing': '🎣',
  'Kayaking and canoeing': '🛶',
  'Picnicking': '🧺',
  'Rock climbing': '🧗',
  'Hunting': '🏹',
  'Horse trekking': '🐴',
  'Skiing': '⛷️',
  'Sightseeing': '👁️',
  'Stargazing': '🌟',
  'Cycling': '🚴',
}

function stripHtml(str) {
  if (!str) return ''
  return str
    .replace(/<[^>]*>/g, '')
    .replace(/<[^>]*$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function parseList(str) {
  if (!str) return []
  return str.split(',').map((s) => s.trim()).filter(Boolean)
}

/** When both generic "Toilets" and "Toilets - non-flush" appear, keep only the specific line. */
function dedupeToiletFacilities(items) {
  const norm = (s) => s.trim().toLowerCase().replace(/\s+/g, ' ')
  const hasNonFlush = items.some((s) => norm(s) === 'toilets - non-flush')
  if (!hasNonFlush) return items
  return items.filter((s) => norm(s) !== 'toilets')
}

const MERGED_WATER_TAP_BOIL = 'Water from tap - not treated, boil before use'
const MERGED_WATER_TAP_TREATED_SUITABLE = 'Water from tap - treated, suitable for drinking'

/** Join adjacent tap-water + boil note into one facility line. */
function mergeWaterTapBoilAdjacent(items) {
  const norm = (s) => s.trim().toLowerCase().replace(/\s+/g, ' ')
  const out = []
  for (let i = 0; i < items.length; i++) {
    const cur = items[i]
    const next = items[i + 1]
    if (
      next !== undefined &&
      norm(cur) === 'water from tap - not treated' &&
      norm(next) === 'boil before use'
    ) {
      out.push(MERGED_WATER_TAP_BOIL)
      i++
    } else if (
      next !== undefined &&
      norm(cur) === 'water from tap - treated' &&
      norm(next) === 'suitable for drinking'
    ) {
      out.push(MERGED_WATER_TAP_TREATED_SUITABLE)
      i++
    } else {
      out.push(cur)
    }
  }
  return out
}

function labelTone(label) {
  if (label === 'Good') return 'bg-emerald-100 text-emerald-900'
  if (label === 'Fair') return 'bg-amber-100 text-amber-900'
  return 'bg-stone-200 text-stone-800'
}

function BookmarkIcon({ filled }) {
  return filled ? (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
      <path d="M6 2a2 2 0 0 0-2 2v18l8-4 8 4V4a2 2 0 0 0-2-2H6Z" />
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M6 2a2 2 0 0 0-2 2v18l8-4 8 4V4a2 2 0 0 0-2-2H6Z" />
    </svg>
  )
}

function Section({ title, children }) {
  return (
    <div className="border-t border-stone-100 px-5 py-4">
      <h3 className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-stone-400">{title}</h3>
      {children}
    </div>
  )
}

const TABS = [
  { id: 'info', label: 'Info' },
  { id: 'reviews', label: 'Reviews' },
]

export default function CampsiteDetailDrawer({
  campsite: c,
  tripDate,
  onClose,
  onToggleShortlist,
  isShortlisted,
  nearbyTrails,
  onShowNearbyTrails,
  onHideNearbyTrails,
}) {
  const open = Boolean(c)
  const shortlisted = c ? isShortlisted?.(c.id) : false

  const [activeTab, setActiveTab] = useState('info')
  const [detailWeather, setDetailWeather] = useState(null)
  const [detailWeatherLoading, setDetailWeatherLoading] = useState(false)
  const [detailWeatherError, setDetailWeatherError] = useState(false)

  // Reset tab whenever a different campsite is opened
  useEffect(() => {
    if (c) setActiveTab('info')
  }, [c?.id])

  useEffect(() => {
    if (!c || !tripDate) {
      setDetailWeather(null)
      setDetailWeatherLoading(false)
      setDetailWeatherError(false)
      return
    }
    const ac = new AbortController()
    setDetailWeather(null)
    setDetailWeatherLoading(true)
    setDetailWeatherError(false)
    const qs = new URLSearchParams({
      lat: String(c.lat),
      lon: String(c.lon),
      date: tripDate,
    })
    fetch(`${API_BASE}/api/forecast?${qs}`, { signal: ac.signal })
      .then(async (res) => {
        const json = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(json.message || `HTTP ${res.status}`)
        setDetailWeather(json.data ?? null)
      })
      .catch((err) => {
        if (err.name === 'AbortError') return
        setDetailWeather(null)
        setDetailWeatherError(true)
      })
      .finally(() => {
        if (!ac.signal.aborted) setDetailWeatherLoading(false)
      })
    return () => ac.abort()
  }, [c?.id, c?.lat, c?.lon, tripDate])

  const summary = detailWeather ? summarizeForecast(detailWeather) : null
  const dateLine = formatTripDateLabel(tripDate)

  const accessItems = parseList(c?.access)
  const activityItems = parseList(c?.activities)
  const facilityItems = mergeWaterTapBoilAdjacent(dedupeToiletFacilities(parseList(c?.facilities)))
  const dogsText = stripHtml(c?.dogsAllowed)
  const showNearbyTracks = hasWalkingAndTramping(c?.activities)
  const trailsForCampsite = nearbyTrails?.campsiteId === c?.id ? nearbyTrails : null
  const trailsLoading = trailsForCampsite?.loading ?? false
  const trailsActive =
    trailsForCampsite &&
    !trailsLoading &&
    (trailsForCampsite.trails?.length > 0 || trailsForCampsite.empty)

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-[1999] bg-black/30 backdrop-blur-[1px]"
          onClick={onClose}
        />
      )}

      {/* Drawer panel */}
      <div
        className={`fixed inset-y-0 right-0 z-[2000] flex w-full max-w-md flex-col bg-white shadow-2xl transition-transform duration-300 ease-in-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {!c ? null : (
          <>
            {/* Header bar with close button */}
            <div className="flex shrink-0 items-center justify-between border-b border-stone-100 px-4 py-3">
              <div className="min-w-0 flex-1 pr-2">
                <p className="truncate text-sm font-semibold text-stone-900">{c.name}</p>
                {(c.place || c.region) && (
                  <p className="truncate text-xs text-stone-400">
                    {[c.place, c.region].filter(Boolean).join(' · ')}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-stone-100 text-stone-500 transition-colors hover:bg-stone-200 hover:text-stone-700"
                aria-label="Close"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Tab bar — shrink-0, sits directly under hero, never scrolls */}
            <div className="flex shrink-0 border-b border-stone-200 bg-white">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 py-3 text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'border-b-2 border-emerald-600 text-emerald-700'
                      : 'text-stone-500 hover:text-stone-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Scrollable content area — only this region scrolls */}
            <div className="flex-1 overflow-y-auto">

              {/* ── Info Tab ─────────────────────────────────────── */}
              {activeTab === 'info' && (
                <div>
                  {/* Badges + shortlist button */}
                  <div className="px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                    {/* Badges */}
                    <div className="flex flex-wrap gap-1.5">
                      {c.campsiteCategory && (
                        <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-700">
                          {c.campsiteCategory}
                        </span>
                      )}
                      {c.bookable && (
                        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                          Bookable
                        </span>
                      )}
                      {c.distanceKm != null && (
                        <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-medium text-sky-800">
                          {c.distanceKm < 1 ? `${Math.round(c.distanceKm * 1000)} m` : `${c.distanceKm} km`}
                        </span>
                      )}
                      {c.landscape && c.landscape.split(',').map((l) => (
                        <span key={l} className="rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-medium text-teal-700">
                          {l.trim()}
                        </span>
                      ))}
                    </div>
                    {onToggleShortlist && (
                      <button
                        type="button"
                        onClick={() => onToggleShortlist(c)}
                        title={shortlisted ? 'Remove from shortlist' : 'Add to shortlist'}
                        className={`shrink-0 rounded-xl border p-2 transition-colors ${
                          shortlisted
                            ? 'border-violet-200 bg-violet-50 text-violet-600 hover:bg-violet-100'
                            : 'border-stone-200 bg-white text-stone-400 hover:border-stone-300 hover:text-stone-600'
                        }`}
                      >
                        <BookmarkIcon filled={shortlisted} />
                      </button>
                    )}
                    </div>
                  </div>

                  {/* Weather — fetched on open (see GET /api/forecast) */}
                  {tripDate && (
                    <Section title={dateLine ? `Weather Forecast · ${dateLine}` : 'Weather Forecast'}>
                      {detailWeatherLoading ? (
                        <p className="text-sm text-stone-500">Loading forecast…</p>
                      ) : detailWeatherError || !summary ? (
                        <p className="text-sm text-stone-500">Weather unavailable</p>
                      ) : (
                        <div className="flex flex-wrap items-start gap-4">
                          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm text-stone-700">
                            <dt className="text-stone-500">Max temp</dt>
                            <dd className="tabular-nums font-medium">{summary.maxTempC} °C</dd>
                            <dt className="text-stone-500">Rain</dt>
                            <dd className="tabular-nums font-medium">{summary.rainMm} mm</dd>
                            <dt className="text-stone-500">Max wind</dt>
                            <dd className="tabular-nums font-medium">{summary.maxWindKmh} km/h</dd>
                          </dl>
                          <span className={`self-start rounded-full px-3 py-1 text-sm font-medium ${labelTone(summary.label)}`}>
                            {summary.label}
                          </span>
                        </div>
                      )}
                    </Section>
                  )}

                  {/* Introduction */}
                  {c.introduction && (
                    <Section title="About">
                      <p className="text-sm leading-relaxed text-stone-700">{c.introduction}</p>
                    </Section>
                  )}

                  {/* Access */}
                  {accessItems.length > 0 && (
                    <Section title="Getting There">
                      <div className="flex flex-wrap gap-2">
                        {accessItems.map((item) => (
                          <span
                            key={item}
                            className="flex items-center gap-1.5 rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-sm text-stone-700"
                          >
                            <span>{ACCESS_ICONS[item] ?? '📍'}</span>
                            {item}
                          </span>
                        ))}
                      </div>
                    </Section>
                  )}

                  {/* Activities */}
                  {activityItems.length > 0 && (
                    <Section title="Activities">
                      <div className="flex flex-wrap gap-2">
                        {activityItems.map((item) => (
                          <span
                            key={item}
                            className="flex items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-sm text-teal-800"
                          >
                            <span>{ACTIVITY_ICONS[item] ?? '🌿'}</span>
                            {item}
                          </span>
                        ))}
                      </div>

                      {showNearbyTracks && onShowNearbyTrails && (
                        <div className="mt-4 border-t border-teal-100 pt-4">
                          <p className="mb-2 text-xs text-stone-500">
                            DOC tracks within {NEARBY_TRACKS_RADIUS_KM} km
                          </p>
                          {trailsActive ? (
                            <button
                              type="button"
                              onClick={() => onHideNearbyTrails?.()}
                              className="w-full rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900 transition-colors hover:bg-amber-100"
                            >
                              Hide tracks on map
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onShowNearbyTrails(c)}
                              disabled={trailsLoading}
                              className="w-full rounded-lg border border-amber-400 bg-white px-3 py-2 text-sm font-semibold text-amber-800 transition-colors hover:bg-amber-50 disabled:cursor-wait disabled:opacity-60"
                            >
                              {trailsLoading ? 'Loading tracks…' : 'Show nearby hiking tracks'}
                            </button>
                          )}
                          {trailsForCampsite?.error && (
                            <p className="mt-2 text-xs text-red-600">{trailsForCampsite.error}</p>
                          )}
                          {trailsForCampsite?.empty && !trailsLoading && (
                            <p className="mt-2 text-xs text-stone-500">
                              No DOC tracks within {NEARBY_TRACKS_RADIUS_KM} km.
                            </p>
                          )}
                          {trailsForCampsite?.trails?.length > 0 && (
                            <ul className="mt-3 space-y-2">
                              {trailsForCampsite.trails.map((track) => (
                                <li
                                  key={track.objectId ?? track.name}
                                  className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm"
                                >
                                  <p className="font-medium text-stone-900">{track.name}</p>
                                  <p className="mt-0.5 text-xs text-stone-500">
                                    {[track.difficulty, track.completionTime]
                                      .filter(Boolean)
                                      .join(' · ')}
                                    {track.distanceKm != null && ` · ~${track.distanceKm} km`}
                                  </p>
                                  {track.webPage && (
                                    <a
                                      href={track.webPage}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="mt-1 inline-block text-xs font-medium text-emerald-700 hover:underline"
                                    >
                                      DOC track page →
                                    </a>
                                  )}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                    </Section>
                  )}

                  {/* Facilities */}
                  {facilityItems.length > 0 && (
                    <Section title="Facilities">
                      <ul className="space-y-1.5">
                        {facilityItems.map((item) => (
                          <li key={item} className="flex items-center gap-2 text-sm text-stone-700">
                            <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </Section>
                  )}

                  {/* Dogs */}
                  {dogsText && (
                    <Section title="Dogs">
                      <p className="text-sm leading-relaxed text-stone-700">{dogsText}</p>
                    </Section>
                  )}

                  {/* Capacity */}
                  {(c.numberOfPoweredSites != null || c.numberOfUnpoweredSites != null) && (
                    <Section title="Capacity">
                      <div className="flex gap-4 text-sm text-stone-700">
                        {c.numberOfUnpoweredSites != null && (
                          <span>⛺ <span className="font-medium">{c.numberOfUnpoweredSites}</span> unpowered</span>
                        )}
                        {c.numberOfPoweredSites != null && (
                          <span>🔌 <span className="font-medium">{c.numberOfPoweredSites}</span> powered</span>
                        )}
                      </div>
                    </Section>
                  )}
                </div>
              )}

              {/* ── Reviews Tab ──────────────────────────────────── */}
              {activeTab === 'reviews' && (
                <ReviewsTab campsiteId={c.id} />
              )}

            </div>

            {/* Footer — only shown on Info tab */}
            {activeTab === 'info' && c.staticLink && (
              <div className="shrink-0 border-t border-stone-100 px-5 py-4">
                <a
                  href={c.staticLink}
                  target="_blank"
                  rel="noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
                >
                  Open official DOC page
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </a>
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}
