const express = require('express')
const axios = require('axios')
const { geocodeLimiter } = require('../middleware/publicApiRateLimit')

const router = express.Router()

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'
const PHOTON_URL = 'https://photon.komoot.io/api'
/** NZ bounding box for Photon: minLon, minLat, maxLon, maxLat */
const NZ_BBOX = '165,-48,179,-34'

/** Nominatim public instance: max ~1 request/sec per app/IP; exceed → HTTP 429 */
const NOMINATIM_MIN_GAP_MS = 1200
let nominatimQueue = Promise.resolve()

function nominatimSearch(config) {
  const run = nominatimQueue.then(async () => {
    const exec = () => axios.get(NOMINATIM_URL, config)
    try {
      return await exec()
    } catch (e) {
      if (e.response?.status === 429) {
        // eslint-disable-next-line no-console
        console.warn('[geocode] Nominatim HTTP 429 — waiting 2s then one retry')
        await new Promise((r) => setTimeout(r, 2000))
        return await exec()
      }
      throw e
    }
  })
  const pause = () => new Promise((r) => setTimeout(r, NOMINATIM_MIN_GAP_MS))
  nominatimQueue = run.then(pause, pause)
  return run
}

function mapNominatimResults(data) {
  return (data || []).map((item) => ({
    displayName: item.display_name,
    lat: parseFloat(item.lat),
    lon: parseFloat(item.lon),
  }))
}

function photonDisplayName(p) {
  const parts = [p.name, p.street, p.city, p.state, p.country].filter(Boolean)
  const unique = parts.filter((part, i) => i === 0 || part !== parts[i - 1])
  return unique.join(', ') || p.name || 'Unknown place'
}

function isNzPhotonFeature(feature) {
  const p = feature.properties || {}
  const cc = String(p.countrycode || '').toUpperCase()
  if (cc === 'NZ') return true
  const country = String(p.country || '').toLowerCase()
  if (country.includes('new zealand')) return true
  const coords = feature.geometry?.coordinates
  if (!coords || coords.length < 2) return false
  const [lon, lat] = coords
  return lon >= 165 && lon <= 179 && lat >= -48 && lat <= -34
}

function mapPhotonResults(data) {
  const features = (data?.features || []).filter(isNzPhotonFeature)
  return features.slice(0, 5).map((f) => {
    const [lon, lat] = f.geometry.coordinates
    return {
      displayName: photonDisplayName(f.properties),
      lat: parseFloat(lat),
      lon: parseFloat(lon),
    }
  })
}

async function photonSearch(q) {
  const response = await axios.get(PHOTON_URL, {
    params: { q, limit: 8, lang: 'en', bbox: NZ_BBOX },
    timeout: 8000,
  })
  return mapPhotonResults(response.data)
}

function nominatimConfig(q) {
  return {
    params: {
      q,
      format: 'json',
      limit: 5,
      countrycodes: 'nz',
      addressdetails: 0,
    },
    headers: {
      'User-Agent': 'Mokucamp/1.0 (NZ campsite finder; contact via github)',
      'Accept-Language': 'en',
    },
    timeout: 20000,
  }
}

/**
 * GET /api/geocode?q=<address>
 *
 * Proxies address search to Nominatim (OpenStreetMap), restricted to New Zealand.
 * Falls back to Photon (Komoot/OSM) when Nominatim is unavailable or rate-limited.
 * Returns up to 5 candidates: [{ displayName, lat, lon }]
 */
router.get('/', geocodeLimiter, async (req, res) => {
  const q = String(req.query.q || '').trim()
  if (q.length < 3) return res.json([])

  try {
    const response = await nominatimSearch(nominatimConfig(q))
    return res.json(mapNominatimResults(response.data))
  } catch (nominatimErr) {
    const upstream = nominatimErr.response?.status
    // eslint-disable-next-line no-console
    console.warn('[geocode] Nominatim failed, trying Photon', {
      status: upstream,
      message: nominatimErr.message,
      queryPreview: q.slice(0, 80),
    })
  }

  try {
    const results = await photonSearch(q)
    if (results.length > 0) {
      // eslint-disable-next-line no-console
      console.info('[geocode] Photon fallback ok', { count: results.length, queryPreview: q.slice(0, 80) })
      return res.json(results)
    }
    return res.json([])
  } catch (photonErr) {
    // eslint-disable-next-line no-console
    console.error('[geocode] Photon fallback failed', {
      status: photonErr.response?.status,
      message: photonErr.message,
      queryPreview: q.slice(0, 80),
    })
    return res.status(502).json({ message: 'Geocoding service unavailable' })
  }
})

module.exports = router
