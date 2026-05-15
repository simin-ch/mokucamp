jest.mock('../src/services/email')

const crypto = require('crypto')
const request = require('supertest')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const { PrismaClient } = require('@prisma/client')
const app = require('../src/app')
const { sendVerificationEmail, sendPasswordResetEmail } = require('../src/services/email')

const prisma = new PrismaClient()
const DOMAIN = '@auth-test.example'

function email(label) {
  return `${label}${DOMAIN}`
}

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { email: { contains: DOMAIN } } })
})

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { contains: DOMAIN } } })
  await prisma.$disconnect()
})

beforeEach(() => {
  sendVerificationEmail.mockReset()
  sendVerificationEmail.mockResolvedValue()
  sendPasswordResetEmail.mockReset()
  sendPasswordResetEmail.mockResolvedValue()
})

// ---------------------------------------------------------------------------
// Register
// ---------------------------------------------------------------------------
describe('POST /api/auth/register', () => {
  it('rejects missing fields', async () => {
    const res = await request(app).post('/api/auth/register').send({}).expect(400)
    expect(res.body.error).toBeDefined()
  })

  it('rejects invalid email format', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'notanemail', password: 'password123' })
      .expect(400)
    expect(res.body.error).toMatch(/email/i)
  })

  it('rejects password shorter than 8 characters', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: email('short-pw'), password: 'abc' })
      .expect(400)
    expect(res.body.error).toMatch(/8 characters/i)
  })

  it('creates account and sends verification email', async () => {
    const addr = email('register-ok')
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: addr, password: 'password123' })
      .expect(201)
    expect(res.body.message).toMatch(/verify/i)
    expect(sendVerificationEmail).toHaveBeenCalledWith(addr, expect.any(String))
  })

  it('returns 201 silently for duplicate email (anti-enumeration)', async () => {
    const addr = email('duplicate')
    await request(app).post('/api/auth/register').send({ email: addr, password: 'password123' }).expect(201)
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: addr, password: 'password123' })
      .expect(201)
    expect(res.body.message).toBeDefined()
  })
})

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------
describe('POST /api/auth/login', () => {
  const addr = email('login-user')
  const password = 'password123'

  beforeAll(async () => {
    const hash = await bcrypt.hash(password, 10)
    await prisma.user.upsert({
      where: { email: addr },
      create: { email: addr, passwordHash: hash, emailVerified: true },
      update: {},
    })
  })

  it('rejects missing credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({}).expect(400)
    expect(res.body.error).toBeDefined()
  })

  it('rejects wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: addr, password: 'wrongpassword' })
      .expect(401)
    expect(res.body.error).toMatch(/Invalid/i)
  })

  it('rejects unknown user with same message (anti-enumeration)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: email('nobody'), password: 'password123' })
      .expect(401)
    expect(res.body.error).toMatch(/Invalid/i)
  })

  it('rejects unverified email with 403', async () => {
    const unverified = email('unverified')
    const hash = await bcrypt.hash(password, 10)
    await prisma.user.upsert({
      where: { email: unverified },
      create: { email: unverified, passwordHash: hash, emailVerified: false },
      update: {},
    })
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: unverified, password })
      .expect(403)
    expect(res.body.code).toBe('EMAIL_NOT_VERIFIED')
  })

  it('returns JWT and user on success', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: addr, password })
      .expect(200)
    expect(res.body.token).toBeDefined()
    expect(res.body.user.email).toBe(addr)
  })
})

// ---------------------------------------------------------------------------
// Verify email
// ---------------------------------------------------------------------------
describe('GET /api/auth/verify-email', () => {
  it('rejects missing token', async () => {
    const res = await request(app).get('/api/auth/verify-email').expect(400)
    expect(res.body.error).toBeDefined()
  })

  it('rejects invalid token', async () => {
    const res = await request(app)
      .get('/api/auth/verify-email')
      .query({ token: 'totallyinvalidtoken' })
      .expect(400)
    expect(res.body.error).toBeDefined()
  })

  it('verifies a valid token and returns JWT', async () => {
    const addr = email('verify-ok')
    const rawToken = crypto.randomBytes(32).toString('hex')
    const hashed = crypto.createHash('sha256').update(rawToken).digest('hex')
    const expiry = new Date(Date.now() + 60 * 60 * 1000)
    const hash = await bcrypt.hash('password123', 10)

    await prisma.user.upsert({
      where: { email: addr },
      create: { email: addr, passwordHash: hash, emailVerified: false, verificationToken: hashed, verificationTokenExpiry: expiry },
      update: { verificationToken: hashed, verificationTokenExpiry: expiry, emailVerified: false },
    })

    const res = await request(app).get('/api/auth/verify-email').query({ token: rawToken }).expect(200)
    expect(res.body.token).toBeDefined()
    expect(res.body.message).toMatch(/verified/i)
  })

  it('rejects expired token', async () => {
    const addr = email('verify-expired')
    const rawToken = crypto.randomBytes(32).toString('hex')
    const hashed = crypto.createHash('sha256').update(rawToken).digest('hex')
    const expiry = new Date(Date.now() - 1000)
    const hash = await bcrypt.hash('password123', 10)

    await prisma.user.upsert({
      where: { email: addr },
      create: { email: addr, passwordHash: hash, emailVerified: false, verificationToken: hashed, verificationTokenExpiry: expiry },
      update: { verificationToken: hashed, verificationTokenExpiry: expiry },
    })

    const res = await request(app).get('/api/auth/verify-email').query({ token: rawToken }).expect(400)
    expect(res.body.error).toMatch(/expired/i)
  })
})

// ---------------------------------------------------------------------------
// Forgot / reset password
// ---------------------------------------------------------------------------
describe('POST /api/auth/forgot-password and reset-password', () => {
  const addr = email('reset-user')
  const password = 'password123'

  beforeAll(async () => {
    const hash = await bcrypt.hash(password, 10)
    await prisma.user.upsert({
      where: { email: addr },
      create: { email: addr, passwordHash: hash, emailVerified: true },
      update: {},
    })
  })

  it('forgot-password returns 200 for nonexistent email (anti-enumeration)', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: email('no-such-user') })
      .expect(200)
    expect(res.body.message).toBeDefined()
    expect(sendPasswordResetEmail).not.toHaveBeenCalled()
  })

  it('forgot-password sends reset email for existing user', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: addr })
      .expect(200)
    expect(res.body.message).toBeDefined()
    expect(sendPasswordResetEmail).toHaveBeenCalledWith(addr, expect.any(String))
  })

  it('reset-password rejects missing fields', async () => {
    const res = await request(app).post('/api/auth/reset-password').send({}).expect(400)
    expect(res.body.error).toBeDefined()
  })

  it('reset-password rejects short new password', async () => {
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'anytoken', password: 'short' })
      .expect(400)
    expect(res.body.error).toMatch(/8 characters/i)
  })

  it('reset-password rejects invalid token', async () => {
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'badtoken123', password: 'newpassword123' })
      .expect(400)
    expect(res.body.error).toBeDefined()
  })

  it('reset-password succeeds with a valid token', async () => {
    const rawToken = crypto.randomBytes(32).toString('hex')
    const hashed = crypto.createHash('sha256').update(rawToken).digest('hex')
    const expiry = new Date(Date.now() + 60 * 60 * 1000)
    await prisma.user.update({
      where: { email: addr },
      data: { resetToken: hashed, resetTokenExpiry: expiry },
    })

    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: rawToken, password: 'newpassword123' })
      .expect(200)
    expect(res.body.message).toMatch(/reset/i)
  })
})

// ---------------------------------------------------------------------------
// GET /me and PATCH /profile
// ---------------------------------------------------------------------------
describe('GET /api/auth/me and PATCH /api/auth/profile', () => {
  let token
  const addr = email('me-user')

  beforeAll(async () => {
    const hash = await bcrypt.hash('password123', 10)
    const user = await prisma.user.upsert({
      where: { email: addr },
      create: { email: addr, passwordHash: hash, emailVerified: true },
      update: {},
    })
    token = jwt.sign({ sub: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' })
  })

  it('GET /me returns 401 without token', async () => {
    await request(app).get('/api/auth/me').expect(401)
  })

  it('GET /me returns 401 with invalid token', async () => {
    await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid.token.here')
      .expect(401)
  })

  it('GET /me returns user info with valid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
    expect(res.body.user.email).toBe(addr)
    expect(res.body.user.passwordHash).toBeUndefined()
  })

  it('PATCH /profile returns 401 without token', async () => {
    await request(app).patch('/api/auth/profile').send({ username: 'Test' }).expect(401)
  })

  it('PATCH /profile rejects username too short', async () => {
    const res = await request(app)
      .patch('/api/auth/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ username: 'X' })
      .expect(400)
    expect(res.body.error).toMatch(/2.*20/i)
  })

  it('PATCH /profile updates username', async () => {
    const res = await request(app)
      .patch('/api/auth/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ username: 'CampFan' })
      .expect(200)
    expect(res.body.user.username).toBe('CampFan')
  })
})

// ---------------------------------------------------------------------------
// POST /change-password
// ---------------------------------------------------------------------------
describe('POST /api/auth/change-password', () => {
  let token
  const addr = email('change-pw-user')
  const currentPassword = 'OldPassword123'

  beforeAll(async () => {
    const hash = await bcrypt.hash(currentPassword, 10)
    const user = await prisma.user.upsert({
      where: { email: addr },
      create: { email: addr, passwordHash: hash, emailVerified: true },
      update: { passwordHash: hash },
    })
    token = jwt.sign({ sub: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' })
  })

  it('returns 401 without token', async () => {
    await request(app).post('/api/auth/change-password').send({}).expect(401)
  })

  it('rejects missing fields', async () => {
    const res = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({})
      .expect(400)
    expect(res.body.error).toBeDefined()
  })

  it('rejects short new password', async () => {
    const res = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword, newPassword: 'short' })
      .expect(400)
    expect(res.body.error).toMatch(/8 characters/i)
  })

  it('rejects wrong current password', async () => {
    const res = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'wrongpassword', newPassword: 'NewPassword123' })
      .expect(401)
    expect(res.body.error).toMatch(/incorrect/i)
  })

  it('succeeds with correct current password', async () => {
    const res = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword, newPassword: 'NewPassword123' })
      .expect(200)
    expect(res.body.message).toMatch(/updated/i)
  })
})
