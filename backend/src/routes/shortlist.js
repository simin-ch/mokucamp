const express = require('express')
const { PrismaClient } = require('@prisma/client')
const authenticate = require('../middleware/authenticate')

const router = express.Router()
const prisma = new PrismaClient()

/** Return the campsite rows for a user's shortlist, newest first. */
async function getUserShortlist(userId) {
  const rows = await prisma.shortlistItem.findMany({
    where: { userId },
    include: { campsite: true },
    orderBy: { createdAt: 'desc' },
  })
  return rows.map((r) => r.campsite)
}

// ---------------------------------------------------------------------------
// GET /api/shortlist  — fetch current user's shortlist
// ---------------------------------------------------------------------------
router.get('/', authenticate, async (req, res) => {
  const items = await getUserShortlist(req.user.id)
  return res.json({ items })
})

// ---------------------------------------------------------------------------
// POST /api/shortlist/sync
// Body: { ids: number[] }
//
// Merges the supplied campsite IDs into the user's server-side shortlist
// (adds missing ones, keeps existing ones, does NOT remove any).
// Returns the full merged shortlist so the client can update its state.
// ---------------------------------------------------------------------------
router.post('/sync', authenticate, async (req, res) => {
  const { ids } = req.body
  if (!Array.isArray(ids)) {
    return res.status(400).json({ error: 'ids must be an array of campsite IDs.' })
  }

  for (const rawId of ids) {
    const campsiteId = parseInt(rawId, 10)
    if (isNaN(campsiteId)) continue
    try {
      await prisma.shortlistItem.create({ data: { userId: req.user.id, campsiteId } })
    } catch (e) {
      // P2002 = unique constraint violation (already in shortlist) — safe to ignore.
      // P2003 = foreign key constraint (campsite doesn't exist) — skip silently.
      if (e.code !== 'P2002' && e.code !== 'P2003') throw e
    }
  }

  const items = await getUserShortlist(req.user.id)
  return res.json({ items })
})

// ---------------------------------------------------------------------------
// POST /api/shortlist/:campsiteId  — add a single campsite
// ---------------------------------------------------------------------------
router.post('/:campsiteId', authenticate, async (req, res) => {
  const campsiteId = parseInt(req.params.campsiteId, 10)
  if (isNaN(campsiteId)) return res.status(400).json({ error: 'Invalid campsite ID.' })

  try {
    await prisma.shortlistItem.create({ data: { userId: req.user.id, campsiteId } })
    return res.status(201).json({ message: 'Added to shortlist.' })
  } catch (e) {
    if (e.code === 'P2002') return res.status(200).json({ message: 'Already in shortlist.' })
    if (e.code === 'P2003') return res.status(404).json({ error: 'Campsite not found.' })
    throw e
  }
})

// ---------------------------------------------------------------------------
// DELETE /api/shortlist  — clear the entire shortlist
// ---------------------------------------------------------------------------
router.delete('/', authenticate, async (req, res) => {
  await prisma.shortlistItem.deleteMany({ where: { userId: req.user.id } })
  return res.json({ message: 'Shortlist cleared.' })
})

// ---------------------------------------------------------------------------
// DELETE /api/shortlist/:campsiteId  — remove a single campsite
// ---------------------------------------------------------------------------
router.delete('/:campsiteId', authenticate, async (req, res) => {
  const campsiteId = parseInt(req.params.campsiteId, 10)
  if (isNaN(campsiteId)) return res.status(400).json({ error: 'Invalid campsite ID.' })

  await prisma.shortlistItem.deleteMany({ where: { userId: req.user.id, campsiteId } })
  return res.json({ message: 'Removed from shortlist.' })
})

module.exports = router
