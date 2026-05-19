import { describe, expect, it } from 'vitest'
import {
  buildMapQueryString,
  buildRecommendQueryString,
  formatLocalDate,
} from './queryString'

describe('formatLocalDate', () => {
  it('formats a Date as YYYY-MM-DD in local calendar', () => {
    expect(formatLocalDate(new Date(2026, 4, 20))).toBe('2026-05-20')
  })
})

describe('buildMapQueryString', () => {
  const place = { lat: -41.29, lon: 174.78, displayName: 'Wellington' }

  it('requests up to 500 campsites with facilities, place, and filters', () => {
    const qs = buildMapQueryString(
      {
        facilities: ['hasToilets', 'hasWater'],
        landscapes: ['Coastal', 'Forest'],
        activities: ['Fishing'],
        radiusKm: '80',
        date: '2026-06-01',
      },
      place,
    )
    const p = new URLSearchParams(qs)
    expect(p.get('limit')).toBe('500')
    expect(p.get('hasToilets')).toBe('true')
    expect(p.get('hasWater')).toBe('true')
    expect(p.get('lat')).toBe(String(place.lat))
    expect(p.get('lon')).toBe(String(place.lon))
    expect(p.get('radiusKm')).toBe('80')
    expect(p.get('date')).toBe('2026-06-01')
    expect(p.get('landscape')).toBe('Coastal,Forest')
    expect(p.get('activity')).toBe('Fishing')
  })

  it('skips radius when not positive', () => {
    const qs = buildMapQueryString({ radiusKm: '0', date: '2026-06-01' }, place)
    const p = new URLSearchParams(qs)
    expect(p.has('radiusKm')).toBe(false)
  })
})

describe('buildRecommendQueryString', () => {
  it('uses landscapes/activities param names and limit 5', () => {
    const qs = buildRecommendQueryString(
      {
        landscapes: ['Alpine'],
        activities: ['Walking and tramping'],
        radiusKm: '50',
        date: '2026-06-01',
      },
      { lat: -44, lon: 170 },
    )
    const p = new URLSearchParams(qs)
    expect(p.get('landscapes')).toBe('Alpine')
    expect(p.get('activities')).toBe('Walking and tramping')
    expect(p.get('limit')).toBe('5')
    expect(p.get('landscape')).toBeNull()
  })
})
