const express = require('express')
const { PrismaClient } = require('@prisma/client')
const authenticate = require('../middleware/authenticate')

const router = express.Router()
const prisma = new PrismaClient()

const PAGE_SIZE = 10

// ---------------------------------------------------------------------------
// GET /api/reviews/mine
// Auth required. Returns all reviews written by the current user,
// including basic campsite info (id, name, lat, lon).
// ---------------------------------------------------------------------------
router.get('/mine', authenticate, async (req, res) => {
  try {
    const reviews = await prisma.review.findMany({
      where: { userId: req.user.id },
      include: {
        campsite: {
          select: { id: true, name: true, lat: true, lon: true, region: true, place: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
    return res.json({ reviews })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Failed to fetch reviews.' })
  }
})

// ---------------------------------------------------------------------------
// GET /api/reviews/:campsiteId?page=1
// Public. Returns paginated reviews + aggregate stats.
// ---------------------------------------------------------------------------
router.get('/:campsiteId', async (req, res) => {
  const campsiteId = parseInt(req.params.campsiteId, 10)
  if (isNaN(campsiteId)) return res.status(400).json({ error: 'Invalid campsite ID.' })

  const page = Math.max(1, parseInt(req.query.page, 10) || 1)
  const skip = (page - 1) * PAGE_SIZE

  const [total, rows] = await Promise.all([
    prisma.review.count({ where: { campsiteId } }),
    prisma.review.findMany({
      where: { campsiteId },
      include: { user: { select: { id: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take: PAGE_SIZE,
    }),
  ])

  // Aggregate: average + per-star distribution [1★, 2★, 3★, 4★, 5★]
  const allRatings = await prisma.review.findMany({
    where: { campsiteId },
    select: { rating: true },
  })

  const distribution = [0, 0, 0, 0, 0]
  let ratingSum = 0
  for (const { rating } of allRatings) {
    ratingSum += rating
    if (rating >= 1 && rating <= 5) distribution[rating - 1]++
  }
  const avg = total > 0 ? Math.round((ratingSum / total) * 10) / 10 : null

  return res.json({
    aggregate: { avg, total, distribution },
    reviews: rows,
    page,
    totalPages: Math.ceil(total / PAGE_SIZE) || 1,
  })
})

// ---------------------------------------------------------------------------
// POST /api/reviews/:campsiteId
// Auth required. Upsert (one review per user per campsite).
// Body: { rating: 1-5, content: string }
// ---------------------------------------------------------------------------
router.post('/:campsiteId', authenticate, async (req, res) => {
  const campsiteId = parseInt(req.params.campsiteId, 10)
  if (isNaN(campsiteId)) return res.status(400).json({ error: 'Invalid campsite ID.' })

  const { rating, content } = req.body
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'rating must be an integer between 1 and 5.' })
  }
  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    return res.status(400).json({ error: 'content is required.' })
  }
  if (content.trim().length > 2000) {
    return res.status(400).json({ error: 'content must be 2000 characters or fewer.' })
  }

  const campsite = await prisma.campsite.findUnique({ where: { id: campsiteId }, select: { id: true } })
  if (!campsite) return res.status(404).json({ error: 'Campsite not found.' })

  const review = await prisma.review.upsert({
    where: { userId_campsiteId: { userId: req.user.id, campsiteId } },
    create: { userId: req.user.id, campsiteId, rating, content: content.trim() },
    update: { rating, content: content.trim() },
    include: { user: { select: { id: true, email: true } } },
  })

  return res.status(200).json({ review })
})

// ---------------------------------------------------------------------------
// DELETE /api/reviews/:campsiteId
// Auth required. Delete caller's own review for this campsite.
// ---------------------------------------------------------------------------
router.delete('/:campsiteId', authenticate, async (req, res) => {
  const campsiteId = parseInt(req.params.campsiteId, 10)
  if (isNaN(campsiteId)) return res.status(400).json({ error: 'Invalid campsite ID.' })

  const deleted = await prisma.review.deleteMany({
    where: { userId: req.user.id, campsiteId },
  })

  if (deleted.count === 0) return res.status(404).json({ error: 'Review not found.' })
  return res.json({ message: 'Review deleted.' })
})

module.exports = router
