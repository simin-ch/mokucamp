const express = require('express')
const crypto = require('crypto')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { PrismaClient } = require('@prisma/client')
const { sendVerificationEmail, sendPasswordResetEmail } = require('../services/email')
const authenticate = require('../middleware/authenticate')
const {
  forgotPasswordLimiter,
  resendVerificationLimiter,
  resetPasswordLimiter,
  loginLimiter,
  registerLimiter,
} = require('../middleware/authRateLimit')

const router = express.Router()
const prisma = new PrismaClient()

const BCRYPT_ROUNDS = 12
const VERIFY_TOKEN_TTL_MS = 24 * 60 * 60 * 1000  // 24 hours
const RESET_TOKEN_TTL_MS  = 60 * 60 * 1000        // 1 hour

/** Generate a URL-safe random token and its SHA-256 hash. */
function generateToken() {
  const raw = crypto.randomBytes(32).toString('hex')
  const hashed = crypto.createHash('sha256').update(raw).digest('hex')
  return { raw, hashed }
}

/** Sign a JWT for the given user. */
function signJwt(user) {
  return jwt.sign(
    { sub: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  )
}

// ---------------------------------------------------------------------------
// POST /api/auth/register
// ---------------------------------------------------------------------------
router.post('/register', registerLimiter, async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' })
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' })
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' })
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    if (existing.emailVerified) {
      return res.status(409).json({
        error: 'This email is already registered. Please log in instead.',
      })
    }
    const { raw: rawToken, hashed: hashedToken } = generateToken()
    const expiry = new Date(Date.now() + VERIFY_TOKEN_TTL_MS)
    await prisma.user.update({
      where: { id: existing.id },
      data: { verificationToken: hashedToken, verificationTokenExpiry: expiry },
    })
    sendVerificationEmail(email, rawToken).catch((err) =>
      console.error('Failed to send verification email:', err.message),
    )
    return res.status(409).json({
      error:
        'This email is already registered but not verified yet. Check your inbox for a new verification link (we just sent one).',
    })
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS)
  const { raw: rawToken, hashed: hashedToken } = generateToken()
  const expiry = new Date(Date.now() + VERIFY_TOKEN_TTL_MS)

  await prisma.user.create({
    data: {
      email,
      passwordHash,
      verificationToken: hashedToken,
      verificationTokenExpiry: expiry,
    },
  })

  // Send verification email — we intentionally don't await in a try/catch
  // so a mail failure doesn't prevent registration from succeeding.
  sendVerificationEmail(email, rawToken).catch((err) =>
    console.error('Failed to send verification email:', err.message)
  )

  return res.status(201).json({
    message: 'Account created! Please check your email to verify your address before logging in.',
  })
})

// ---------------------------------------------------------------------------
// POST /api/auth/login
// ---------------------------------------------------------------------------
router.post('/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' })
  }

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    // Use the same message for missing user and wrong password to avoid enumeration.
    return res.status(401).json({ error: 'Invalid email or password.' })
  }

  const passwordMatch = await bcrypt.compare(password, user.passwordHash)
  if (!passwordMatch) {
    return res.status(401).json({ error: 'Invalid email or password.' })
  }

  if (!user.emailVerified) {
    return res.status(403).json({
      error: 'Please verify your email address before logging in.',
      code: 'EMAIL_NOT_VERIFIED',
    })
  }

  const token = signJwt(user)
  return res.json({
    token,
    user: { id: user.id, email: user.email },
  })
})

// ---------------------------------------------------------------------------
// GET /api/auth/verify-email?token=<raw_token>
// ---------------------------------------------------------------------------
router.get('/verify-email', async (req, res) => {
  const { token } = req.query
  if (!token) {
    return res.status(400).json({ error: 'Verification token is missing.' })
  }

  const hashed = crypto.createHash('sha256').update(token).digest('hex')

  const user = await prisma.user.findUnique({ where: { verificationToken: hashed } })
  if (!user) {
    return res.status(400).json({ error: 'Invalid or already-used verification link.' })
  }
  if (user.verificationTokenExpiry < new Date()) {
    return res.status(400).json({ error: 'Verification link has expired. Please register again or request a new link.' })
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      verificationToken: null,
      verificationTokenExpiry: null,
    },
  })

  // Issue a JWT so the user is logged in immediately after verifying.
  const jwtToken = signJwt(user)
  return res.json({
    message: 'Email verified! You are now logged in.',
    token: jwtToken,
    user: { id: user.id, email: user.email },
  })
})

// ---------------------------------------------------------------------------
// POST /api/auth/resend-verification
// ---------------------------------------------------------------------------
router.post('/resend-verification', resendVerificationLimiter, async (req, res) => {
  const { email } = req.body
  if (!email) return res.status(400).json({ error: 'Email is required.' })

  const user = await prisma.user.findUnique({ where: { email } })
  // Always respond the same way to avoid email enumeration.
  if (!user || user.emailVerified) {
    return res.json({ message: 'If that address is registered and unverified, a new link has been sent.' })
  }

  const { raw: rawToken, hashed: hashedToken } = generateToken()
  const expiry = new Date(Date.now() + VERIFY_TOKEN_TTL_MS)

  await prisma.user.update({
    where: { id: user.id },
    data: { verificationToken: hashedToken, verificationTokenExpiry: expiry },
  })

  sendVerificationEmail(email, rawToken).catch((err) =>
    console.error('Failed to resend verification email:', err.message)
  )

  return res.json({ message: 'If that address is registered and unverified, a new link has been sent.' })
})

// ---------------------------------------------------------------------------
// POST /api/auth/forgot-password
// ---------------------------------------------------------------------------
router.post('/forgot-password', forgotPasswordLimiter, async (req, res) => {
  const { email } = req.body
  if (!email) return res.status(400).json({ error: 'Email is required.' })

  const user = await prisma.user.findUnique({ where: { email } })
  if (user) {
    const { raw: rawToken, hashed: hashedToken } = generateToken()
    const expiry = new Date(Date.now() + RESET_TOKEN_TTL_MS)

    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken: hashedToken, resetTokenExpiry: expiry },
    })

    sendPasswordResetEmail(email, rawToken).catch((err) =>
      console.error('Failed to send reset email:', err.message)
    )
  }

  return res.json({ message: 'If an account exists for that email, a reset link has been sent.' })
})

// ---------------------------------------------------------------------------
// POST /api/auth/reset-password
// ---------------------------------------------------------------------------
router.post('/reset-password', resetPasswordLimiter, async (req, res) => {
  const { token, password } = req.body
  if (!token || !password) return res.status(400).json({ error: 'Token and new password are required.' })
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' })

  const hashed = crypto.createHash('sha256').update(token).digest('hex')
  const user = await prisma.user.findUnique({ where: { resetToken: hashed } })

  if (!user || user.resetTokenExpiry < new Date()) {
    return res.status(400).json({ error: 'Reset link is invalid or has expired.' })
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS)
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      emailVerified: true,  // implicitly verify email on password reset
      resetToken: null,
      resetTokenExpiry: null,
    },
  })

  return res.json({ message: 'Password reset successfully. You can now log in.' })
})

// ---------------------------------------------------------------------------
// POST /api/auth/change-password  (protected)
// ---------------------------------------------------------------------------
router.post('/change-password', authenticate, async (req, res) => {
  const { currentPassword, newPassword } = req.body
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current password and new password are required.' })
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters.' })
  }

  const user = await prisma.user.findUnique({ where: { id: req.user.id } })
  const match = await bcrypt.compare(currentPassword, user.passwordHash)
  if (!match) {
    return res.status(401).json({ error: 'Current password is incorrect.' })
  }

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS)
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } })

  return res.json({ message: 'Password updated successfully.' })
})

// ---------------------------------------------------------------------------
// GET /api/auth/me  (protected — requires Bearer token)
// ---------------------------------------------------------------------------
router.get('/me', authenticate, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { id: true, email: true, username: true, emailVerified: true, createdAt: true },
  })
  if (!user) return res.status(404).json({ error: 'User not found.' })
  return res.json({ user })
})

// ---------------------------------------------------------------------------
// PATCH /api/auth/profile  (protected)
// Body: { username?: string }
// ---------------------------------------------------------------------------
router.patch('/profile', authenticate, async (req, res) => {
  const { username } = req.body

  if (username !== undefined) {
    if (typeof username !== 'string') {
      return res.status(400).json({ error: 'username must be a string.' })
    }
    const trimmed = username.trim()
    if (trimmed.length < 2 || trimmed.length > 20) {
      return res.status(400).json({ error: 'Username must be between 2 and 20 characters.' })
    }
    if (!/^[\w\u4e00-\u9fa5\- ]+$/.test(trimmed)) {
      return res.status(400).json({ error: 'Username contains invalid characters.' })
    }
  }

  const updated = await prisma.user.update({
    where: { id: req.user.id },
    data: { username: username !== undefined ? username.trim() : undefined },
    select: { id: true, email: true, username: true, emailVerified: true, createdAt: true },
  })

  return res.json({ user: updated })
})

module.exports = router
