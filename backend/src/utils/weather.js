const cache = new Map()
const TTL = 60 * 60 * 1000 // 1 hour

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast'
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/** Keep only the row for `date` so the API always returns a single-day `daily` object. */
function dailyForSingleDate(daily, date) {
  if (!daily?.time?.length) return daily
  const idx = daily.time.findIndex((t) => String(t).slice(0, 10) === date)
  if (idx === -1) {
    throw new Error(`No forecast row for ${date}`)
  }
  const out = {}
  for (const key of Object.keys(daily)) {
    const v = daily[key]
    if (Array.isArray(v) && v.length > idx) {
      out[key] = [v[idx]]
    } else {
      out[key] = v
    }
  }
  return out
}

function getCached(key) {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() - entry.ts > TTL) {
    cache.delete(key)
    return null
  }
  return entry.data
}

function setCached(key, data) {
  cache.set(key, { data, ts: Date.now() })
}

/**
 * @param {number} lat
 * @param {number} lon
 * @param {string} date YYYY-MM-DD (single day)
 * @returns {Promise<object>} Open-Meteo `daily` object (one day per array)
 */
async function fetchWeather(lat, lon, date) {
  if (!DATE_RE.test(date)) {
    throw new Error('Invalid date')
  }
  const key = `weather:${Number(lat).toFixed(2)}:${Number(lon).toFixed(2)}:${date}`
  const cached = getCached(key)
  if (cached) return cached

  const url = new URL(FORECAST_URL)
  url.searchParams.set('latitude', String(lat))
  url.searchParams.set('longitude', String(lon))
  url.searchParams.set(
    'daily',
    'precipitation_sum,temperature_2m_max,temperature_2m_min,wind_speed_10m_max',
  )
  url.searchParams.set('start_date', date)
  url.searchParams.set('end_date', date)
  url.searchParams.set('timezone', 'Pacific/Auckland')
  url.searchParams.set('wind_speed_unit', 'kmh')

  const res = await fetch(url)
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Open-Meteo HTTP ${res.status}: ${text.slice(0, 200)}`)
  }
  const json = await res.json()
  const raw = json.daily
  if (!raw || typeof raw !== 'object') {
    throw new Error('Open-Meteo response missing daily')
  }

  const daily = dailyForSingleDate(raw, date)

  setCached(key, daily)
  return daily
}

module.exports = {
  fetchWeather,
  getCached,
  setCached,
}
