import { createContext, useContext } from 'react'
import { apiOrigin } from '../utils/apiUrl'

export const AuthContext = createContext(null)

/** Same origin resolution as apiUrl(); use for legacy `${API}/api/...` patterns. */
export const API = apiOrigin() || 'http://localhost:4000'
export const TOKEN_KEY = 'mokucamp_auth_token'

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
