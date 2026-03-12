const express = require('express')

const router = express.Router()

// GET /api/weather
router.get('/', async (req, res) => {
  // TODO: call external weather API via service
  res.json({
    data: {},
    message: 'Weather endpoint is scaffolded. Call weather service next.',
  })
})

module.exports = router

