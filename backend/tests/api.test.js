jest.mock('axios')

const request = require('supertest')
const axios = require('axios')
const { PrismaClient } = require('@prisma/client')

const app = require('../src/app')

const prisma = new PrismaClient()

const baseCampsite = {
  dataset: 'test',
  bookable: true,
  lat: -36.85,
  lon: 174.76,
}

beforeAll(async () => {
  await prisma.campsite.deleteMany({ where: { dataset: 'test' } })
  await prisma.campsite.createMany({
    data: [
      {
        ...baseCampsite,
        sourceId: 'seed-1',
        name: 'Test Bay DOC',
        place: 'Auckland',
        region: 'Auckland',
        campsiteCategory: 'Scenic',
        landscape: 'Coastal,Beach',
        dogsAllowedBool: true,
        hasToilets: true,
        hasWater: true,
        hasPower: false,
      },
      {
        ...baseCampsite,
        sourceId: 'seed-2',
        name: 'Alpine Hut',
        place: 'Canterbury',
        region: 'Canterbury',
        campsiteCategory: 'Basic',
        landscape: 'Alpine',
        dogsAllowedBool: false,
        hasToilets: true,
        hasWater: false,
        hasPower: false,
        lat: -43.5,
        lon: 170.1,
      },
    ],
  })
})

afterAll(async () => {
  await prisma.$disconnect()
})

beforeEach(() => {
  axios.get.mockReset()
})

describe('GET /health', () => {
  it('returns ok', async () => {
    const res = await request(app).get('/health').expect(200)
    expect(res.body).toEqual({ status: 'ok' })
  })
})

describe('GET /api/weather', () => {
  it('returns scaffold payload', async () => {
    const res = await request(app).get('/api/weather').expect(200)
    expect(res.body.data).toMatchObject({
      location: 'Sample campsite',
      temperatureC: 22,
      condition: 'Cloudy',
    })
    expect(res.body.message).toContain('scaffold')
  })
})

describe('GET /api/geocode', () => {
  it('returns empty array when query is too short', async () => {
    const res = await request(app).get('/api/geocode').query({ q: 'ab' }).expect(200)
    expect(res.body).toEqual([])
    expect(axios.get).not.toHaveBeenCalled()
  })

  it('proxies Nominatim and maps results', async () => {
    axios.get.mockResolvedValueOnce({
      data: [
        {
          display_name: 'Wellington, New Zealand',
          lat: '-41.2866',
          lon: '174.7756',
        },
      ],
    })

    const res = await request(app).get('/api/geocode').query({ q: 'Wellington NZ' }).expect(200)

    expect(axios.get).toHaveBeenCalledWith(
      'https://nominatim.openstreetmap.org/search',
      expect.objectContaining({
        params: expect.objectContaining({ q: 'Wellington NZ', countrycodes: 'nz' }),
      }),
    )
    expect(res.body).toEqual([
      { displayName: 'Wellington, New Zealand', lat: -41.2866, lon: 174.7756 },
    ])
  })

  it('returns 502 when upstream fails', async () => {
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    axios.get.mockRejectedValueOnce(new Error('network'))

    const res = await request(app).get('/api/geocode').query({ q: 'Auckland' }).expect(502)
    expect(res.body).toEqual({ message: 'Geocoding service unavailable' })
    errSpy.mockRestore()
  })
})

describe('GET /api/campsites', () => {
  it('returns seeded campsites with total', async () => {
    const res = await request(app).get('/api/campsites').expect(200)
    expect(res.body).toMatchObject({
      landscapeNotFound: false,
    })
    expect(res.body.total).toBeGreaterThanOrEqual(2)
    const names = res.body.data.map((c) => c.name)
    expect(names).toEqual(expect.arrayContaining(['Test Bay DOC', 'Alpine Hut']))
  })

  it('filters by region', async () => {
    const res = await request(app).get('/api/campsites').query({ region: 'Auckland' }).expect(200)
    expect(res.body.data.every((c) => c.region === 'Auckland')).toBe(true)
    expect(res.body.data.some((c) => c.name === 'Test Bay DOC')).toBe(true)
  })

  it('respects limit', async () => {
    const res = await request(app).get('/api/campsites').query({ limit: '1' }).expect(200)
    expect(res.body.data).toHaveLength(1)
  })

  it('filters by radius and sorts by distance', async () => {
    const res = await request(app)
      .get('/api/campsites')
      .query({ lat: '-36.85', lon: '174.76', radiusKm: '50', region: 'Auckland' })
      .expect(200)
    expect(res.body.data.length).toBeGreaterThanOrEqual(1)
    expect(res.body.data[0].distanceKm).toBeDefined()
    expect(res.body.data[0].distanceKm).toBeLessThanOrEqual(50)
  })

  it('applies landscape filter', async () => {
    const res = await request(app).get('/api/campsites').query({ landscape: 'Alpine' }).expect(200)
    expect(res.body.data.some((c) => c.name === 'Alpine Hut')).toBe(true)
    expect(res.body.data.every((c) => String(c.landscape || '').toLowerCase().includes('alpine'))).toBe(
      true,
    )
  })
})

describe('GET /api/recommend', () => {
  it('returns ranked results with location context', async () => {
    const res = await request(app)
      .get('/api/recommend')
      .query({ lat: '-36.85', lon: '174.76', radiusKm: '500', limit: '10' })
      .expect(200)

    expect(res.body).toMatchObject({ landscapeNotFound: false })
    expect(res.body.total).toBeGreaterThanOrEqual(1)
    expect(res.body.data.length).toBeGreaterThanOrEqual(1)
    expect(res.body.data[0]).toHaveProperty('score')
    expect(res.body.data[0].name).toBeDefined()
  })

  it('respects landscape preference when matches exist', async () => {
    const res = await request(app)
      .get('/api/recommend')
      .query({
        lat: '-36.85',
        lon: '174.76',
        radiusKm: '500',
        landscapes: 'Coastal',
        limit: '5',
      })
      .expect(200)

    expect(res.body.landscapeNotFound).toBe(false)
    expect(res.body.data.length).toBeGreaterThanOrEqual(1)
    expect(
      res.body.data.some((c) => String(c.landscape || '').toLowerCase().includes('coastal')),
    ).toBe(true)
  })
})
