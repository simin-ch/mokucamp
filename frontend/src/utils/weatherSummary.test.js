import { describe, expect, it } from 'vitest'
import { summarizeForecast } from './weatherSummary'

describe('summarizeForecast', () => {
  it('returns null when weather payload is missing or empty', () => {
    expect(summarizeForecast(null)).toBeNull()
    expect(summarizeForecast({})).toBeNull()
    expect(summarizeForecast({ time: [] })).toBeNull()
  })

  it('summarizes daily values and assigns a rating label', () => {
    const result = summarizeForecast({
      time: ['2026-06-01'],
      precipitation_sum: [2],
      temperature_2m_max: [18.44],
      wind_speed_10m_max: [25.33],
    })
    expect(result).toEqual({
      maxTempC: 18.4,
      rainMm: 2,
      maxWindKmh: 25.3,
      label: 'Good',
    })
  })

  it('rates heavy rain as Poor', () => {
    const result = summarizeForecast({
      time: ['2026-06-01'],
      precipitation_sum: [30],
      temperature_2m_max: [5],
      wind_speed_10m_max: [50],
    })
    expect(result?.label).toBe('Poor')
  })
})
