import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const AuthContext = createContext(null)

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000'
const TOKEN_KEY = 'mokucamp_auth_token'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)  // true while checking stored token

  // On mount, restore session from localStorage.
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) {
      setLoading(false)
      return
    }
    fetch(`${API}/api/auth/me`, {
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
    const res = await fetch(`${API}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Registration failed.')
    return data
  }, [])

  const login = useCallback(async (email, password) => {
    const res = await fetch(`${API}/api/auth/login`, {
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
    setUser((prev) => prev ? { ...prev, ...patch } : prev)
  }, [])

  const verifyEmail = useCallback(async (token) => {
    const res = await fetch(`${API}/api/auth/verify-email?token=${encodeURIComponent(token)}`)
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Verification failed.')
    saveSession(data.token, data.user)
    return data
  }, [saveSession])

  const resendVerification = useCallback(async (email) => {
    const res = await fetch(`${API}/api/auth/resend-verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to resend.')
    return data
  }, [])

  const forgotPassword = useCallback(async (email) => {
    const res = await fetch(`${API}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || 'Request failed.')
    return data
  }, [])

  const resetPassword = useCallback(async (token, password) => {
    const res = await fetch(`${API}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || 'Reset failed.')
    return data
  }, [])

  const value = useMemo(() => ({
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
  }), [user, loading, register, login, logout, updateUser, verifyEmail, resendVerification, forgotPassword, resetPassword])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
