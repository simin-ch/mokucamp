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

module.exports = { withThumbnail }
