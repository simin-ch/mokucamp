const express = require('express')

const router = express.Router()
const { PrismaClient } = require('@prisma/client')
const { fetchWeather } = require('../utils/weather')

const prisma = new PrismaClient()

const MAX_LIMIT = 500
const DEFAULT_LIMIT = 312

/**
 * Haversine great-circle distance between two WGS84 coordinates, in kilometres.
 */
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

/**
 * GET /api/campsites
 *
 * Returns the full campsite list from the database with basic query support.
 *
 * Query params:
 *   - region: filter by region (exact match)
 *   - category: filter by campsiteCategory (exact match)
 *   - dogsAllowedBool: filter by dogs allowed (true|false)
 *   - hasToilets: filter by toilets (true|false)
 *   - hasWater: filter by water (true|false)
 *   - hasPower: filter by power (true|false)
 *   - q: search in name, place, region, access (substring)
 *   - limit: max items to return (default 312, max 500)
 *   - offset: items to skip for pagination (default 0)
 *   - lat: centre latitude for distance filtering (WGS84)
 *   - lon: centre longitude for distance filtering (WGS84)
 *   - radiusKm: include only campsites within this radius; results sorted by distance
 *   - date: YYYY-MM-DD; when set, single-day forecast is attached per campsite
 *   - landscape: filter to campsites whose landscape field contains this value (e.g. "Coastal")
 */
const TRIP_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

async function attachWeather(rows, tripDate) {
  return Promise.all(
    rows.map(async (c) => {
      try {
        const daily = await fetchWeather(c.lat, c.lon, tripDate)
        return { ...c, weather: daily }
      } catch {
        return { ...c, weather: null }
      }
    }),
  )
}

router.get('/', async (req, res) => {
  try {
    const {
      region,
      category,
      dogsAllowedBool,
      hasToilets,
      hasWater,
      hasPower,
      landscape,
      q,
      limit,
      offset,
      lat,
      lon,
      radiusKm,
      date: dateQuery,
    } = req.query || {}

    const tripDateRaw = dateQuery != null && String(dateQuery).trim() !== '' ? String(dateQuery).trim() : null
    const wantWeather = Boolean(tripDateRaw && TRIP_DATE_RE.test(tripDateRaw))
    const tripDate = wantWeather ? tripDateRaw : null

    const rawLimit = Number(limit)
    const take = rawLimit > 0
      ? Math.min(rawLimit, MAX_LIMIT)
      : DEFAULT_LIMIT
    const skip = Number(offset) > 0 ? Number(offset) : 0

    const centerLat = parseFloat(lat)
    const centerLon = parseFloat(lon)
    const radius = parseFloat(radiusKm)
    const useDistance =
      !isNaN(centerLat) && !isNaN(centerLon) && !isNaN(radius) && radius > 0

    // Base conditions (no landscape filter) — used for fallback queries
    const whereBase = {}
    if (region) whereBase.region = String(region)
    if (category) whereBase.campsiteCategory = String(category)
    if (dogsAllowedBool === 'true') whereBase.dogsAllowedBool = true
    if (dogsAllowedBool === 'false') whereBase.dogsAllowedBool = false
    if (hasToilets === 'true') whereBase.hasToilets = true
    if (hasToilets === 'false') whereBase.hasToilets = false
    if (hasWater === 'true') whereBase.hasWater = true
    if (hasWater === 'false') whereBase.hasWater = false
    if (hasPower === 'true') whereBase.hasPower = true
    if (hasPower === 'false') whereBase.hasPower = false
    if (q) {
      const s = `%${String(q)}%`
      whereBase.OR = [
        { name: { contains: s } },
        { place: { contains: s } },
        { region: { contains: s } },
        { access: { contains: s } },
      ]
    }

    // landscape param accepts comma-separated values (e.g. "Coastal,Forest")
    const landscapeValues = landscape
      ? String(landscape).split(',').map((s) => s.trim()).filter(Boolean)
      : []
    const landscapeFilter = landscapeValues.length > 0 ? landscapeValues : null

    // Full where clause: add landscape as AND condition so it doesn't conflict with q OR
    const where = landscapeFilter
      ? {
          ...whereBase,
          AND: [
            ...(whereBase.AND ?? []),
            { OR: landscapeFilter.map((v) => ({ landscape: { contains: v } })) },
          ],
        }
      : whereBase

    if (useDistance) {
      // Fetch all candidates matching other filters, then apply Haversine in JS.
      // For the current dataset size this is fast; swap for a bounding-box pre-filter
      // if the table grows significantly.
      const applyRadius = (rows) =>
        rows
          .map((c) => ({
            ...c,
            distanceKm: Math.round(haversineKm(centerLat, centerLon, c.lat, c.lon) * 10) / 10,
          }))
          .filter((c) => c.distanceKm <= radius)
          .sort((a, b) => a.distanceKm - b.distanceKm)

      let filtered = applyRadius(
        await prisma.campsite.findMany({ where, orderBy: { id: 'asc' } }),
      )
      let landscapeNotFound = false

      // No matching landscape within radius → fall back to all landscapes and notify
      if (landscapeFilter && filtered.length === 0) {
        filtered = applyRadius(
          await prisma.campsite.findMany({ where: whereBase, orderBy: { id: 'asc' } }),
        )
        landscapeNotFound = true
      }

      const page = filtered.slice(skip, skip + take)
      const data = wantWeather ? await attachWeather(page, tripDate) : page

      return res.json({
        data,
        total: filtered.length,
        landscapeNotFound,
      })
    }

    let [rows, total] = await Promise.all([
      prisma.campsite.findMany({ where, take, skip, orderBy: { id: 'asc' } }),
      prisma.campsite.count({ where }),
    ])
    let landscapeNotFound = false

    // No matching landscape → fall back to all landscapes and notify
    if (landscapeFilter && total === 0) {
      ;[rows, total] = await Promise.all([
        prisma.campsite.findMany({ where: whereBase, take, skip, orderBy: { id: 'asc' } }),
        prisma.campsite.count({ where: whereBase }),
      ])
      landscapeNotFound = true
    }

    const data = wantWeather ? await attachWeather(rows, tripDate) : rows

    res.json({ data, total, landscapeNotFound })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err)
    res.status(500).json({ message: 'Failed to fetch campsites' })
  }
})

module.exports = router

