export const PAGE_SIZE = 50

export const emptyBool = ''

export function formatLocalDate(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function defaultTripDate() {
  return formatLocalDate(new Date())
}

/** Today + 10 days (inclusive window for trip picker). */
export function maxTripDate() {
  const d = new Date()
  d.setDate(d.getDate() + 10)
  return formatLocalDate(d)
}

export const initialForm = {
  dogsAllowedBool: emptyBool,
  hasToilets: emptyBool,
  hasWater: emptyBool,
  hasPower: emptyBool,
  offset: '0',
  radiusKm: '100',
  date: defaultTripDate(),
}

export function buildQueryString(form, place) {
  const p = new URLSearchParams()
  if (form.dogsAllowedBool) p.set('dogsAllowedBool', form.dogsAllowedBool)
  if (form.hasToilets) p.set('hasToilets', form.hasToilets)
  if (form.hasWater) p.set('hasWater', form.hasWater)
  if (form.hasPower) p.set('hasPower', form.hasPower)
  p.set('limit', String(PAGE_SIZE))
  const offset = Number(form.offset)
  if (offset > 0) p.set('offset', String(offset))
  if (place) {
    p.set('lat', String(place.lat))
    p.set('lon', String(place.lon))
    const radiusKm = Number(form.radiusKm)
    if (radiusKm > 0) p.set('radiusKm', String(radiusKm))
  }
  if (form.date) {
    p.set('date', form.date)
  }
  return p.toString()
}
