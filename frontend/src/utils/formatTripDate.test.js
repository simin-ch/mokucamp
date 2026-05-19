import { describe, expect, it } from 'vitest'
import { formatTripDateLabel } from './formatTripDate'

describe('formatTripDateLabel', () => {
  it('returns empty string for missing or invalid ISO dates', () => {
    expect(formatTripDateLabel(undefined)).toBe('')
    expect(formatTripDateLabel('')).toBe('')
    expect(formatTripDateLabel('2026-5-20')).toBe('')
    expect(formatTripDateLabel('20-05-2026')).toBe('')
  })

  it('formats a valid YYYY-MM-DD date with weekday and year', () => {
    const label = formatTripDateLabel('2026-05-20')
    expect(label).toMatch(/2026/)
    expect(label.length).toBeGreaterThan(5)
  })
})
