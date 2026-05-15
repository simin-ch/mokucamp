const request = require('supertest')
const jwt = require('jsonwebtoken')
const { PrismaClient } = require('@prisma/client')
const app = require('../src/app')

const prisma = new PrismaClient()

let token
let userId
let campsiteId

beforeAll(async () => {
  const user = await prisma.user.upsert({
    where: { email: 'shortlist-test@test.example' },
    create: { email: 'shortlist-test@test.example', passwordHash: 'fakehash', emailVerified: true },
    update: {},
  })
  userId = user.id
  token = jwt.sign({ sub: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' })

  const campsite = await prisma.campsite.findFirst({ where: { dataset: 'test' } })
  campsiteId = campsite.id

  await prisma.shortlistItem.deleteMany({ where: { userId } })
})

afterAll(async () => {
  await prisma.shortlistItem.deleteMany({ where: { userId } })
  await prisma.user.deleteMany({ where: { email: 'shortlist-test@test.example' } })
  await prisma.$disconnect()
})

// ---------------------------------------------------------------------------
// GET /api/shortlist
// ---------------------------------------------------------------------------
describe('GET /api/shortlist', () => {
  it('returns 401 without token', async () => {
    await request(app).get('/api/shortlist').expect(401)
  })

  it('returns empty shortlist initially', async () => {
    const res = await request(app)
      .get('/api/shortlist')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
    expect(res.body.items).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// POST /api/shortlist/:campsiteId
// ---------------------------------------------------------------------------
describe('POST /api/shortlist/:campsiteId', () => {
  it('returns 401 without token', async () => {
    await request(app).post(`/api/shortlist/${campsiteId}`).expect(401)
  })

  it('returns 400 for non-numeric campsite ID', async () => {
    await request(app)
      .post('/api/shortlist/notanid')
      .set('Authorization', `Bearer ${token}`)
      .expect(400)
  })

  it('returns 404 for nonexistent campsite', async () => {
    await request(app)
      .post('/api/shortlist/999999')
      .set('Authorization', `Bearer ${token}`)
      .expect(404)
  })

  it('adds a campsite to the shortlist', async () => {
    const res = await request(app)
      .post(`/api/shortlist/${campsiteId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(201)
    expect(res.body.message).toBeDefined()
  })

  it('returns 200 (not error) when campsite already in shortlist', async () => {
    const res = await request(app)
      .post(`/api/shortlist/${campsiteId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
    expect(res.body.message).toMatch(/already/i)
  })
})

// ---------------------------------------------------------------------------
// GET /api/shortlist (after adding)
// ---------------------------------------------------------------------------
describe('GET /api/shortlist (populated)', () => {
  it('returns the added campsite', async () => {
    const res = await request(app)
      .get('/api/shortlist')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
    expect(res.body.items.length).toBeGreaterThanOrEqual(1)
    expect(res.body.items.some((c) => c.id === campsiteId)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// POST /api/shortlist/sync
// ---------------------------------------------------------------------------
describe('POST /api/shortlist/sync', () => {
  it('returns 401 without token', async () => {
    await request(app).post('/api/shortlist/sync').send({ ids: [] }).expect(401)
  })

  it('returns 400 when ids is not an array', async () => {
    const res = await request(app)
      .post('/api/shortlist/sync')
      .set('Authorization', `Bearer ${token}`)
      .send({ ids: 'not-an-array' })
      .expect(400)
    expect(res.body.error).toBeDefined()
  })

  it('returns 400 when ids exceeds limit', async () => {
    const res = await request(app)
      .post('/api/shortlist/sync')
      .set('Authorization', `Bearer ${token}`)
      .send({ ids: Array.from({ length: 101 }, (_, i) => i + 1) })
      .expect(400)
    expect(res.body.error).toMatch(/100/i)
  })

  it('syncs and returns merged shortlist', async () => {
    const res = await request(app)
      .post('/api/shortlist/sync')
      .set('Authorization', `Bearer ${token}`)
      .send({ ids: [campsiteId] })
      .expect(200)
    expect(Array.isArray(res.body.items)).toBe(true)
    expect(res.body.items.some((c) => c.id === campsiteId)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// DELETE /api/shortlist/:campsiteId
// ---------------------------------------------------------------------------
describe('DELETE /api/shortlist/:campsiteId', () => {
  it('returns 401 without token', async () => {
    await request(app).delete(`/api/shortlist/${campsiteId}`).expect(401)
  })

  it('removes the campsite from the shortlist', async () => {
    const res = await request(app)
      .delete(`/api/shortlist/${campsiteId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
    expect(res.body.message).toBeDefined()

    const check = await request(app)
      .get('/api/shortlist')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
    expect(check.body.items.some((c) => c.id === campsiteId)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// DELETE /api/shortlist (clear all)
// ---------------------------------------------------------------------------
describe('DELETE /api/shortlist', () => {
  beforeEach(async () => {
    await prisma.shortlistItem.upsert({
      where: { userId_campsiteId: { userId, campsiteId } },
      create: { userId, campsiteId },
      update: {},
    })
  })

  it('returns 401 without token', async () => {
    await request(app).delete('/api/shortlist').expect(401)
  })

  it('clears the entire shortlist', async () => {
    const res = await request(app)
      .delete('/api/shortlist')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
    expect(res.body.message).toBeDefined()

    const check = await request(app)
      .get('/api/shortlist')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
    expect(check.body.items).toHaveLength(0)
  })
})
