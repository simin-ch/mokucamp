import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function ResetPasswordPage() {
  const { resetPassword } = useAuth()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [token, setToken] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    const t = searchParams.get('token') || ''
    setToken(t)
    if (!t) setError('Reset link is missing or invalid. Request a new link from the login page.')
  }, [searchParams])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!token) return
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setSubmitting(true)
    try {
      await resetPassword(token, password)
      setDone(true)
    } catch (err) {
      setError(err.message || 'Reset failed.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-100 p-6">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl">
        {done ? (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2 className="mb-2 text-xl font-bold text-stone-900">Password updated</h2>
            <p className="mb-6 text-sm text-stone-500">
              You can now log in with your new password.
            </p>
            <button
              type="button"
              onClick={() => navigate('/', { replace: true })}
              className="w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Back to home
            </button>
          </div>
        ) : (
          <>
            <h2 className="mb-1 text-center text-xl font-bold text-stone-900">Set a new password</h2>
            <p className="mb-6 text-center text-xs text-stone-500">Choose a strong password you haven&apos;t used elsewhere.</p>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div>
                <label className="mb-1 block text-xs font-medium text-stone-600" htmlFor="reset-pw">
                  New password
                </label>
                <input
                  id="reset-pw"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  disabled={!token}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-stone-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 disabled:bg-stone-50"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-stone-600" htmlFor="reset-pw2">
                  Confirm password
                </label>
                <input
                  id="reset-pw2"
                  type="password"
                  autoComplete="new-password"
                  required
                  disabled={!token}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="w-full rounded-xl border border-stone-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 disabled:bg-stone-50"
                />
              </div>
              {error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
              )}
              <button
                type="submit"
                disabled={submitting || !token}
                className="w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
              >
                {submitting ? 'Saving…' : 'Update password'}
              </button>
            </form>

            <p className="mt-5 text-center text-sm text-stone-500">
              <Link to="/" className="font-medium text-emerald-600 hover:underline">
                Back to home
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
