export const NEARBY_TRACKS_RADIUS_KM = 3
export const NEARBY_TRACKS_LIMIT = 5

export function hasWalkingAndTramping(activities) {
  if (!activities) return false
  return String(activities)
    .split(',')
    .map((s) => s.trim())
    .some((item) => item === 'Walking and tramping')
}
