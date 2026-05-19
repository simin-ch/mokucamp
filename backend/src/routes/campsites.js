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

/** GET /api/campsites — query params and response shape: see listCampsites(). */
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
