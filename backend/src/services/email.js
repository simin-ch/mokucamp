const nodemailer = require('nodemailer')

/**
 * Build a nodemailer transporter.
 *
 * In development (EMAIL_USER not set) we use Ethereal — a fake SMTP service
 * that captures outgoing mail so you can preview it without actually sending.
 * In production set EMAIL_HOST/USER/PASS to your real SMTP provider.
 */
async function createTransporter() {
  if (!process.env.EMAIL_USER) {
    // Auto-create an Ethereal test account. Credentials are printed to console.
    const testAccount = await nodemailer.createTestAccount()
    console.log('📧  Ethereal test account created:')
    console.log('    User:', testAccount.user)
    console.log('    Pass:', testAccount.pass)
    console.log('    Preview URL: https://ethereal.email/messages')

    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass },
    })
  }

  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  })
}

/** Rebuild transporter when SMTP env changes (e.g. Render vars updated without full redeploy semantics). */
function smtpConfigFingerprint() {
  const host = process.env.EMAIL_HOST || ''
  const user = process.env.EMAIL_USER || ''
  const passLen = (process.env.EMAIL_PASS || '').length
  return `${host}|${user}|${passLen}`
}

let _transporter = null
let _transporterFingerprint = ''

async function getTransporter() {
  const fp = smtpConfigFingerprint()
  if (!_transporter || _transporterFingerprint !== fp) {
    _transporter = await createTransporter()
    _transporterFingerprint = fp
  }
  return _transporter
}

function recipientDomain(email) {
  const i = String(email).indexOf('@')
  return i === -1 ? '(invalid)' : String(email).slice(i)
}

/**
 * Send an email verification link to a newly registered user.
 * @param {string} toEmail   - recipient address
 * @param {string} token     - the raw verification token (stored hashed in DB)
 */
async function sendVerificationEmail(toEmail, token) {
  const mode = process.env.EMAIL_USER ? 'smtp' : 'ethereal'
  console.info('[email] verification send start', {
    toDomain: recipientDomain(toEmail),
    mode,
    host: process.env.EMAIL_HOST || '(ethereal)',
  })

  const transporter = await getTransporter()
  const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${token}`

  const info = await transporter.sendMail({
    from: process.env.EMAIL_FROM || 'Mokucamp <no-reply@mokucamp.app>',
    to: toEmail,
    subject: 'Confirm your Mokucamp account',
    text: `Hi! Please verify your email address by clicking the link below:\n\n${verifyUrl}\n\nThis link expires in 24 hours.`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto">
        <h2 style="color:#059669">Welcome to Mokucamp 🏕</h2>
        <p>Please confirm your email address to activate your account.</p>
        <a href="${verifyUrl}"
           style="display:inline-block;margin:16px 0;padding:12px 24px;background:#059669;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
          Verify Email
        </a>
        <p style="color:#6b7280;font-size:13px">Link expires in 24 hours. If you didn't sign up, you can safely ignore this email.</p>
      </div>
    `,
  })

  console.info('[email] verification sent', {
    messageId: info.messageId,
    accepted: info.accepted,
    rejected: info.rejected,
  })

  // In development, print the Ethereal preview URL to the console.
  if (nodemailer.getTestMessageUrl(info)) {
    console.log('📬  Preview email at:', nodemailer.getTestMessageUrl(info))
  }
}

/**
 * Send a password-reset link.
 */
async function sendPasswordResetEmail(toEmail, token) {
  const mode = process.env.EMAIL_USER ? 'smtp' : 'ethereal'
  console.info('[email] password-reset send start', {
    toDomain: recipientDomain(toEmail),
    mode,
    host: process.env.EMAIL_HOST || '(ethereal)',
  })

  const transporter = await getTransporter()
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`

  const info = await transporter.sendMail({
    from: process.env.EMAIL_FROM || 'Mokucamp <no-reply@mokucamp.app>',
    to: toEmail,
    subject: 'Reset your Mokucamp password',
    text: `Click the link below to reset your password:\n\n${resetUrl}\n\nThis link expires in 1 hour.`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto">
        <h2 style="color:#059669">Reset your password</h2>
        <p>We received a request to reset your Mokucamp password.</p>
        <a href="${resetUrl}"
           style="display:inline-block;margin:16px 0;padding:12px 24px;background:#059669;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
          Reset Password
        </a>
        <p style="color:#6b7280;font-size:13px">Link expires in 1 hour. If you didn't request this, ignore this email.</p>
      </div>
    `,
  })

  console.info('[email] password-reset sent', {
    messageId: info.messageId,
    accepted: info.accepted,
    rejected: info.rejected,
  })

  if (nodemailer.getTestMessageUrl(info)) {
    console.log('📬  Preview email at:', nodemailer.getTestMessageUrl(info))
  }
}

module.exports = { sendVerificationEmail, sendPasswordResetEmail }
