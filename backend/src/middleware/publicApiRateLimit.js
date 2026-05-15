const rateLimit = require('express-rate-limit')

function skipInTest() {
  return process.env.NODE_ENV === 'test'
}

/** GET /api/geocode — proxy to Nominatim */
const geocodeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
  message: { message: 'Too many address searches. Please wait a moment.' },
})

/** GET /api/forecast — proxy to Open-Meteo */
const forecastLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
  message: { message: 'Too many forecast requests. Please wait a moment.' },
})

/** GET /api/recommend — may fan out weather fetches */
const recommendLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
  message: { message: 'Too many recommendation requests. Please wait a moment.' },
})

/** GET /api/campsites/:id/nearby-tracks — proxy to DOC ArcGIS */
const nearbyTracksLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
  message: { message: 'Too many track lookups. Please wait a moment.' },
})

module.exports = {
  geocodeLimiter,
  forecastLimiter,
  recommendLimiter,
  nearbyTracksLimiter,
}
