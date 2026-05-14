import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function EmailVerifyPage() {
  const { verifyEmail } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState('loading')  // 'loading' | 'success' | 'error'
  const [message, setMessage] = useState('')
  const calledRef = useRef(false)

  useEffect(() => {
    if (calledRef.current) return
    calledRef.current = true

    const token = searchParams.get('token')

    if (!token) {
      setStatus('error')
      setMessage('Verification token is missing from the URL.')
      return
    }

    verifyEmail(token)
      .then(({ message: msg }) => {
        setMessage(msg || 'Email verified! Redirecting…')
        setStatus('success')
        setTimeout(() => navigate('/', { replace: true }), 2000)
      })
      .catch((err) => {
        setStatus('error')
        setMessage(err.message || 'Verification failed.')
      })
  }, [verifyEmail, searchParams, navigate])

  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-100 p-6">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-xl">
        {status === 'loading' && (
          <>
            <div className="mx-auto mb-5 h-12 w-12 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
            <p className="text-stone-600">Verifying your email…</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2 className="mb-2 text-xl font-bold text-stone-900">Email verified!</h2>
            <p className="text-sm text-stone-500">{message}</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h2 className="mb-2 text-xl font-bold text-stone-900">Verification failed</h2>
            <p className="mb-5 text-sm text-stone-500">{message}</p>
            <a
              href="/"
              className="inline-block rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Back to home
            </a>
          </>
        )}
      </div>
    </div>
  )
}
