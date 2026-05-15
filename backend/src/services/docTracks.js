const axios = require('axios')
const proj4 = require('proj4')

const DOC_TRACKS_QUERY_URL =
  'https://services1.arcgis.com/3JjYDyG3oajxU6HO/ArcGIS/rest/services/DOC_Walking_Experiences/FeatureServer/1/query'

const DEFAULT_RADIUS_KM = 3
const DEFAULT_LIMIT = 5
const MAX_RADIUS_KM = 50
const MAX_LIMIT = 20

proj4.defs(
  'EPSG:2193',
  '+proj=tmerc +lat_0=0 +lon_0=173 +k=0.9996 +x_0=1600000 +y_0=10000000 +ellps=GRS80 +units=m +no_defs +type=crs',
)
proj4.defs('EPSG:4326', '+proj=longlat +datum=WGS84 +no_defs +type=crs')

function wgs84ToNztm(lat, lon) {
  const [x, y] = proj4('EPSG:4326', 'EPSG:2193', [lon, lat])
  return { x, y }
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.asin(Math.sqrt(a))
}

/** Collect [lat, lon] vertices from GeoJSON LineString / MultiLineString. */
function lineVertices(geometry) {
  if (!geometry) return []
  if (geometry.type === 'LineString') {
    return geometry.coordinates.map(([lon, lat]) => [lat, lon])
  }
  if (geometry.type === 'MultiLineString') {
    return geometry.coordinates.flatMap((line) =>
      line.map(([lon, lat]) => [lat, lon]),
    )
  }
  return []
}

/** Minimum distance from a point to any vertex on the track (km). */
function minDistanceToTrackKm(lat, lon, geometry) {
  const verts = lineVertices(geometry)
  if (verts.length === 0) return Infinity
  return Math.min(...verts.map(([vLat, vLon]) => haversineKm(lat, lon, vLat, vLon)))
}

function mapFeatureToTrack(feature, campsiteLat, campsiteLon) {
  const p = feature.properties || {}
  const geometry = feature.geometry
  const distanceKm = minDistanceToTrackKm(campsiteLat, campsiteLon, geometry)

  return {
    objectId: p.OBJECTID ?? feature.id ?? null,
    name: p.name || 'Unnamed track',
    difficulty: p.difficulty || null,
    completionTime: p.completionTime || null,
    introduction: p.introduction || null,
    thumbnailUrl: p.introductionThumbnail || null,
    webPage: p.walkingAndTrampingWebPage || null,
    distanceKm: Math.round(distanceKm * 10) / 10,
    geometry,
  }
}

/**
 * Query DOC walking/tramping routes within radiusKm of a WGS84 point.
 * @returns {Promise<{ data: object[], radiusKm: number, limit: number }>}
 */
async function fetchNearbyTracks(lat, lon, options = {}) {
  const radiusKm = Math.min(
    Math.max(Number(options.radiusKm) || DEFAULT_RADIUS_KM, 1),
    MAX_RADIUS_KM,
  )
  const limit = Math.min(
    Math.max(Number(options.limit) || DEFAULT_LIMIT, 1),
    MAX_LIMIT,
  )

  const { x, y } = wgs84ToNztm(lat, lon)
  const distanceM = radiusKm * 1000

  const params = {
    geometry: JSON.stringify({
      x,
      y,
      spatialReference: { wkid: 2193 },
    }),
    geometryType: 'esriGeometryPoint',
    inSR: 2193,
    spatialRel: 'esriSpatialRelIntersects',
    distance: distanceM,
    // ArcGIS Online FeatureServer expects WKID 9001 (meters), not esriMeters
    units: 9001,
    outFields:
      'OBJECTID,name,difficulty,completionTime,introduction,introductionThumbnail,walkingAndTrampingWebPage',
    returnGeometry: true,
    outSR: 4326,
    f: 'geojson',
  }

  const { data } = await axios.get(DOC_TRACKS_QUERY_URL, {
    params,
    timeout: 20000,
  })

  if (data?.error) {
    const msg = data.error.message || 'DOC tracks query failed'
    throw new Error(msg)
  }

  const features = data?.features || []
  const tracks = features
    .map((f) => mapFeatureToTrack(f, lat, lon))
    .filter((t) => t.geometry && lineVertices(t.geometry).length > 0)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, limit)

  return { data: tracks, radiusKm, limit }
}

module.exports = {
  fetchNearbyTracks,
  DEFAULT_RADIUS_KM,
  DEFAULT_LIMIT,
  haversineKm,
  minDistanceToTrackKm,
}
