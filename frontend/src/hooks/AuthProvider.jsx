import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiUrl } from '../utils/apiUrl'
import { AuthContext, TOKEN_KEY } from './authContext'

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(
    () => typeof localStorage !== 'undefined' && Boolean(localStorage.getItem(TOKEN_KEY)),
  )

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) return

    fetch(apiUrl('/api/auth/me'), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(({ user: me }) => setUser(me))
      .catch(() => localStorage.removeItem(TOKEN_KEY))
      .finally(() => setLoading(false))
  }, [])

  const saveSession = useCallback((token, me) => {
    localStorage.setItem(TOKEN_KEY, token)
    setUser(me)
  }, [])

  const register = useCallback(async (email, password) => {
    const res = await fetch(apiUrl('/api/auth/register'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Registration failed.')
    return data
  }, [])

  const login = useCallback(async (email, password) => {
    const res = await fetch(apiUrl('/api/auth/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Login failed.')
    saveSession(data.token, data.user)
    return data
  }, [saveSession])

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    setUser(null)
  }, [])

  const updateUser = useCallback((patch) => {
    setUser((prev) => (prev ? { ...prev, ...patch } : prev))
  }, [])

  const verifyEmail = useCallback(async (token) => {
    const res = await fetch(apiUrl(`/api/auth/verify-email?token=${encodeURIComponent(token)}`))
    let data = {}
    try {
      data = await res.json()
    } catch {
      throw new Error(
        res.ok
          ? 'Invalid response from server.'
          : `Could not reach the API (HTTP ${res.status}). Check VITE_API_URL and redeploy the frontend.`,
      )
    }
    if (!res.ok) throw new Error(data.error || 'Verification failed.')
    saveSession(data.token, data.user)
    return data
  }, [saveSession])

  const resendVerification = useCallback(async (email) => {
    const res = await fetch(apiUrl('/api/auth/resend-verification'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to resend.')
    return data
  }, [])

  const forgotPassword = useCallback(async (email) => {
    const res = await fetch(apiUrl('/api/auth/forgot-password'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || 'Request failed.')
    return data
  }, [])

  const resetPassword = useCallback(async (token, password) => {
    const res = await fetch(apiUrl('/api/auth/reset-password'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || 'Reset failed.')
    return data
  }, [])

  const value = useMemo(
    () => ({
      user,
      loading,
      register,
      login,
      logout,
      updateUser,
      verifyEmail,
      resendVerification,
      forgotPassword,
      resetPassword,
    }),
    [
      user,
      loading,
      register,
      login,
      logout,
      updateUser,
      verifyEmail,
      resendVerification,
      forgotPassword,
      resetPassword,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
