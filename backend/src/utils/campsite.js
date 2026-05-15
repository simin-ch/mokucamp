/**
 * Adds thumbnailUrl to a campsite by parsing the properties JSON string.
 * The DOC dataset stores introductionThumbnail inside the properties column.
 */
function withThumbnail(campsite) {
  try {
    const props = campsite.properties ? JSON.parse(campsite.properties) : null
    const thumbnailUrl = props?.introductionThumbnail || null
    return thumbnailUrl ? { ...campsite, thumbnailUrl } : campsite
  } catch {
    return campsite
  }
}

/** Strip internal/raw DOC fields before sending a campsite to the client. */
function toPublicCampsite(campsite) {
  const { properties, geometry, ...rest } = withThumbnail(campsite)
  return rest
}

module.exports = { withThumbnail, toPublicCampsite }
