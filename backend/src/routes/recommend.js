const express = require('express')

const router = express.Router()
const { PrismaClient } = require('@prisma/client')
const { fetchWeather } = require('../utils/weather')
const { toPublicCampsite } = require('../utils/campsite')
const { recommendLimiter } = require('../middleware/publicApiRateLimit')
const { campsiteHasAllLandscapes, campsiteHasAllActivities } = require('../utils/landscape')

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

/** ~km per degree latitude (WGS84 approximation). */
const KM_PER_DEG_LAT = 111.32

/**
 * Axis-aligned bounding box in degrees for a circle of radiusKm around the center.
 * Narrows Prisma via @@index([lat, lon]); callers still filter with Haversine.
 */
function boundingBoxForRadiusKm(centerLat, centerLon, radiusKm) {
  const latDelta = radiusKm / KM_PER_DEG_LAT
  const cosLat = Math.cos((centerLat * Math.PI) / 180)
  const lonDelta = radiusKm / (KM_PER_DEG_LAT * Math.max(Math.abs(cosLat), 0.001))
  return {
    latMin: centerLat - latDelta,
    latMax: centerLat + latDelta,
    lonMin: centerLon - lonDelta,
    lonMax: centerLon + lonDelta,
  }
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
 * Landscape score: 1.0 if campsite includes every preferred landscape type,
 * 0.0 if campsite has a landscape but not all match, null when user expressed
 * no preference. Campsites with no landscape data score 0.3 (slight penalty).
 */
function scoreLandscape(campsiteLandscape, preferredLandscapes) {
  if (!preferredLandscapes || preferredLandscapes.length === 0) return null
  if (!campsiteLandscape) return 0.3
  return campsiteHasAllLandscapes(campsiteLandscape, preferredLandscapes) ? 1.0 : 0.0
}

/**
 * Activity score: same rules as landscape — 1.0 when all preferred activities match,
 * 0.0 when activities exist but not all match, null with no preference, 0.3 if missing data.
 */
function scoreActivity(campsiteActivities, preferredActivities) {
  if (!preferredActivities || preferredActivities.length === 0) return null
  if (!campsiteActivities) return 0.3
  return campsiteHasAllActivities(campsiteActivities, preferredActivities) ? 1.0 : 0.0
}

const FACILITY_KEYS = ['dogsAllowedBool', 'hasToilets', 'hasWater', 'hasPower']
const DOGS_KEY = 'dogsAllowedBool'
const OTHER_FACILITY_KEYS = ['hasToilets', 'hasWater', 'hasPower']

/** Drop campsites missing any user-required facility (strict `=== true`). */
function hardFilterByFacilities(campsites, prefs) {
  const required = FACILITY_KEYS.filter((k) => prefs[k] === 'true')
  if (required.length === 0) return campsites
  return campsites.filter((c) => required.every((k) => c[k] === true))
}

/**
 * Weighted facility match among user requirements: dogsAllowedBool counts double,
 * hasToilets / hasWater / hasPower count equally. Returns null when no requirements.
 */
function scoreFacilities(campsite, prefs) {
  const dogsRequired = prefs[DOGS_KEY] === 'true'
  const othersRequired = OTHER_FACILITY_KEYS.filter((k) => prefs[k] === 'true')
  if (!dogsRequired && othersRequired.length === 0) return null

  let earned = 0
  let possible = 0
  if (dogsRequired) {
    possible += 2
    if (campsite[DOGS_KEY] === true) earned += 2
  }
  for (const k of othersRequired) {
    possible += 1
    if (campsite[k] === true) earned += 1
  }
  return possible > 0 ? earned / possible : null
}

/**
 * Combine dimension scores with fixed weights, normalising when some
 * dimensions are absent (user provided no preference). When `date` is sent with a
 * search radius, weather is fetched only for campsites inside that radius and used here.
 *
 * Base weights: landscape 0.35 · activity 0.35 · facilities 0.35 · distance 0.15 · weather 0.15
 */
function computeScore(campsite, {
  distanceKm,
  radiusKm,
  weather,
  landscapePrefs,
  activityPrefs,
  facilityPrefs,
}) {
  const dims = [
    { score: scoreLandscape(campsite.landscape, landscapePrefs), weight: 0.35 },
    { score: scoreActivity(campsite.activities, activityPrefs), weight: 0.35 },
    { score: scoreFacilities(campsite, facilityPrefs), weight: 0.35 },
    { score: scoreDistance(distanceKm, radiusKm), weight: 0.15 },
    { score: scoreWeather(weather), weight: 0.15 },
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
 *   - date                YYYY-MM-DD; with radius, fetches Open-Meteo only for campsites inside radius (ranking)
 *   - landscapes          comma-separated landscape types; campsite must include all
 *   - activities          comma-separated activities; campsite must include all
 *   - dogsAllowedBool, hasToilets, hasWater, hasPower
 *                         "true" = user requires this facility
 *   - limit               max ranked results when lat/lon/radius set (default 5, cap 50)
 *
 * When lat/lon/radiusKm are not all valid, returns every campsite matching landscape
 * and facility filters (no score, ranked: false). Limit is ignored in that mode.
 */
router.get('/', recommendLimiter, async (req, res) => {
  try {
    const {
      lat,
      lon,
      radiusKm,
      date: dateQuery,
      landscapes,
      activities,
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

    const activityPrefs = activities
      ? String(activities)
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : []

    const facilityPrefs = { dogsAllowedBool, hasToilets, hasWater, hasPower }

    const topN = Math.min(Math.max(Number(limit) || DEFAULT_TOP_N, 1), 50)

    // Fetch candidates: with location, DB bbox + index first, then precise Haversine.
    let candidates
    if (useDistance) {
      const box = boundingBoxForRadiusKm(centerLat, centerLon, radius)
      candidates = await prisma.campsite.findMany({
        where: {
          lat: { gte: box.latMin, lte: box.latMax },
          lon: { gte: box.lonMin, lte: box.lonMax },
        },
        orderBy: { id: 'asc' },
      })
    } else {
      candidates = await prisma.campsite.findMany({ orderBy: { id: 'asc' } })
    }

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

    candidates = hardFilterByFacilities(candidates, facilityPrefs)

    // Hard-filter by landscape / activity preferences (must match all selected values).
    let landscapeNotFound = false
    if (landscapePrefs.length > 0) {
      const matched = candidates.filter((c) =>
        campsiteHasAllLandscapes(c.landscape, landscapePrefs),
      )
      if (matched.length > 0) {
        candidates = matched
      } else {
        landscapeNotFound = true
        candidates = []
      }
    }
    if (activityPrefs.length > 0 && candidates.length > 0) {
      const matched = candidates.filter((c) =>
        campsiteHasAllActivities(c.activities, activityPrefs),
      )
      if (matched.length > 0) {
        candidates = matched
      } else {
        candidates = []
      }
    }

    if (!useDistance) {
      const data = candidates.map((c) => toPublicCampsite({ ...c, score: null }))
      return res.json({
        data,
        total: data.length,
        landscapeNotFound,
        ranked: false,
      })
    }

    // Ranked mode only: weather for campsites already inside radius (and other filters).
    if (tripDate && candidates.length > 0) {
      const weatherByGridKey = new Map()
      const getWeatherShared = (lat, lon) => {
        const gridKey = `${Number(lat).toFixed(2)}:${Number(lon).toFixed(2)}`
        let p = weatherByGridKey.get(gridKey)
        if (!p) {
          p = fetchWeather(lat, lon, tripDate).catch(() => null)
          weatherByGridKey.set(gridKey, p)
        }
        return p
      }
      candidates = await Promise.all(
        candidates.map(async (c) => {
          const weather = await getWeatherShared(c.lat, c.lon)
          return { ...c, weather }
        }),
      )
    }

    // Score and rank (location context required)
    const scored = candidates
      .map((c) => {
        const score = computeScore(c, {
          distanceKm: c.distanceKm,
          radiusKm: radius,
          weather: c.weather,
          landscapePrefs,
          activityPrefs,
          facilityPrefs,
        })
        return { ...c, score: Math.round(score * 1000) / 1000 }
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, topN)

    res.json({
      data: scored.map(toPublicCampsite),
      total: candidates.length,
      landscapeNotFound,
      ranked: true,
    })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err)
    res.status(500).json({ message: 'Failed to generate recommendations' })
  }
})

module.exports = router
