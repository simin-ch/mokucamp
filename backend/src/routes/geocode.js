const express = require('express')
const axios = require('axios')
const { geocodeLimiter } = require('../middleware/publicApiRateLimit')

const router = express.Router()

const PHOTON_URL = 'https://photon.komoot.io/api'
/** NZ bounding box for Photon: minLon, minLat, maxLon, maxLat */
const NZ_BBOX = '165,-48,179,-34'

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

/**
 * GET /api/geocode?q=<address>
 *
 * Address search via Photon (Komoot/OSM), restricted to New Zealand.
 * Returns up to 5 candidates: [{ displayName, lat, lon }]
 */
router.get('/', geocodeLimiter, async (req, res) => {
  const q = String(req.query.q || '').trim()
  if (q.length < 3) return res.json([])

  try {
    const response = await axios.get(PHOTON_URL, {
      params: { q, limit: 8, lang: 'en', bbox: NZ_BBOX },
      timeout: 8000,
    })
    res.json(mapPhotonResults(response.data))
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[geocode] Photon failed', {
      status: err.response?.status,
      message: err.message,
      queryPreview: q.slice(0, 80),
    })
    res.status(502).json({ message: 'Geocoding service unavailable' })
  }
})

module.exports = router
