const express = require('express')
const axios = require('axios')
const { geocodeLimiter } = require('../middleware/publicApiRateLimit')

const router = express.Router()

/** Nominatim public instance: max ~1 request/sec per app/IP; exceed → HTTP 429 */
const NOMINATIM_MIN_GAP_MS = 1100
let nominatimQueue = Promise.resolve()

function nominatimSearch(config) {
  const run = nominatimQueue.then(() =>
    axios.get('https://nominatim.openstreetmap.org/search', config),
  )
  const pause = () => new Promise((r) => setTimeout(r, NOMINATIM_MIN_GAP_MS))
  nominatimQueue = run.then(pause, pause)
  return run
}

/**
 * GET /api/geocode?q=<address>
 *
 * Proxies address search to Nominatim (OpenStreetMap), restricted to New Zealand.
 * Returns up to 5 candidates: [{ displayName, lat, lon }]
 *
 * Nominatim usage policy requires a descriptive User-Agent and forbids
 * bulk / high-frequency requests. Outbound calls are serialized with a
 * minimum gap so we stay under their limit; the 3-char minimum and frontend
 * debounce reduce volume further.
 */
router.get('/', geocodeLimiter, async (req, res) => {
  const q = String(req.query.q || '').trim()
  if (q.length < 3) return res.json([])

  try {
    const response = await nominatimSearch({
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
      // Allow time when several clients queue on the same server.
      timeout: 20000,
    })

    const results = (response.data || []).map((item) => ({
      displayName: item.display_name,
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon),
    }))

    res.json(results)
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Geocode proxy error:', err.message)
    const upstream = err.response?.status
    if (upstream === 429) {
      return res.status(503).json({
        message: 'Address search is busy. Please wait a few seconds and try again.',
      })
    }
    res.status(502).json({ message: 'Geocoding service unavailable' })
  }
})

module.exports = router
