const express = require('express')
const axios = require('axios')

const router = express.Router()

/**
 * GET /api/geocode?q=<address>
 *
 * Proxies address search to Nominatim (OpenStreetMap), restricted to New Zealand.
 * Returns up to 5 candidates: [{ displayName, lat, lon }]
 *
 * Nominatim usage policy requires a descriptive User-Agent and forbids
 * bulk / high-frequency requests. The 3-char minimum and frontend debounce
 * keep request volume low for a low-traffic app.
 */
router.get('/', async (req, res) => {
  const q = String(req.query.q || '').trim()
  if (q.length < 3) return res.json([])

  try {
    const response = await axios.get('https://nominatim.openstreetmap.org/search', {
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
      timeout: 6000,
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
    res.status(502).json({ message: 'Geocoding service unavailable' })
  }
})

module.exports = router
