const express = require('express')

const router = express.Router()
const { PrismaClient } = require('@prisma/client')
const { fetchWeather } = require('../utils/weather')

const prisma = new PrismaClient()

const DEFAULT_TOP_N = 5
const TRIP_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

// ─── Haversine ────────────────────────────────────────────────────────────────

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

// ─── Scoring helpers ──────────────────────────────────────────────────────────

/**
 * Distance score: linear decay from 1.0 (at origin) to 0.0 (at radiusKm edge).
 * Returns null when no location context is provided.
 */
function scoreDistance(distanceKm, radiusKm) {
  if (radiusKm == null || radiusKm <= 0) return null
  return Math.max(0, 1 - distanceKm / radiusKm)
}

/**
 * Weather score based on Open-Meteo daily payload.
 * Good → 1.0 | Fair → 0.5 | Poor → 0.1 | No data → null
 */
function scoreWeather(weather) {
  if (!weather?.time?.length) return null
  const rain = Number(weather.precipitation_sum?.[0]) || 0
  const temp = Number(weather.temperature_2m_max?.[0]) || 0
  const wind = Number(weather.wind_speed_10m_max?.[0]) || 0
  if (rain < 5 && temp >= 12 && wind < 40) return 1.0
  if (rain < 20 || temp >= 8) return 0.5
  return 0.1
}

/**
 * Landscape score: 1.0 if campsite matches any preferred landscape type,
 * 0.0 if campsite has a landscape but none match, null when user expressed
 * no preference. Campsites with no landscape data score 0.3 (slight penalty).
 */
function scoreLandscape(campsiteLandscape, preferredLandscapes) {
  if (!preferredLandscapes || preferredLandscapes.length === 0) return null
  if (!campsiteLandscape) return 0.3
  const cs = campsiteLandscape.toLowerCase()
  const matched = preferredLandscapes.some((p) => cs.includes(p.toLowerCase()))
  return matched ? 1.0 : 0.0
}

/**
 * Facility score: fraction of user-required facilities the campsite provides.
 * Returns null when the user expressed no facility requirements.
 */
function scoreFacilities(campsite, prefs) {
  const KEYS = ['dogsAllowedBool', 'hasToilets', 'hasWater', 'hasPower']
  const required = KEYS.filter((k) => prefs[k] === 'true')
  if (required.length === 0) return null
  const matched = required.filter((k) => campsite[k] === true).length
  return matched / required.length
}

/**
 * Combine dimension scores with fixed weights, normalising when some
 * dimensions are absent (user provided no preference / no date).
 *
 * Base weights: distance 0.40 · weather 0.30 · landscape 0.15 · facility 0.15
 */
function computeScore(campsite, { distanceKm, radiusKm, weather, landscapePrefs, facilityPrefs }) {
  const dims = [
    { score: scoreDistance(distanceKm, radiusKm), weight: 0.40 },
    { score: scoreWeather(weather), weight: 0.30 },
    { score: scoreLandscape(campsite.landscape, landscapePrefs), weight: 0.15 },
    { score: scoreFacilities(campsite, facilityPrefs), weight: 0.15 },
  ].filter((d) => d.score !== null)

  if (dims.length === 0) return 0

  const totalWeight = dims.reduce((s, d) => s + d.weight, 0)
  return dims.reduce((s, d) => s + (d.score * d.weight) / totalWeight, 0)
}

// ─── Route ────────────────────────────────────────────────────────────────────

/**
 * GET /api/recommend
 *
 * Query params:
 *   - lat, lon, radiusKm  location context (all required for distance scoring)
 *   - date                YYYY-MM-DD; when set, weather is fetched per campsite
 *   - landscapes          comma-separated preferred landscape types
 *                         e.g. "Coastal,Alpine"
 *   - dogsAllowedBool, hasToilets, hasWater, hasPower
 *                         "true" = user requires this facility
 *   - limit               number of top results to return (default 10)
 */
router.get('/', async (req, res) => {
  try {
    const {
      lat,
      lon,
      radiusKm,
      date: dateQuery,
      landscapes,
      dogsAllowedBool,
      hasToilets,
      hasWater,
      hasPower,
      limit,
    } = req.query || {}

    const centerLat = parseFloat(lat)
    const centerLon = parseFloat(lon)
    const radius = parseFloat(radiusKm)
    const useDistance = !isNaN(centerLat) && !isNaN(centerLon) && !isNaN(radius) && radius > 0

    const tripDate =
      dateQuery && TRIP_DATE_RE.test(String(dateQuery).trim())
        ? String(dateQuery).trim()
        : null

    const landscapePrefs = landscapes
      ? String(landscapes)
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : []

    const facilityPrefs = { dogsAllowedBool, hasToilets, hasWater, hasPower }

    const topN = Math.min(Math.max(Number(limit) || DEFAULT_TOP_N, 1), 50)

    // Fetch candidates: when location is provided, restrict to radius
    let candidates = await prisma.campsite.findMany({ orderBy: { id: 'asc' } })

    if (useDistance) {
      candidates = candidates
        .map((c) => ({
          ...c,
          distanceKm: Math.round(haversineKm(centerLat, centerLon, c.lat, c.lon) * 10) / 10,
        }))
        .filter((c) => c.distanceKm <= radius)
    } else {
      candidates = candidates.map((c) => ({ ...c, distanceKm: null }))
    }

    // When landscape preference is set, hard-filter to matching campsites only.
    let landscapeNotFound = false
    if (landscapePrefs.length > 0) {
      const matched = candidates.filter((c) => {
        if (!c.landscape) return false
        const cs = c.landscape.toLowerCase()
        return landscapePrefs.some((p) => cs.includes(p.toLowerCase()))
      })
      if (matched.length > 0) {
        candidates = matched
      } else {
        landscapeNotFound = true
      }
    }

    // Attach weather in parallel
    if (tripDate) {
      candidates = await Promise.all(
        candidates.map(async (c) => {
          try {
            const weather = await fetchWeather(c.lat, c.lon, tripDate)
            return { ...c, weather }
          } catch {
            return { ...c, weather: null }
          }
        }),
      )
    } else {
      candidates = candidates.map((c) => ({ ...c, weather: null }))
    }

    // Score and rank
    const scored = candidates
      .map((c) => {
        const score = computeScore(c, {
          distanceKm: c.distanceKm,
          radiusKm: useDistance ? radius : null,
          weather: c.weather,
          landscapePrefs,
          facilityPrefs,
        })
        return { ...c, score: Math.round(score * 1000) / 1000 }
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, topN)

    res.json({ data: scored, total: candidates.length, landscapeNotFound })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err)
    res.status(500).json({ message: 'Failed to generate recommendations' })
  }
})

module.exports = router
