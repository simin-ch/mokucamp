import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { useEffect, useRef } from 'react'
import { Circle, MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import { formatTripDateLabel } from '../utils/formatTripDate'
import { summarizeForecast } from '../utils/weatherSummary'

// Fix default Leaflet icon path broken by bundlers
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).href,
  iconUrl: new URL('leaflet/dist/images/marker-icon.png', import.meta.url).href,
  shadowUrl: new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).href,
})

const greenIcon = new L.Icon({
  iconUrl: new URL('leaflet/dist/images/marker-icon.png', import.meta.url).href,
  iconRetinaUrl: new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).href,
  shadowUrl: new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).href,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
  className: 'campsite-marker-green',
})

function makeShortlistIcon() {
  return L.divIcon({
    className: '',
    html: `<div style="
      background:#7c3aed;
      color:#fff;
      width:30px;height:30px;
      border-radius:50%;
      display:flex;align-items:center;justify-content:center;
      border:2px solid #fff;
      box-shadow:0 2px 6px rgba(0,0,0,.35);
    ">
      <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='currentColor' width='14' height='14'>
        <path d='M6 2a2 2 0 0 0-2 2v18l8-4 8 4V4a2 2 0 0 0-2-2H6Z'/>
      </svg>
    </div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -18],
  })
}

function makeTopPickIcon(rank) {
  return L.divIcon({
    className: '',
    html: `<div style="
      background:#f59e0b;
      color:#fff;
      width:32px;height:32px;
      border-radius:50%;
      display:flex;align-items:center;justify-content:center;
      font-size:13px;font-weight:700;
      border:2px solid #fff;
      box-shadow:0 2px 6px rgba(0,0,0,.35);
      line-height:1;
    ">${rank}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18],
  })
}

function boolLabel(v) {
  if (v === true) return 'Yes'
  if (v === false) return 'No'
  return '—'
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

function PopupContent({ c, rank, tripDate, onToggleShortlist, isShortlisted }) {
  const summary = c.weather === null ? null : summarizeForecast(c.weather)
  const dateLine = formatTripDateLabel(tripDate)

  return (
    <div className="text-sm" style={{ minWidth: 280, maxWidth: 320 }}>
      {rank != null && (
        <p className="mb-1 text-xs font-semibold text-amber-600">★ Top Pick #{rank}</p>
      )}

      {/* Header: name + shortlist button */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-stone-900 leading-tight">{c.name}</p>
          {(c.place || c.region) && (
            <p className="mt-0.5 text-xs text-stone-500">
              {[c.place, c.region].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
        {onToggleShortlist && (
          <button
            type="button"
            onClick={() => onToggleShortlist(c)}
            title={isShortlisted ? 'Remove from shortlist' : 'Add to shortlist'}
            className={`shrink-0 rounded-lg border p-1.5 transition-colors ${
              isShortlisted
                ? 'border-violet-200 bg-violet-50 text-violet-600 hover:bg-violet-100'
                : 'border-stone-200 bg-white/60 text-stone-400 hover:border-stone-300 hover:text-stone-600'
            }`}
          >
            <BookmarkIcon filled={isShortlisted} />
          </button>
        )}
      </div>

      {/* Tags */}
      <div className="mt-2 flex flex-wrap gap-1.5">
        {c.distanceKm != null && (
          <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs text-sky-800">
            {c.distanceKm < 1 ? `${Math.round(c.distanceKm * 1000)} m` : `${c.distanceKm} km`}
          </span>
        )}
        {c.campsiteCategory && (
          <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-700">
            {c.campsiteCategory}
          </span>
        )}
        {c.landscape && c.landscape.split(',').map((l) => (
          <span key={l} className="rounded-full bg-teal-50 px-2 py-0.5 text-xs text-teal-700">
            {l.trim()}
          </span>
        ))}
        {c.bookable && (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">
            Bookable
          </span>
        )}
      </div>

      {/* Weather */}
      {c.weather !== undefined && (
        <div className="mt-2 border-t border-stone-100 pt-2">
          <p className="text-xs font-medium uppercase tracking-wide text-sky-900/80">
            {dateLine ? `Forecast · ${dateLine}` : 'Forecast'}
          </p>
          {c.weather === null || !summary ? (
            <p className="mt-1 text-xs text-stone-500">Weather unavailable</p>
          ) : (
            <div className="mt-1.5 flex flex-wrap items-start gap-2">
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs text-stone-700">
                <dt className="text-stone-500">Max temp</dt>
                <dd className="tabular-nums">{summary.maxTempC} °C</dd>
                <dt className="text-stone-500">Rain</dt>
                <dd className="tabular-nums">{summary.rainMm} mm</dd>
                <dt className="text-stone-500">Max wind</dt>
                <dd className="tabular-nums">{summary.maxWindKmh} km/h</dd>
              </dl>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${labelTone(summary.label)}`}>
                {summary.label}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Facilities */}
      <div className="mt-2 border-t border-stone-100 pt-2">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-stone-600">
          <div className="flex gap-1.5"><dt className="text-stone-500">Dogs</dt><dd>{boolLabel(c.dogsAllowedBool)}</dd></div>
          <div className="flex gap-1.5"><dt className="text-stone-500">Toilets</dt><dd>{boolLabel(c.hasToilets)}</dd></div>
          <div className="flex gap-1.5"><dt className="text-stone-500">Water</dt><dd>{boolLabel(c.hasWater)}</dd></div>
          <div className="flex gap-1.5"><dt className="text-stone-500">Power</dt><dd>{boolLabel(c.hasPower)}</dd></div>
        </dl>
      </div>

      {/* Introduction */}
      {c.introduction && (
        <p className="mt-2 border-t border-stone-100 pt-2 text-xs leading-relaxed text-stone-600 line-clamp-3">
          {c.introduction}
        </p>
      )}

      {/* Official link */}
      {c.staticLink && (
        <div className="mt-2 border-t border-stone-100 pt-2">
          <a
            href={c.staticLink}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-medium text-emerald-700 hover:underline"
          >
            Open official page →
          </a>
        </div>
      )}
    </div>
  )
}

function FlyToLocation({ place }) {
  const map = useMap()
  const prevPlaceRef = useRef(null)

  useEffect(() => {
    if (!place) return
    const key = `${place.lat},${place.lon}`
    if (prevPlaceRef.current === key) return
    prevPlaceRef.current = key
    map.flyTo([place.lat, place.lon], 9, { duration: 1.2 })
  }, [map, place])

  return null
}

/** Leaflet needs a size refresh when the container was hidden or resized (e.g. mobile fold). */
function MapResizeSync() {
  const map = useMap()
  useEffect(() => {
    const el = map.getContainer()
    if (!el) return
    const ro = new ResizeObserver(() => {
      map.invalidateSize({ animate: false })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [map])
  return null
}

const NZ_CENTER = [-41.2, 173.2]
const NZ_ZOOM = 5

export default function CampsiteMap({ mapResult, recommendResult, selectedPlace, radiusKm, shortlistItems = [], tripDate, onToggleShortlist, isShortlisted }) {
  const campsites = mapResult?.data ?? []
  const topPicks = recommendResult?.landscapeNotFound ? [] : (recommendResult?.data ?? [])
  const topPickIds = new Set(topPicks.map((c) => c.id))
  const shortlistIds = new Set(shortlistItems.map((c) => c.id))

  const regularCampsites = campsites.filter((c) => !topPickIds.has(c.id) && !shortlistIds.has(c.id))

  // Shortlist items that are not already shown as top picks
  const shortlistMarkers = shortlistItems.filter((c) => !topPickIds.has(c.id))

  const radiusM = selectedPlace && Number(radiusKm) > 0 ? Number(radiusKm) * 1000 : null

  const popupProps = { tripDate, onToggleShortlist }

  return (
    <div className="h-[60vh] w-full overflow-hidden rounded-2xl border border-stone-200 shadow-sm">
      <MapContainer
        center={NZ_CENTER}
        zoom={NZ_ZOOM}
        className="h-full w-full"
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {selectedPlace && <FlyToLocation place={selectedPlace} />}

        <MapResizeSync />

        {selectedPlace && radiusM && (
          <Circle
            center={[selectedPlace.lat, selectedPlace.lon]}
            radius={radiusM}
            pathOptions={{ color: '#0ea5e9', fillColor: '#0ea5e9', fillOpacity: 0.08, weight: 1.5 }}
          />
        )}

        <MarkerClusterGroup
          chunkedLoading
          maxClusterRadius={50}
        >
          {regularCampsites.map((c) => (
            <Marker key={c.id} position={[c.lat, c.lon]} icon={greenIcon}>
              <Popup maxWidth={340}>
                <PopupContent c={c} isShortlisted={isShortlisted?.(c.id)} {...popupProps} />
              </Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>

        {topPicks.map((c, i) => (
          <Marker key={`top-${c.id}`} position={[c.lat, c.lon]} icon={makeTopPickIcon(i + 1)}>
            <Popup maxWidth={340}>
              <PopupContent c={c} rank={i + 1} isShortlisted={isShortlisted?.(c.id)} {...popupProps} />
            </Popup>
          </Marker>
        ))}

        {shortlistMarkers.map((c) => (
          <Marker key={`sl-${c.id}`} position={[c.lat, c.lon]} icon={makeShortlistIcon()}>
            <Popup maxWidth={340}>
              <PopupContent c={c} isShortlisted={isShortlisted?.(c.id)} {...popupProps} />
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}
