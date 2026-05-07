import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../hooks/useAuth'

/**
 * Modal with three views: 'login' | 'register' | 'check-email'
 *
 * Props:
 *  open     boolean  — whether the modal is visible
 *  onClose  ()=>void — called when user dismisses the modal
 */
export default function LoginModal({ open, onClose }) {
  const { login, register, resendVerification } = useAuth()
  const [view, setView] = useState('login')   // 'login' | 'register' | 'check-email'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [pendingEmail, setPendingEmail] = useState('')  // shown in the check-email view
  const emailRef = useRef(null)

  // Reset form whenever the modal opens or view changes.
  useEffect(() => {
    if (open) {
      setError('')
      setInfo('')
      setPassword('')
      setConfirmPassword('')
      setTimeout(() => emailRef.current?.focus(), 50)
    }
  }, [open, view])

  // Close on Escape key.
  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setInfo('')
    setSubmitting(true)

    try {
      if (view === 'login') {
        await login(email, password)
        onClose()
      } else {
        if (password !== confirmPassword) {
          setError('Passwords do not match.')
          return
        }
        await register(email, password)
        setPendingEmail(email)
        setView('check-email')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleResend() {
    setError('')
    setInfo('')
    setSubmitting(true)
    try {
      await resendVerification(pendingEmail)
      setInfo('A new verification link has been sent.')
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const modal = (
    /* Backdrop — rendered via portal directly into document.body to avoid
       Leaflet's z-index (1000+) stacking context swallowing the overlay. */
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="relative w-full max-w-sm rounded-2xl bg-white p-8 shadow-2xl">
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1 text-stone-400 hover:text-stone-600"
          aria-label="Close"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* ── Check-email view ── */}
        {view === 'check-email' && (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="m2 7 10 7 10-7" />
              </svg>
            </div>
            <h2 className="mb-2 text-xl font-bold text-stone-900">Check your inbox</h2>
            <p className="mb-1 text-sm text-stone-600">
              We sent a verification link to
            </p>
            <p className="mb-6 font-semibold text-emerald-700">{pendingEmail}</p>
            <p className="mb-6 text-xs text-stone-500">
              Click the link in the email to verify your account. The link expires in 24 hours.
            </p>
            {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
            {info  && <p className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{info}</p>}
            <button
              type="button"
              onClick={handleResend}
              disabled={submitting}
              className="mb-3 w-full rounded-xl border border-stone-200 py-2.5 text-sm font-medium text-stone-600 hover:bg-stone-50 disabled:opacity-50"
            >
              {submitting ? 'Sending…' : 'Resend verification email'}
            </button>
            <button
              type="button"
              onClick={() => { setView('login'); setEmail(pendingEmail) }}
              className="text-sm text-emerald-600 hover:underline"
            >
              Back to login
            </button>
          </div>
        )}

        {/* ── Login / Register form ── */}
        {view !== 'check-email' && (
          <>
            <h2 className="mb-6 text-center text-xl font-bold text-stone-900">
              {view === 'login' ? 'Welcome back' : 'Create an account'}
            </h2>

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              {/* Email */}
              <div>
                <label className="mb-1 block text-xs font-medium text-stone-600" htmlFor="auth-email">
                  Email address
                </label>
                <input
                  ref={emailRef}
                  id="auth-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-stone-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                />
              </div>

              {/* Password */}
              <div>
                <label className="mb-1 block text-xs font-medium text-stone-600" htmlFor="auth-password">
                  Password
                </label>
                <input
                  id="auth-password"
                  type="password"
                  autoComplete={view === 'login' ? 'current-password' : 'new-password'}
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={view === 'login' ? 'Your password' : 'At least 8 characters'}
                  className="w-full rounded-xl border border-stone-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                />
              </div>

              {/* Confirm password (register only) */}
              {view === 'register' && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-stone-600" htmlFor="auth-confirm">
                    Confirm password
                  </label>
                  <input
                    id="auth-confirm"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full rounded-xl border border-stone-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>
              )}

              {/* Error / info */}
              {error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
              >
                {submitting
                  ? (view === 'login' ? 'Logging in…' : 'Creating account…')
                  : (view === 'login' ? 'Log in' : 'Create account')}
              </button>
            </form>

            {/* Toggle login ↔ register */}
            <p className="mt-5 text-center text-sm text-stone-500">
              {view === 'login' ? (
                <>
                  Don&apos;t have an account?{' '}
                  <button
                    type="button"
                    onClick={() => { setView('register'); setError('') }}
                    className="font-medium text-emerald-600 hover:underline"
                  >
                    Sign up
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => { setView('login'); setError('') }}
                    className="font-medium text-emerald-600 hover:underline"
                  >
                    Log in
                  </button>
                </>
              )}
            </p>
          </>
        )}
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}
