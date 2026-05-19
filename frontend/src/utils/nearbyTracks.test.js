import { describe, expect, it } from 'vitest'
import { hasWalkingAndTramping } from './nearbyTracks'

describe('hasWalkingAndTramping', () => {
  it('returns false when activities is missing', () => {
    expect(hasWalkingAndTramping(null)).toBe(false)
    expect(hasWalkingAndTramping(undefined)).toBe(false)
  })

  it('matches the exact DOC activity token', () => {
    expect(hasWalkingAndTramping('Fishing, Walking and tramping')).toBe(true)
    expect(hasWalkingAndTramping('Walking & tramping')).toBe(false)
  })
})
