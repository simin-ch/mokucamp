const express = require('express')
const cors = require('cors')

const campsitesRouter = require('./routes/campsites')
const recommendRouter = require('./routes/recommend')
const weatherRouter = require('./routes/weather')

const app = express()

app.use(cors())
app.use(express.json())

app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api/campsites', campsitesRouter)
app.use('/api/recommend', recommendRouter)
app.use('/api/weather', weatherRouter)

module.exports = app

