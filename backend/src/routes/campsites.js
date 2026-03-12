const express = require('express')

const router = express.Router()

// GET /api/campsites
router.get('/', async (req, res) => {
  // TODO: use Prisma service to fetch real data
  res.json({
    data: [],
    message: 'Campsites endpoint is scaffolded. Connect to database next.',
  })
})

module.exports = router

