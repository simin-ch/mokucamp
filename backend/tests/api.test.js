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
        activities: 'Walking and tramping,Fishing',
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
      {
        ...baseCampsite,
        sourceId: 'seed-3',
        name: 'Forest Coast Camp',
        place: 'Coromandel',
        region: 'Waikato',
        campsiteCategory: 'Scenic',
        landscape: 'Coastal,Forest',
        dogsAllowedBool: true,
        hasToilets: true,
        hasWater: true,
        hasPower: false,
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

  it('falls back to Photon when Nominatim fails', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    const infoSpy = jest.spyOn(console, 'info').mockImplementation(() => {})
    axios.get
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce({
        data: {
          features: [
            {
              geometry: { coordinates: [174.7756, -41.2866] },
              properties: {
                name: 'Wellington',
                country: 'New Zealand',
                countrycode: 'NZ',
              },
            },
          ],
        },
      })

    const res = await request(app).get('/api/geocode').query({ q: 'Wellington' }).expect(200)

    expect(axios.get).toHaveBeenCalledTimes(2)
    expect(axios.get).toHaveBeenNthCalledWith(
      2,
      'https://photon.komoot.io/api',
      expect.objectContaining({
        params: expect.objectContaining({ q: 'Wellington', bbox: '165,-48,179,-34' }),
      }),
    )
    expect(res.body).toEqual([
      { displayName: 'Wellington, New Zealand', lat: -41.2866, lon: 174.7756 },
    ])
    warnSpy.mockRestore()
    infoSpy.mockRestore()
  })

  it('returns 502 when Nominatim and Photon both fail', async () => {
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    axios.get.mockRejectedValueOnce(new Error('network')).mockRejectedValueOnce(new Error('network'))

    const res = await request(app).get('/api/geocode').query({ q: 'Auckland' }).expect(502)
    expect(res.body).toEqual({ message: 'Geocoding service unavailable' })
    errSpy.mockRestore()
    warnSpy.mockRestore()
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

  it('requires all landscape values when multiple are selected', async () => {
    const coastalOnly = await request(app)
      .get('/api/campsites')
      .query({ landscape: 'Coastal', region: 'Auckland' })
      .expect(200)
    expect(coastalOnly.body.landscapeNotFound).toBe(false)
    expect(coastalOnly.body.data.some((c) => c.name === 'Test Bay DOC')).toBe(true)

    const coastalAndForest = await request(app)
      .get('/api/campsites')
      .query({ landscape: 'Coastal,Forest', region: 'Waikato' })
      .expect(200)
    expect(coastalAndForest.body.landscapeNotFound).toBe(false)
    expect(coastalAndForest.body.data.some((c) => c.name === 'Forest Coast Camp')).toBe(true)
    expect(coastalAndForest.body.data.some((c) => c.name === 'Test Bay DOC')).toBe(false)

    const coastalAndBeach = await request(app)
      .get('/api/campsites')
      .query({ landscape: 'Coastal,Beach', region: 'Auckland' })
      .expect(200)
    expect(coastalAndBeach.body.landscapeNotFound).toBe(false)
    expect(coastalAndBeach.body.data.some((c) => c.name === 'Test Bay DOC')).toBe(true)
    expect(coastalAndBeach.body.data.some((c) => c.name === 'Forest Coast Camp')).toBe(false)
  })

  it('requires all activity values when multiple are selected', async () => {
    const walkingOnly = await request(app)
      .get('/api/campsites')
      .query({ activity: 'Walking and tramping', region: 'Auckland' })
      .expect(200)
    expect(walkingOnly.body.data.some((c) => c.name === 'Test Bay DOC')).toBe(true)

    const walkingAndBiking = await request(app)
      .get('/api/campsites')
      .query({ activity: 'Walking and tramping,Mountain biking', region: 'Auckland' })
      .expect(200)
    expect(walkingAndBiking.body.data.some((c) => c.name === 'Test Bay DOC')).toBe(false)

    const walkingAndFishing = await request(app)
      .get('/api/campsites')
      .query({ activity: 'Walking and tramping,Fishing', region: 'Auckland' })
      .expect(200)
    expect(walkingAndFishing.body.data.some((c) => c.name === 'Test Bay DOC')).toBe(true)
  })

  it('returns empty results when landscape filter has no matches', async () => {
    const res = await request(app)
      .get('/api/campsites')
      .query({ landscape: 'Coastal,Forest', region: 'Auckland' })
      .expect(200)

    expect(res.body).toMatchObject({ total: 0, landscapeNotFound: true })
    expect(res.body.data).toHaveLength(0)
  })
})

describe('GET /api/campsites/:id', () => {
  it('returns a single campsite by id', async () => {
    const campsite = await prisma.campsite.findFirst({ where: { dataset: 'test', name: 'Test Bay DOC' } })
    const res = await request(app).get(`/api/campsites/${campsite.id}`).expect(200)
    expect(res.body.id).toBe(campsite.id)
    expect(res.body.name).toBe('Test Bay DOC')
  })

  it('returns 404 for nonexistent campsite', async () => {
    const res = await request(app).get('/api/campsites/999999').expect(404)
    expect(res.body.message).toBeDefined()
  })

  it('returns 400 for non-numeric id', async () => {
    const res = await request(app).get('/api/campsites/notanid').expect(400)
    expect(res.body.message).toBeDefined()
  })
})

describe('GET /api/campsites/:id/nearby-tracks', () => {
  it('returns nearby DOC tracks (default 3 km, max 5)', async () => {
    const campsite = await prisma.campsite.findFirst({
      where: { dataset: 'test', name: 'Test Bay DOC' },
    })

    axios.get.mockResolvedValueOnce({
      data: {
        features: [
          {
            type: 'Feature',
            properties: {
              OBJECTID: 42,
              name: 'Coastal Walk',
              difficulty: 'Easy',
              completionTime: '2 hr',
              introduction: 'A scenic walk.',
              walkingAndTrampingWebPage: 'https://www.doc.govt.nz/track',
            },
            geometry: {
              type: 'LineString',
              coordinates: [
                [174.76, -36.85],
                [174.77, -36.86],
              ],
            },
          },
        ],
      },
    })

    const res = await request(app)
      .get(`/api/campsites/${campsite.id}/nearby-tracks`)
      .expect(200)

    expect(res.body).toMatchObject({ radiusKm: 3, limit: 5 })
    expect(res.body.data).toHaveLength(1)
    expect(res.body.data[0]).toMatchObject({
      objectId: 42,
      name: 'Coastal Walk',
      difficulty: 'Easy',
      webPage: 'https://www.doc.govt.nz/track',
    })
    expect(res.body.data[0].geometry.type).toBe('LineString')
    expect(axios.get).toHaveBeenCalledTimes(1)
  })

  it('returns 404 when campsite does not exist', async () => {
    await request(app).get('/api/campsites/999999/nearby-tracks').expect(404)
  })
})

describe('GET /api/forecast', () => {
  it('returns 400 without lat, lon, date', async () => {
    const res = await request(app).get('/api/forecast').expect(400)
    expect(res.body.message).toBeDefined()
  })
})

describe('GET /api/recommend', () => {
  it('returns ranked results with location context', async () => {
    const res = await request(app)
      .get('/api/recommend')
      .query({ lat: '-36.85', lon: '174.76', radiusKm: '500', limit: '10' })
      .expect(200)

    expect(res.body).toMatchObject({ landscapeNotFound: false, ranked: true })
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

  it('respects activity preference when matches exist', async () => {
    const res = await request(app)
      .get('/api/recommend')
      .query({
        lat: '-36.85',
        lon: '174.76',
        radiusKm: '500',
        activities: 'Walking and tramping',
        limit: '5',
      })
      .expect(200)

    expect(res.body.landscapeNotFound).toBe(false)
    expect(res.body.data.length).toBeGreaterThanOrEqual(1)
    expect(
      res.body.data.some((c) =>
        String(c.activities || '').toLowerCase().includes('walking and tramping'),
      ),
    ).toBe(true)
  })

  it('without location returns unranked list (no scores)', async () => {
    const res = await request(app).get('/api/recommend').expect(200)

    expect(res.body).toMatchObject({ ranked: false, landscapeNotFound: false })
    expect(res.body.data.length).toBe(res.body.total)
    expect(res.body.data.length).toBeGreaterThanOrEqual(1)
    expect(res.body.data.every((c) => c.score === null)).toBe(true)
  })

  it('with location still returns ranked scores and respects facility filter', async () => {
    const res = await request(app)
      .get('/api/recommend')
      .query({ lat: '-36.85', lon: '174.76', radiusKm: '500', dogsAllowedBool: 'true', limit: '20' })
      .expect(200)

    expect(res.body.ranked).toBe(true)
    expect(res.body.data.length).toBeGreaterThanOrEqual(1)
    expect(res.body.data.every((c) => c.dogsAllowedBool === true)).toBe(true)
    expect(res.body.data[0].score).not.toBeNull()
  })
})
