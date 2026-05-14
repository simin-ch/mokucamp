const rateLimit = require('express-rate-limit')

function skipInTest() {
  return process.env.NODE_ENV === 'test'
}

/** POST /forgot-password — caps outbound reset emails per IP. */
const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
  message: { error: 'Too many password reset requests. Please try again in a few minutes.' },
})

/** POST /resend-verification */
const resendVerificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
  message: { error: 'Too many verification emails requested. Please try again later.' },
})

/** POST /reset-password */
const resetPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
  message: { error: 'Too many password reset attempts. Please try again later.' },
})

/** POST /login */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
  message: { error: 'Too many login attempts. Please try again later.' },
})

/** POST /register */
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
  message: { error: 'Too many accounts created from this network. Please try again later.' },
})

module.exports = {
  forgotPasswordLimiter,
  resendVerificationLimiter,
  resetPasswordLimiter,
  loginLimiter,
  registerLimiter,
}
