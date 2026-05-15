import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { useEffect, useRef, useState } from 'react'
import { Circle, GeoJSON, MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import CampsiteDetailDrawer from './CampsiteDetailDrawer'
import MarkerClusterGroup from 'react-leaflet-cluster'
import { NEARBY_TRACKS_LIMIT, NEARBY_TRACKS_RADIUS_KM } from '../utils/nearbyTracks'

// Fix default Leaflet icon path broken by bundlers
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).href,
  iconUrl: new URL('leaflet/dist/images/marker-icon.png', import.meta.url).href,
  shadowUrl: new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).href,
})

/** Regular campsite pins (public/ — Vite serves at site root). */
const CAMPSITE_ICON_SIZE = [44, 44]
const campsiteMarkerIcon = new L.Icon({
  iconUrl: '/images/f2709e06-0c5f-4187-80fb-8001a87a01f1.png',
  iconSize: CAMPSITE_ICON_SIZE,
  iconAnchor: [22, 38],
  popupAnchor: [0, -36],
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

const TRACK_LINE_STYLE = { color: '#b45309', weight: 4, opacity: 0.88 }

function trackDifficultyColor(difficulty) {
  const d = String(difficulty || '').toLowerCase()
  if (d.includes('easy') || d.includes('easiest')) return '#16a34a'
  if (d.includes('intermediate')) return '#ca8a04'
  if (d.includes('advanced') || d.includes('expert')) return '#dc2626'
  return TRACK_LINE_STYLE.color
}

function bindTrackPopup(layer, track) {
  const dist =
    track.distanceKm != null
      ? `<p class="mt-1 text-xs text-stone-500">~${track.distanceKm} km from campsite</p>`
      : ''
  const intro = track.introduction
    ? `<p class="mt-1 text-xs text-stone-600 line-clamp-3">${escapeHtml(track.introduction)}</p>`
    : ''
  const link = track.webPage
    ? `<a href="${escapeHtml(track.webPage)}" target="_blank" rel="noreferrer" class="mt-2 inline-block text-xs font-medium text-emerald-700 hover:underline">DOC track page →</a>`
    : ''

  const html = [
    '<div class="text-sm" style="min-width:200px;max-width:280px">',
    `<p class="font-semibold text-stone-900">${escapeHtml(track.name)}</p>`,
    track.difficulty
      ? `<p class="mt-0.5 text-xs text-stone-600">Difficulty: ${escapeHtml(track.difficulty)}</p>`
      : '',
    track.completionTime
      ? `<p class="text-xs text-stone-600">Time: ${escapeHtml(track.completionTime)}</p>`
      : '',
    dist,
    intro,
    link,
    '</div>',
  ].join('')

  layer.bindPopup(html, { maxWidth: 300 })
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function NearbyTrailsLayer({ trails, campsite }) {
  const map = useMap()

  useEffect(() => {
    if (!trails?.length || !campsite) return
    const group = L.featureGroup()
    trails.forEach((t) => {
      if (t.geometry) group.addLayer(L.geoJSON(t.geometry))
    })
    group.addLayer(L.marker([campsite.lat, campsite.lon]))
    const bounds = group.getBounds()
    if (bounds.isValid()) map.fitBounds(bounds.pad(0.12))
  }, [trails, campsite, map])

  if (!trails?.length) return null

  return trails.map((t) => (
    <GeoJSON
      key={t.objectId ?? t.name}
      data={{ type: 'Feature', geometry: t.geometry, properties: t }}
      pathOptions={{
        ...TRACK_LINE_STYLE,
        color: trackDifficultyColor(t.difficulty),
      }}
      eventHandlers={{
        click: (e) => {
          L.DomEvent.stopPropagation(e)
          e.target.openPopup()
        },
      }}
      onEachFeature={(_feature, layer) => bindTrackPopup(layer, t)}
    />
  ))
}

function PopupContent({ c, rank, onToggleShortlist, isShortlisted, onOpenDetail }) {
  const thumbnailUrl = c.thumbnailUrl || null

  return (
    <div className="text-sm" style={{ minWidth: 280, maxWidth: 320 }}>
      {rank != null && (
        <p className="mb-1 text-xs font-semibold text-amber-600">★ Top Pick #{rank}</p>
      )}

      {/* Campsite image */}
      {thumbnailUrl && (
        <div className="-mx-[10px] -mt-[10px] mb-2 overflow-hidden rounded-t-lg" style={{ height: 140 }}>
          <img
            src={thumbnailUrl}
            alt={c.name}
            className="h-full w-full object-cover"
            loading="lazy"
            onError={(e) => { e.currentTarget.parentElement.style.display = 'none' }}
          />
        </div>
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

      {/* Facilities */}
      <div className="mt-2 border-t border-stone-100 pt-2">
        <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs">
          {[
            { label: 'Dogs',    val: c.dogsAllowedBool },
            { label: 'Toilets', val: c.hasToilets },
            { label: 'Water',   val: c.hasWater },
            { label: 'Power',   val: c.hasPower },
          ].map(({ label, val }) => (
            <span key={label} className={val ? 'text-emerald-600' : 'text-stone-400'}>
              {label} {val ? '✓' : '✗'}
            </span>
          ))}
        </div>
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

      {onOpenDetail && (
        <div className="mt-2 border-t border-stone-100 pt-2">
          <button
            type="button"
            onClick={() => onOpenDetail(c)}
            className="w-full rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-700"
          >
            View details →
          </button>
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

function FlyToCampsite({ campsite, onConsumed }) {
  const map = useMap()
  const prevIdRef = useRef(null)

  useEffect(() => {
    if (!campsite || campsite.id === prevIdRef.current) return
    prevIdRef.current = campsite.id
    map.flyTo([campsite.lat, campsite.lon], 14, { duration: 1.2 })
    onConsumed?.()
  }, [campsite, map, onConsumed])

  return null
}

const NZ_CENTER = [-41.2, 173.2]
const NZ_ZOOM = 5

/** Main NZ + nearby ocean; max zoom-out stays framed on NZ (no whole-world view). */
const NZ_BOUNDS = L.latLngBounds(
  L.latLng(-48.3, 164.5),
  L.latLng(-28.8, 179.99),
)

export default function CampsiteMap({
  mapResult,
  recommendResult,
  selectedPlace,
  radiusKm,
  shortlistItems = [],
  tripDate,
  onToggleShortlist,
  isShortlisted,
  focusCampsite,
  mapSearchEpoch = 0,
  onFocusConsumed,
}) {
  const [detailCampsite, setDetailCampsite] = useState(null)
  const [nearbyTrails, setNearbyTrails] = useState(null)
  const trailsAbortRef = useRef(null)
  const prevSearchEpochRef = useRef(mapSearchEpoch)

  // Clear hiking tracks when the user runs a new search or resets filters
  useEffect(() => {
    if (prevSearchEpochRef.current === mapSearchEpoch) return
    prevSearchEpochRef.current = mapSearchEpoch
    trailsAbortRef.current?.abort()
    trailsAbortRef.current = null
    setNearbyTrails(null)
  }, [mapSearchEpoch])

  // When a campsite is focused (from profile page), open its detail drawer
  useEffect(() => {
    if (focusCampsite) setDetailCampsite(focusCampsite)
  }, [focusCampsite])

  // Clear map tracks when viewing a different campsite in the drawer
  useEffect(() => {
    if (
      detailCampsite?.id &&
      nearbyTrails?.campsiteId &&
      nearbyTrails.campsiteId !== detailCampsite.id
    ) {
      handleHideNearbyTrails()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to campsite switch
  }, [detailCampsite?.id])

  const campsites = mapResult?.data ?? []
  // Only numbered "Top Pick" markers when recommendations are ranked (search has a location).
  const rankedRecommend = recommendResult?.ranked !== false
  const topPicks =
    !rankedRecommend || recommendResult?.landscapeNotFound ? [] : (recommendResult?.data ?? [])
  const topPickIds = new Set(topPicks.map((c) => c.id))
  const shortlistIds = new Set(shortlistItems.map((c) => c.id))

  const regularCampsites = campsites.filter((c) => !topPickIds.has(c.id) && !shortlistIds.has(c.id))

  // Shortlist items that are not already shown as top picks
  const shortlistMarkers = shortlistItems.filter((c) => !topPickIds.has(c.id))

  const radiusM = selectedPlace && Number(radiusKm) > 0 ? Number(radiusKm) * 1000 : null

  const handleShowNearbyTrails = async (c) => {
    trailsAbortRef.current?.abort()
    const ac = new AbortController()
    trailsAbortRef.current = ac

    setNearbyTrails({
      campsiteId: c.id,
      campsite: c,
      trails: [],
      loading: true,
      error: null,
      empty: false,
    })

    try {
      const qs = new URLSearchParams({
        radiusKm: String(NEARBY_TRACKS_RADIUS_KM),
        limit: String(NEARBY_TRACKS_LIMIT),
      })
      const res = await fetch(`/api/campsites/${c.id}/nearby-tracks?${qs}`, {
        signal: ac.signal,
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(json.message || 'Failed to load tracks')
      }
      const trails = json.data ?? []
      setNearbyTrails({
        campsiteId: c.id,
        campsite: c,
        trails,
        loading: false,
        error: null,
        empty: trails.length === 0,
      })
    } catch (err) {
      if (err.name === 'AbortError') return
      setNearbyTrails({
        campsiteId: c.id,
        campsite: c,
        trails: [],
        loading: false,
        error: err.message || 'Failed to load tracks',
        empty: false,
      })
    }
  }

  const handleHideNearbyTrails = () => {
    trailsAbortRef.current?.abort()
    trailsAbortRef.current = null
    setNearbyTrails(null)
  }

  useEffect(() => () => trailsAbortRef.current?.abort(), [])

  const popupProps = { onToggleShortlist, onOpenDetail: setDetailCampsite }

  const handleCloseDetail = () => {
    setDetailCampsite(null)
  }

  return (
    <div className="relative h-full w-full overflow-hidden">
      <MapContainer
        center={NZ_CENTER}
        zoom={NZ_ZOOM}
        className="h-full w-full"
        scrollWheelZoom
        maxBounds={NZ_BOUNDS}
        maxBoundsViscosity={1}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {selectedPlace && <FlyToLocation place={selectedPlace} />}
        {focusCampsite && <FlyToCampsite campsite={focusCampsite} onConsumed={onFocusConsumed} />}

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
            <Marker key={c.id} position={[c.lat, c.lon]} icon={campsiteMarkerIcon}>
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

        {nearbyTrails?.trails?.length > 0 && nearbyTrails.campsite && (
          <NearbyTrailsLayer trails={nearbyTrails.trails} campsite={nearbyTrails.campsite} />
        )}
      </MapContainer>

      <CampsiteDetailDrawer
        campsite={detailCampsite}
        tripDate={tripDate}
        onClose={handleCloseDetail}
        onToggleShortlist={onToggleShortlist}
        isShortlisted={isShortlisted}
        nearbyTrails={nearbyTrails}
        onShowNearbyTrails={handleShowNearbyTrails}
        onHideNearbyTrails={handleHideNearbyTrails}
      />
    </div>
  )
}
