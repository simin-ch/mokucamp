const { toPublicCampsite } = require('./campsite')
const { haversineKm } = require('./geo')
const {
  parseCommaTokens,
  campsiteHasAllLandscapes,
  campsiteHasAllActivities,
} = require('./landscape')

const MAX_LIMIT = 500
const DEFAULT_LIMIT = 312

function parseCampsiteListQuery(query = {}) {
  const rawLimit = Number(query.limit)
  const take = rawLimit > 0 ? Math.min(rawLimit, MAX_LIMIT) : DEFAULT_LIMIT
  const skip = Number(query.offset) > 0 ? Number(query.offset) : 0

  const centerLat = parseFloat(query.lat)
  const centerLon = parseFloat(query.lon)
  const radius = parseFloat(query.radiusKm)
  const useDistance =
    !isNaN(centerLat) && !isNaN(centerLon) && !isNaN(radius) && radius > 0

  const landscapeValues = parseCommaTokens(query.landscape)
  const activityValues = parseCommaTokens(query.activity)

  return {
    pagination: { take, skip },
    distance: useDistance ? { centerLat, centerLon, radius } : null,
    filters: {
      region: query.region,
      category: query.category,
      dogsAllowedBool: query.dogsAllowedBool,
      hasToilets: query.hasToilets,
      hasWater: query.hasWater,
      hasPower: query.hasPower,
      q: query.q,
      landscapeFilter: landscapeValues.length > 0 ? landscapeValues : null,
      activityFilter: activityValues.length > 0 ? activityValues : null,
    },
  }
}

function buildCampsiteWhere(filters) {
  const where = {}
  if (filters.region) where.region = String(filters.region)
  if (filters.category) where.campsiteCategory = String(filters.category)
  if (filters.dogsAllowedBool === 'true') where.dogsAllowedBool = true
  if (filters.dogsAllowedBool === 'false') where.dogsAllowedBool = false
  if (filters.hasToilets === 'true') where.hasToilets = true
  if (filters.hasToilets === 'false') where.hasToilets = false
  if (filters.hasWater === 'true') where.hasWater = true
  if (filters.hasWater === 'false') where.hasWater = false
  if (filters.hasPower === 'true') where.hasPower = true
  if (filters.hasPower === 'false') where.hasPower = false
  if (filters.q) {
    const s = `%${String(filters.q)}%`
    where.OR = [
      { name: { contains: s } },
      { place: { contains: s } },
      { region: { contains: s } },
      { access: { contains: s } },
    ]
  }

  const tagPrefilters = [
    ...(filters.landscapeFilter?.map((v) => ({ landscape: { contains: v } })) ?? []),
    ...(filters.activityFilter?.map((v) => ({ activities: { contains: v } })) ?? []),
  ]

  if (tagPrefilters.length === 0) return where
  return {
    ...where,
    AND: [...(where.AND ?? []), ...tagPrefilters],
  }
}

function filterByTags(rows, filters) {
  let filtered = rows
  if (filters.landscapeFilter) {
    filtered = filtered.filter((c) =>
      campsiteHasAllLandscapes(c.landscape, filters.landscapeFilter),
    )
  }
  if (filters.activityFilter) {
    filtered = filtered.filter((c) =>
      campsiteHasAllActivities(c.activities, filters.activityFilter),
    )
  }
  return filtered
}

function filterAndSortByDistance(rows, { centerLat, centerLon, radius }) {
  return rows
    .map((c) => ({
      ...c,
      distanceKm: Math.round(haversineKm(centerLat, centerLon, c.lat, c.lon) * 10) / 10,
    }))
    .filter((c) => c.distanceKm <= radius)
    .sort((a, b) => a.distanceKm - b.distanceKm)
}

/**
 * List campsites matching query filters with optional distance sort and pagination.
 */
async function listCampsites(prisma, query) {
  const parsed = parseCampsiteListQuery(query)
  const where = buildCampsiteWhere(parsed.filters)
  let rows = await prisma.campsite.findMany({ where, orderBy: { id: 'asc' } })

  if (parsed.distance) {
    rows = filterAndSortByDistance(rows, parsed.distance)
  }

  rows = filterByTags(rows, parsed.filters)

  const landscapeNotFound = Boolean(
    parsed.filters.landscapeFilter?.length && rows.length === 0,
  )

  const { take, skip } = parsed.pagination
  const page = rows.slice(skip, skip + take)

  return {
    data: page.map(toPublicCampsite),
    total: rows.length,
    landscapeNotFound,
  }
}

module.exports = {
  MAX_LIMIT,
  DEFAULT_LIMIT,
  parseCampsiteListQuery,
  buildCampsiteWhere,
  filterByTags,
  filterAndSortByDistance,
  listCampsites,
}
