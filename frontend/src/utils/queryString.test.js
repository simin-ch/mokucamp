import { describe, expect, it } from 'vitest'
import {
  PAGE_SIZE,
  buildMapQueryString,
  buildQueryString,
  buildRecommendQueryString,
  formatLocalDate,
} from './queryString'

describe('formatLocalDate', () => {
  it('formats a Date as YYYY-MM-DD in local calendar', () => {
    expect(formatLocalDate(new Date(2026, 4, 20))).toBe('2026-05-20')
  })
})

describe('buildQueryString', () => {
  const place = { lat: -41.29, lon: 174.78, displayName: 'Wellington' }

  it('includes pagination, facilities, place, and filters', () => {
    const qs = buildQueryString(
      {
        facilities: ['hasToilets', 'hasWater'],
        landscapes: ['Coastal', 'Forest'],
        activities: ['Fishing'],
        offset: '50',
        radiusKm: '80',
        date: '2026-06-01',
      },
      place,
    )
    const p = new URLSearchParams(qs)
    expect(p.get('limit')).toBe(String(PAGE_SIZE))
    expect(p.get('offset')).toBe('50')
    expect(p.get('hasToilets')).toBe('true')
    expect(p.get('hasWater')).toBe('true')
    expect(p.get('lat')).toBe(String(place.lat))
    expect(p.get('lon')).toBe(String(place.lon))
    expect(p.get('radiusKm')).toBe('80')
    expect(p.get('date')).toBe('2026-06-01')
    expect(p.get('landscape')).toBe('Coastal,Forest')
    expect(p.get('activity')).toBe('Fishing')
  })

  it('omits offset when zero and skips radius when not positive', () => {
    const qs = buildQueryString({ offset: '0', radiusKm: '0', date: '2026-06-01' }, place)
    const p = new URLSearchParams(qs)
    expect(p.has('offset')).toBe(false)
    expect(p.has('radiusKm')).toBe(false)
  })
})

describe('buildMapQueryString', () => {
  it('requests up to 500 campsites for the map', () => {
    const qs = buildMapQueryString({ date: '2026-06-01' }, null)
    expect(new URLSearchParams(qs).get('limit')).toBe('500')
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
