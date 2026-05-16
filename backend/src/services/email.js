const sgMail = require('@sendgrid/mail')
const nodemailer = require('nodemailer')

/**
 * Email delivery:
 *
 * Production (EMAIL_SENDGRID_API_KEY set):
 *   Uses SendGrid HTTP API — works on Render free tier (no SMTP port block).
 *
 * Local dev (no API key):
 *   Falls back to Ethereal (fake SMTP). Preview URLs are printed to console.
 */

function recipientDomain(email) {
  const i = String(email).indexOf('@')
  return i === -1 ? '(invalid)' : String(email).slice(i)
}

// ---------------------------------------------------------------------------
// SendGrid HTTP API path
// ---------------------------------------------------------------------------

function getSendGridKey() {
  // Accept either dedicated var or the legacy EMAIL_PASS (which holds the SG key)
  return process.env.EMAIL_SENDGRID_API_KEY || process.env.EMAIL_PASS || ''
}

async function sendViaSendGrid(toEmail, subject, text, html) {
  sgMail.setApiKey(getSendGridKey())
  const from = process.env.EMAIL_FROM || 'Mokucamp <no-reply@mokucamp.app>'
  const response = await sgMail.send({ to: toEmail, from, subject, text, html })
  return response
}

// ---------------------------------------------------------------------------
// Ethereal fallback (local dev)
// ---------------------------------------------------------------------------

let _etherealTransporter = null

async function getEtherealTransporter() {
  if (_etherealTransporter) return _etherealTransporter
  const testAccount = await nodemailer.createTestAccount()
  console.log('📧  Ethereal test account created:')
  console.log('    User:', testAccount.user)
  console.log('    Preview URL: https://ethereal.email/messages')
  _etherealTransporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: { user: testAccount.user, pass: testAccount.pass },
  })
  return _etherealTransporter
}

async function sendViaEthereal(toEmail, subject, text, html) {
  const transporter = await getEtherealTransporter()
  const from = process.env.EMAIL_FROM || 'Mokucamp <no-reply@mokucamp.app>'
  const info = await transporter.sendMail({ from, to: toEmail, subject, text, html })
  if (nodemailer.getTestMessageUrl(info)) {
    console.log('📬  Preview email at:', nodemailer.getTestMessageUrl(info))
  }
  return info
}

// ---------------------------------------------------------------------------
// Internal send helper
// ---------------------------------------------------------------------------

async function send(toEmail, subject, text, html) {
  const apiKey = getSendGridKey()
  const mode = apiKey ? 'sendgrid-http' : 'ethereal'
  console.info('[email] send start', {
    toDomain: recipientDomain(toEmail),
    mode,
    subject,
  })

  try {
    if (apiKey) {
      await sendViaSendGrid(toEmail, subject, text, html)
    } else {
      await sendViaEthereal(toEmail, subject, text, html)
    }
    console.info('[email] send ok', { toDomain: recipientDomain(toEmail) })
  } catch (err) {
    const body = err.response?.body ?? err.response ?? undefined
    console.error('[email] send failed', {
      message: err.message,
      code: err.code,
      statusCode: err.code,
      body,
    })
    throw err
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

async function sendVerificationEmail(toEmail, token) {
  const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${token}`
  const subject = 'Confirm your Mokucamp account'
  const text = `Hi! Please verify your email address by clicking the link below:\n\n${verifyUrl}\n\nThis link expires in 24 hours.`
  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:auto">
      <h2 style="color:#059669">Welcome to Mokucamp 🏕</h2>
      <p>Please confirm your email address to activate your account.</p>
      <a href="${verifyUrl}"
         style="display:inline-block;margin:16px 0;padding:12px 24px;background:#059669;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
        Verify Email
      </a>
      <p style="color:#6b7280;font-size:13px">Link expires in 24 hours. If you didn't sign up, you can safely ignore this email.</p>
    </div>
  `
  await send(toEmail, subject, text, html)
}

async function sendPasswordResetEmail(toEmail, token) {
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`
  const subject = 'Reset your Mokucamp password'
  const text = `Click the link below to reset your password:\n\n${resetUrl}\n\nThis link expires in 1 hour.`
  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:auto">
      <h2 style="color:#059669">Reset your password</h2>
      <p>We received a request to reset your Mokucamp password.</p>
      <a href="${resetUrl}"
         style="display:inline-block;margin:16px 0;padding:12px 24px;background:#059669;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
        Reset Password
      </a>
      <p style="color:#6b7280;font-size:13px">Link expires in 1 hour. If you didn't request this, ignore this email.</p>
    </div>
  `
  await send(toEmail, subject, text, html)
}

module.exports = { sendVerificationEmail, sendPasswordResetEmail }
