import { createContext, useContext } from 'react'

export const AuthContext = createContext(null)

export const API = import.meta.env.VITE_API_URL || 'http://localhost:4000'
export const TOKEN_KEY = 'mokucamp_auth_token'

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
