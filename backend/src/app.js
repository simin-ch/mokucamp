const express = require('express')
const cors = require('cors')

const authRouter = require('./routes/auth')
const shortlistRouter = require('./routes/shortlist')
const campsitesRouter = require('./routes/campsites')
const geocodeRouter = require('./routes/geocode')
const recommendRouter = require('./routes/recommend')
const forecastRouter = require('./routes/forecast')
const reviewsRouter = require('./routes/reviews')

const app = express()

// Render (and similar) sit behind one reverse proxy — trust X-Forwarded-For for req.ip / rate limiting.
if (process.env.NODE_ENV !== 'test') {
  app.set('trust proxy', 1)
}

const defaultDevOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173']
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map((s) => s.trim()).filter(Boolean)
  : defaultDevOrigins

app.use(
  cors({
    origin(origin, callback) {
      if (process.env.NODE_ENV === 'test') return callback(null, true)
      // Same-origin or non-browser clients (no Origin header)
      if (!origin) return callback(null, true)
      if (allowedOrigins.includes(origin)) return callback(null, true)
      return callback(new Error('Not allowed by CORS'))
    },
    credentials: true,
  }),
)
app.use(express.json())

app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api/auth', authRouter)
app.use('/api/shortlist', shortlistRouter)
app.use('/api/campsites', campsitesRouter)
app.use('/api/geocode', geocodeRouter)
app.use('/api/recommend', recommendRouter)
app.use('/api/forecast', forecastRouter)
app.use('/api/reviews', reviewsRouter)

module.exports = app

