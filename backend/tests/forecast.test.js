jest.mock('../src/utils/weather')

const request = require('supertest')
const app = require('../src/app')
const { fetchWeather } = require('../src/utils/weather')

beforeEach(() => {
  fetchWeather.mockReset()
})

describe('GET /api/forecast', () => {
  it('returns 400 when lat is missing', async () => {
    const res = await request(app)
      .get('/api/forecast')
      .query({ lon: '174.76', date: '2026-01-15' })
      .expect(400)
    expect(res.body.message).toBeDefined()
  })

  it('returns 400 when date is missing', async () => {
    const res = await request(app)
      .get('/api/forecast')
      .query({ lat: '-36.85', lon: '174.76' })
      .expect(400)
    expect(res.body.message).toBeDefined()
  })

  it('returns 400 when date format is invalid', async () => {
    const res = await request(app)
      .get('/api/forecast')
      .query({ lat: '-36.85', lon: '174.76', date: '15-01-2026' })
      .expect(400)
    expect(res.body.message).toBeDefined()
  })

  it('returns weather data on success', async () => {
    const mockDaily = {
      time: ['2026-01-15'],
      temperature_2m_max: [22],
      temperature_2m_min: [14],
      precipitation_sum: [0],
      wind_speed_10m_max: [18],
    }
    fetchWeather.mockResolvedValueOnce(mockDaily)

    const res = await request(app)
      .get('/api/forecast')
      .query({ lat: '-36.85', lon: '174.76', date: '2026-01-15' })
      .expect(200)

    expect(res.body.data).toEqual(mockDaily)
    expect(fetchWeather).toHaveBeenCalledWith(-36.85, 174.76, '2026-01-15')
  })

  it('returns 502 when weather service throws', async () => {
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    fetchWeather.mockRejectedValueOnce(new Error('upstream down'))

    const res = await request(app)
      .get('/api/forecast')
      .query({ lat: '-36.85', lon: '174.76', date: '2026-01-15' })
      .expect(502)
    expect(res.body.message).toMatch(/unavailable/i)
    errSpy.mockRestore()
  })
})
