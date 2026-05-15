/**
 * Split a comma-separated tag field into trimmed tokens.
 */
function parseCommaTokens(value) {
  if (!value) return []
  return String(value)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

/**
 * True when the field includes every required value as an exact token (case-insensitive).
 */
function campsiteHasAllCommaTags(fieldValue, requiredValues) {
  if (!requiredValues || requiredValues.length === 0) return true
  if (!fieldValue) return false
  const tokens = parseCommaTokens(fieldValue).map((t) => t.toLowerCase())
  return requiredValues.every((req) => tokens.includes(String(req).trim().toLowerCase()))
}

function campsiteHasAllLandscapes(campsiteLandscape, requiredValues) {
  return campsiteHasAllCommaTags(campsiteLandscape, requiredValues)
}

function campsiteHasAllActivities(campsiteActivities, requiredValues) {
  return campsiteHasAllCommaTags(campsiteActivities, requiredValues)
}

module.exports = {
  parseCommaTokens,
  parseLandscapeTokens: parseCommaTokens,
  campsiteHasAllCommaTags,
  campsiteHasAllLandscapes,
  campsiteHasAllActivities,
}
