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
    where: { email: 'reviews-test@test.example' },
    create: { email: 'reviews-test@test.example', passwordHash: 'fakehash', emailVerified: true },
    update: {},
  })
  userId = user.id
  token = jwt.sign({ sub: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' })

  const campsite = await prisma.campsite.findFirst({ where: { dataset: 'test' } })
  campsiteId = campsite.id

  await prisma.review.deleteMany({ where: { userId } })
})

afterAll(async () => {
  await prisma.review.deleteMany({ where: { userId } })
  await prisma.user.deleteMany({ where: { email: 'reviews-test@test.example' } })
  await prisma.$disconnect()
})

// ---------------------------------------------------------------------------
// GET /api/reviews/:campsiteId  (public)
// ---------------------------------------------------------------------------
describe('GET /api/reviews/:campsiteId', () => {
  it('returns 400 for non-numeric campsite ID', async () => {
    await request(app).get('/api/reviews/notanid').expect(400)
  })

  it('returns aggregate stats and empty reviews list', async () => {
    const res = await request(app).get(`/api/reviews/${campsiteId}`).expect(200)
    expect(res.body.aggregate).toBeDefined()
    expect(res.body.aggregate.avg).toBeNull()
    expect(res.body.aggregate.total).toBe(0)
    expect(Array.isArray(res.body.aggregate.distribution)).toBe(true)
    expect(Array.isArray(res.body.reviews)).toBe(true)
    expect(res.body.page).toBe(1)
    expect(res.body.totalPages).toBe(1)
  })

  it('supports page query param', async () => {
    const res = await request(app).get(`/api/reviews/${campsiteId}`).query({ page: '1' }).expect(200)
    expect(res.body.page).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// GET /api/reviews/mine  (auth required)
// ---------------------------------------------------------------------------
describe('GET /api/reviews/mine', () => {
  it('returns 401 without token', async () => {
    await request(app).get('/api/reviews/mine').expect(401)
  })

  it('returns empty list initially', async () => {
    const res = await request(app)
      .get('/api/reviews/mine')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
    expect(Array.isArray(res.body.reviews)).toBe(true)
    expect(res.body.reviews).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// POST /api/reviews/:campsiteId  (auth required)
// ---------------------------------------------------------------------------
describe('POST /api/reviews/:campsiteId', () => {
  it('returns 401 without token', async () => {
    await request(app)
      .post(`/api/reviews/${campsiteId}`)
      .send({ rating: 4, content: 'Nice!' })
      .expect(401)
  })

  it('returns 400 for non-numeric campsite ID', async () => {
    await request(app)
      .post('/api/reviews/notanid')
      .set('Authorization', `Bearer ${token}`)
      .send({ rating: 4, content: 'Nice!' })
      .expect(400)
  })

  it('rejects rating below 1', async () => {
    const res = await request(app)
      .post(`/api/reviews/${campsiteId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ rating: 0, content: 'Too low' })
      .expect(400)
    expect(res.body.error).toMatch(/rating/i)
  })

  it('rejects rating above 5', async () => {
    const res = await request(app)
      .post(`/api/reviews/${campsiteId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ rating: 6, content: 'Too high' })
      .expect(400)
    expect(res.body.error).toMatch(/rating/i)
  })

  it('rejects blank content', async () => {
    const res = await request(app)
      .post(`/api/reviews/${campsiteId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ rating: 4, content: '   ' })
      .expect(400)
    expect(res.body.error).toMatch(/content/i)
  })

  it('rejects content over 2000 characters', async () => {
    const res = await request(app)
      .post(`/api/reviews/${campsiteId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ rating: 3, content: 'x'.repeat(2001) })
      .expect(400)
    expect(res.body.error).toMatch(/2000/i)
  })

  it('returns 404 for nonexistent campsite', async () => {
    await request(app)
      .post('/api/reviews/999999')
      .set('Authorization', `Bearer ${token}`)
      .send({ rating: 3, content: 'No campsite here' })
      .expect(404)
  })

  it('creates a review successfully', async () => {
    const res = await request(app)
      .post(`/api/reviews/${campsiteId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ rating: 4, content: 'Great place to camp!' })
      .expect(200)
    expect(res.body.review.rating).toBe(4)
    expect(res.body.review.content).toBe('Great place to camp!')
    expect(res.body.review.user).toBeDefined()
    expect(res.body.review.user.passwordHash).toBeUndefined()
  })

  it('upserts (updates) an existing review', async () => {
    const res = await request(app)
      .post(`/api/reviews/${campsiteId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ rating: 5, content: 'Even better on second visit!' })
      .expect(200)
    expect(res.body.review.rating).toBe(5)
    expect(res.body.review.content).toBe('Even better on second visit!')
  })
})

// ---------------------------------------------------------------------------
// GET /api/reviews/:campsiteId after creating a review
// ---------------------------------------------------------------------------
describe('GET /api/reviews/:campsiteId (with data)', () => {
  it('returns aggregate with correct average and review list', async () => {
    const res = await request(app).get(`/api/reviews/${campsiteId}`).expect(200)
    expect(res.body.aggregate.total).toBeGreaterThanOrEqual(1)
    expect(res.body.aggregate.avg).not.toBeNull()
    expect(res.body.reviews.length).toBeGreaterThanOrEqual(1)
    expect(res.body.reviews[0].user.username !== undefined || res.body.reviews[0].user.id !== undefined).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// GET /api/reviews/mine after creating a review
// ---------------------------------------------------------------------------
describe('GET /api/reviews/mine (with data)', () => {
  it('returns the user\'s own review with campsite info', async () => {
    const res = await request(app)
      .get('/api/reviews/mine')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
    expect(res.body.reviews.length).toBeGreaterThanOrEqual(1)
    expect(res.body.reviews[0].campsite).toBeDefined()
    expect(res.body.reviews[0].campsite.id).toBe(campsiteId)
  })
})

// ---------------------------------------------------------------------------
// DELETE /api/reviews/:campsiteId  (auth required)
// ---------------------------------------------------------------------------
describe('DELETE /api/reviews/:campsiteId', () => {
  it('returns 401 without token', async () => {
    await request(app).delete(`/api/reviews/${campsiteId}`).expect(401)
  })

  it('deletes the user\'s review', async () => {
    const res = await request(app)
      .delete(`/api/reviews/${campsiteId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
    expect(res.body.message).toMatch(/deleted/i)
  })

  it('returns 404 when trying to delete a review that does not exist', async () => {
    await request(app)
      .delete(`/api/reviews/${campsiteId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(404)
  })
})
