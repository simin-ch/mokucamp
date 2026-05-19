const express = require('express')

const router = express.Router()
const { PrismaClient } = require('@prisma/client')
const { toPublicCampsite } = require('../utils/campsite')
const { listCampsites } = require('../utils/campsiteList')
const { nearbyTracksLimiter } = require('../middleware/publicApiRateLimit')
const {
  fetchNearbyTracks,
  DEFAULT_RADIUS_KM,
  DEFAULT_LIMIT: DEFAULT_TRACKS_LIMIT,
} = require('../services/docTracks')

const prisma = new PrismaClient()

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
    const result = await listCampsites(prisma, req.query)
    res.json(result)
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
router.get('/:id/nearby-tracks', nearbyTracksLimiter, async (req, res) => {
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
    res.json(toPublicCampsite(campsite))
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Failed to fetch campsite' })
  }
})

module.exports = router
