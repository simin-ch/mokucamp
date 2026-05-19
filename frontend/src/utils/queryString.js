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

export const LANDSCAPE_OPTIONS = [
  { value: 'Coastal', label: 'Coastal' },
  { value: 'Forest', label: 'Forest' },
  { value: 'Alpine', label: 'Alpine' },
  { value: 'Rivers and lakes', label: 'Rivers & Lakes' },
]

export const FACILITY_OPTIONS = [
  { value: 'dogsAllowedBool', label: 'Dogs' },
  { value: 'hasToilets', label: 'Toilets' },
  { value: 'hasWater', label: 'Water' },
  { value: 'hasPower', label: 'Power' },
]

/** Values must match DOC `activities` field tokens exactly. */
export const ACTIVITY_OPTIONS = [
  { value: 'Bird and wildlife watching', label: 'Bird & wildlife watching' },
  { value: 'Boating', label: 'Boating' },
  { value: 'Camping', label: 'Camping' },
  { value: 'Caving', label: 'Caving' },
  { value: 'Climbing', label: 'Climbing' },
  { value: 'Diving and snorkelling', label: 'Diving & snorkelling' },
  { value: 'Fishing', label: 'Fishing' },
  { value: 'Four wheel driving', label: 'Four wheel driving' },
  { value: 'Horse riding', label: 'Horse riding' },
  { value: 'Hunting', label: 'Hunting' },
  { value: 'Kayaking and canoeing', label: 'Kayaking & canoeing' },
  { value: 'Mountain biking', label: 'Mountain biking' },
  { value: 'Picnicking', label: 'Picnicking' },
  { value: 'Rafting', label: 'Rafting' },
  { value: 'Scenic driving', label: 'Scenic driving' },
  { value: 'Skiing and ski touring', label: 'Skiing & ski touring' },
  { value: 'Swimming', label: 'Swimming' },
  { value: 'Walking and tramping', label: 'Walking & tramping' },
]

export const initialForm = {
  facilities: [],
  landscapes: [],
  activities: [],
  radiusKm: '100',
  date: defaultTripDate(),
}

function appendFacilityParams(p, form) {
  for (const key of form.facilities ?? []) {
    p.set(key, 'true')
  }
}

/** Query string for map search (up to 500 campsites matching filters). */
export function buildMapQueryString(form, place) {
  const p = new URLSearchParams()
  appendFacilityParams(p, form)
  p.set('limit', '500')
  if (place) {
    p.set('lat', String(place.lat))
    p.set('lon', String(place.lon))
    const radiusKm = Number(form.radiusKm)
    if (radiusKm > 0) p.set('radiusKm', String(radiusKm))
  }
  if (form.date) p.set('date', form.date)
  if (form.landscapes?.length) p.set('landscape', form.landscapes.join(','))
  if (form.activities?.length) p.set('activity', form.activities.join(','))
  return p.toString()
}

export function buildRecommendQueryString(form, place) {
  const p = new URLSearchParams()
  appendFacilityParams(p, form)
  if (place) {
    p.set('lat', String(place.lat))
    p.set('lon', String(place.lon))
    const radiusKm = Number(form.radiusKm)
    if (radiusKm > 0) p.set('radiusKm', String(radiusKm))
  }
  if (form.date) p.set('date', form.date)
  if (form.landscapes?.length) p.set('landscapes', form.landscapes.join(','))
  if (form.activities?.length) p.set('activities', form.activities.join(','))
  p.set('limit', '5')
  return p.toString()
}
