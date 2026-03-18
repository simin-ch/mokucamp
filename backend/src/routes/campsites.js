const express = require('express')

const router = express.Router()
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

// GET /api/campsites
router.get('/', async (req, res) => {
  try {
    const {
      region,
      category,
      q,
      limit,
      offset,
    } = req.query || {}

    const take = Number(limit) > 0 ? Number(limit) : 50
    const skip = Number(offset) > 0 ? Number(offset) : 0

    const where = {}
    if (region) where.region = String(region)
    if (category) where.campsiteCategory = String(category)

    // Simple full-text-ish search across name/place/region/access
    if (q) {
      const s = `%${String(q)}%`
      where.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { place: { contains: s, mode: 'insensitive' } },
        { region: { contains: s, mode: 'insensitive' } },
        { access: { contains: s, mode: 'insensitive' } },
      ]
    }

    const data = await prisma.campsite.findMany({
      where,
      take,
      skip,
      orderBy: { id: 'asc' },
      select: {
        sourceId: true,
        name: true,
        place: true,
        region: true,
        campsiteCategory: true,
        lat: true,
        lon: true,
        bookable: true,
      },
    })

    res.json({ data })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err)
    res.status(500).json({ message: 'Failed to fetch campsites' })
  }
})

module.exports = router

