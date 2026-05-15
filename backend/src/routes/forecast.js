const express = require('express')
const { fetchWeather } = require('../utils/weather')
const { forecastLimiter } = require('../middleware/publicApiRateLimit')

const router = express.Router()
const TRIP_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/**
 * GET /api/forecast
 *
 * Query: lat, lon, date (YYYY-MM-DD) — single-day Open-Meteo daily payload.
 * For on-demand loads (e.g. campsite detail), not bulk list/recommend.
 */
router.get('/', forecastLimiter, async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat)
    const lon = parseFloat(req.query.lon)
    const raw = req.query.date != null ? String(req.query.date).trim() : ''
    const date = raw && TRIP_DATE_RE.test(raw) ? raw : null

    if (Number.isNaN(lat) || Number.isNaN(lon) || !date) {
      return res.status(400).json({ message: 'lat, lon, and date (YYYY-MM-DD) are required' })
    }

    const data = await fetchWeather(lat, lon, date)
    res.json({ data })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err)
    res.status(502).json({ message: 'Forecast unavailable' })
  }
})

module.exports = router
