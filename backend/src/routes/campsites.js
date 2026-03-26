const express = require('express')

const router = express.Router()
const { PrismaClient } = require('@prisma/client')

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
 */
router.get('/', async (req, res) => {
  try {
    const {
      region,
      category,
      dogsAllowedBool,
      hasToilets,
      hasWater,
      hasPower,
      q,
      limit,
      offset,
      lat,
      lon,
      radiusKm,
    } = req.query || {}

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

    const where = {}
    if (region) where.region = String(region)
    if (category) where.campsiteCategory = String(category)
    if (dogsAllowedBool === 'true') where.dogsAllowedBool = true
    if (dogsAllowedBool === 'false') where.dogsAllowedBool = false
    if (hasToilets === 'true') where.hasToilets = true
    if (hasToilets === 'false') where.hasToilets = false
    if (hasWater === 'true') where.hasWater = true
    if (hasWater === 'false') where.hasWater = false
    if (hasPower === 'true') where.hasPower = true
    if (hasPower === 'false') where.hasPower = false

    if (q) {
      const s = `%${String(q)}%`
      where.OR = [
        { name: { contains: s } },
        { place: { contains: s } },
        { region: { contains: s } },
        { access: { contains: s } },
      ]
    }

    if (useDistance) {
      // Fetch all candidates matching other filters, then apply Haversine in JS.
      // For the current dataset size this is fast; swap for a bounding-box pre-filter
      // if the table grows significantly.
      const all = await prisma.campsite.findMany({ where, orderBy: { id: 'asc' } })
      const filtered = all
        .map((c) => ({
          ...c,
          distanceKm: Math.round(haversineKm(centerLat, centerLon, c.lat, c.lon) * 10) / 10,
        }))
        .filter((c) => c.distanceKm <= radius)
        .sort((a, b) => a.distanceKm - b.distanceKm)

      return res.json({
        data: filtered.slice(skip, skip + take),
        total: filtered.length,
      })
    }

    const [data, total] = await Promise.all([
      prisma.campsite.findMany({
        where,
        take,
        skip,
        orderBy: { id: 'asc' },
      }),
      prisma.campsite.count({ where }),
    ])

    res.json({ data, total })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err)
    res.status(500).json({ message: 'Failed to fetch campsites' })
  }
})

module.exports = router

