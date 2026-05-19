import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiOrigin, apiUrl } from './apiUrl'

describe('apiUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns relative paths when VITE_API_URL is unset', () => {
    vi.stubEnv('VITE_API_URL', '')
    expect(apiOrigin()).toBe('')
    expect(apiUrl('/api/campsites')).toBe('/api/campsites')
  })

  it('prefixes paths with a trimmed API origin', () => {
    vi.stubEnv('VITE_API_URL', 'https://api.example.com///')
    expect(apiOrigin()).toBe('https://api.example.com')
    expect(apiUrl('api/health')).toBe('https://api.example.com/api/health')
  })
})
