export const PAGE_SIZE = 50

export const emptyBool = ''

export const initialForm = {
  dogsAllowedBool: emptyBool,
  hasToilets: emptyBool,
  hasWater: emptyBool,
  hasPower: emptyBool,
  offset: '0',
  radiusKm: '100',
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
  return p.toString()
}
