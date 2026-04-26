import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { useEffect, useRef } from 'react'
import { Circle, MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
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

function weatherBadge(weather) {
  if (!weather) return ''
  const s = summarizeForecast(weather)
  if (!s) return ''
  const color = s.label === 'Good' ? '#10b981' : s.label === 'Fair' ? '#f59e0b' : '#ef4444'
  return `<span style="display:inline-block;padding:1px 8px;border-radius:9999px;font-size:11px;font-weight:600;color:#fff;background:${color};margin-left:4px">${s.label} · ${s.maxTempC}°C</span>`
}

function PopupContent({ c, rank }) {
  const summary = c.weather ? summarizeForecast(c.weather) : null
  const labelColor =
    summary?.label === 'Good'
      ? 'bg-emerald-100 text-emerald-800'
      : summary?.label === 'Fair'
      ? 'bg-amber-100 text-amber-800'
      : summary
      ? 'bg-red-100 text-red-800'
      : 'bg-stone-100 text-stone-600'

  return (
    <div className="min-w-[200px] max-w-[260px] text-sm">
      {rank != null && (
        <p className="mb-1 text-xs font-semibold text-amber-600">★ Top Pick #{rank}</p>
      )}
      <p className="font-semibold text-stone-900 leading-tight">{c.name}</p>
      {(c.place || c.region) && (
        <p className="mt-0.5 text-xs text-stone-500">
          {[c.place, c.region].filter(Boolean).join(' · ')}
        </p>
      )}
      <div className="mt-2 flex flex-wrap gap-1.5">
        {c.distanceKm != null && (
          <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs text-sky-800">
            {c.distanceKm < 1
              ? `${Math.round(c.distanceKm * 1000)} m`
              : `${c.distanceKm} km`}
          </span>
        )}
        {c.landscape &&
          c.landscape.split(',').map((l) => (
            <span
              key={l}
              className="rounded-full bg-teal-50 px-2 py-0.5 text-xs text-teal-700"
            >
              {l.trim()}
            </span>
          ))}
        {summary && (
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${labelColor}`}>
            {summary.label} · {summary.maxTempC}°C
          </span>
        )}
      </div>
      {c.staticLink && (
        <a
          href={c.staticLink}
          target="_blank"
          rel="noreferrer"
          className="mt-2 block text-xs font-medium text-emerald-700 hover:underline"
        >
          Open official page →
        </a>
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

export default function CampsiteMap({ mapResult, recommendResult, selectedPlace, radiusKm }) {
  const campsites = mapResult?.data ?? []
  const topPicks = recommendResult?.landscapeNotFound ? [] : (recommendResult?.data ?? [])
  const topPickIds = new Set(topPicks.map((c) => c.id))

  const regularCampsites = campsites.filter((c) => !topPickIds.has(c.id))

  const radiusM = selectedPlace && Number(radiusKm) > 0 ? Number(radiusKm) * 1000 : null

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
              <Popup>
                <PopupContent c={c} />
              </Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>

        {topPicks.map((c, i) => (
          <Marker key={`top-${c.id}`} position={[c.lat, c.lon]} icon={makeTopPickIcon(i + 1)}>
            <Popup>
              <PopupContent c={c} rank={i + 1} />
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}
