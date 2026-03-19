const express = require('express')

const router = express.Router()
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const MAX_LIMIT = 500
const DEFAULT_LIMIT = 312

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
    } = req.query || {}

    const rawLimit = Number(limit)
    const take = rawLimit > 0
      ? Math.min(rawLimit, MAX_LIMIT)
      : DEFAULT_LIMIT
    const skip = Number(offset) > 0 ? Number(offset) : 0

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

