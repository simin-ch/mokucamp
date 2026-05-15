const express = require('express')

const router = express.Router()
const { PrismaClient } = require('@prisma/client')
const { withThumbnail } = require('../utils/campsite')
const {
  fetchNearbyTracks,
  DEFAULT_RADIUS_KM,
  DEFAULT_LIMIT: DEFAULT_TRACKS_LIMIT,
} = require('../services/docTracks')
const { campsiteHasAllLandscapes, campsiteHasAllActivities } = require('../utils/landscape')

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
 *   - landscape: comma-separated landscape types; campsite must include every value (e.g. "Coastal,Forest")
 *   - activity: comma-separated activities; campsite must include every value (e.g. "Walking and tramping,Fishing")
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
      landscape,
      activity,
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

    const activityValues = activity
      ? String(activity).split(',').map((s) => s.trim()).filter(Boolean)
      : []
    const activityFilter = activityValues.length > 0 ? activityValues : null

    const tagPrefilters = [
      ...(landscapeFilter?.map((v) => ({ landscape: { contains: v } })) ?? []),
      ...(activityFilter?.map((v) => ({ activities: { contains: v } })) ?? []),
    ]

    // Prisma prefilter (AND); exact token match applied in JS below.
    const where =
      tagPrefilters.length > 0
        ? {
            ...whereBase,
            AND: [...(whereBase.AND ?? []), ...tagPrefilters],
          }
        : whereBase

    const applyTagFilters = (rows) => {
      let filtered = rows
      if (landscapeFilter) {
        filtered = filtered.filter((c) => campsiteHasAllLandscapes(c.landscape, landscapeFilter))
      }
      if (activityFilter) {
        filtered = filtered.filter((c) => campsiteHasAllActivities(c.activities, activityFilter))
      }
      return filtered
    }

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

      let filtered = applyTagFilters(
        applyRadius(await prisma.campsite.findMany({ where, orderBy: { id: 'asc' } })),
      )
      const landscapeNotFound = Boolean(landscapeFilter && filtered.length === 0)

      const page = filtered.slice(skip, skip + take)
      const data = page.map(withThumbnail)

      return res.json({
        data,
        total: filtered.length,
        landscapeNotFound,
      })
    }

    const allRows = await prisma.campsite.findMany({ where, orderBy: { id: 'asc' } })
    const filtered = applyTagFilters(allRows)
    const landscapeNotFound = Boolean(landscapeFilter && filtered.length === 0)

    const total = filtered.length
    const rows = filtered.slice(skip, skip + take)

    const data = rows.map(withThumbnail)

    res.json({ data, total, landscapeNotFound })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err)
    res.status(500).json({ message: 'Failed to fetch campsites' })
  }
})

/**
 * GET /api/campsites/:id/nearby-tracks
 * DOC walking/tramping routes within radiusKm of the campsite (default 15 km, max 5).
 */
router.get('/:id/nearby-tracks', async (req, res) => {
  const id = parseInt(req.params.id, 10)
  if (isNaN(id)) return res.status(400).json({ message: 'Invalid id' })

  const radiusKm = parseFloat(req.query.radiusKm)
  const limit = parseInt(req.query.limit, 10)

  try {
    const campsite = await prisma.campsite.findUnique({ where: { id } })
    if (!campsite) return res.status(404).json({ message: 'Campsite not found' })

    const result = await fetchNearbyTracks(campsite.lat, campsite.lon, {
      radiusKm: !isNaN(radiusKm) ? radiusKm : DEFAULT_RADIUS_KM,
      limit: !isNaN(limit) ? limit : DEFAULT_TRACKS_LIMIT,
    })

    res.json(result)
  } catch (err) {
    console.error(err)
    res.status(502).json({ message: 'Failed to fetch nearby tracks' })
  }
})

/**
 * GET /api/campsites/:id
 * Returns a single campsite by its numeric id.
 */
router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10)
  if (isNaN(id)) return res.status(400).json({ message: 'Invalid id' })

  try {
    const campsite = await prisma.campsite.findUnique({ where: { id } })
    if (!campsite) return res.status(404).json({ message: 'Campsite not found' })
    res.json(withThumbnail(campsite))
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Failed to fetch campsite' })
  }
})

module.exports = router

