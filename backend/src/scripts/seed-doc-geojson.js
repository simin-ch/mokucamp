/* eslint-disable no-console */
const fs = require('fs')
const path = require('path')

require('dotenv').config()

const proj4 = require('proj4')
const { PrismaClient } = require('@prisma/client')

function getArgValue(flag, defaultValue) {
  const idx = process.argv.indexOf(flag)
  if (idx === -1) return defaultValue
  const val = process.argv[idx + 1]
  return val ?? defaultValue
}

function toNullIfEmpty(val) {
  if (val === undefined || val === null) return null
  if (typeof val === 'string') {
    const trimmed = val.trim()
    if (!trimmed || trimmed.toLowerCase() === 'null') return null
    return trimmed
  }
  return val
}

function toBoolFromDocYesNo(val) {
  const v = toNullIfEmpty(val)
  if (!v) return false
  if (typeof v === 'boolean') return v
  const s = String(v).trim().toLowerCase()
  return s === 'yes' || s === 'true' || s === '1'
}

function toIntOrNull(val) {
  const v = toNullIfEmpty(val)
  if (v === null) return null
  const n = Number(v)
  return Number.isFinite(n) ? Math.trunc(n) : null
}

function toFloatOrNull(val) {
  const v = toNullIfEmpty(val)
  if (v === null) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function toDogsAllowedBoolFromDoc(val) {
  const v = toNullIfEmpty(val)
  if (!v) return null
  if (typeof v !== 'string') return null

  const s = v.trim()
  if (!s) return null
  if (s.startsWith('Not Applicable')) return null
  if (s.startsWith('No dogs')) return false

  // Any version of “allowed” / “leash only” / “permit only” should be selectable as true.
  if (s.startsWith('Dogs on a leash only')) return true
  if (s.startsWith('Dogs with a DOC permit')) return true
  if (s.startsWith('Dogs allowed')) return true

  return null
}

// DOC facilities: comma-separated tokens. Exact token match.
// Toilets: "Toilets" | "Toilets - flush" | "Toilets - non-flush"
// Water: "Water supply" | "Water from tap - ..." | "Water from stream"
// Power: "Powered sites" only (NOT "Non-powered/tent sites")
function parseFacilityFlags(facilitiesStr) {
  const tokens = (toNullIfEmpty(facilitiesStr) || '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)

  const hasToilets =
    tokens.some((t) => t === 'Toilets' || t.startsWith('Toilets -')) || false
  const hasWater =
    tokens.some(
      (t) => t === 'Water supply' || t.startsWith('Water from ')
    ) || false
  const hasPower = tokens.some((t) => t === 'Powered sites') || false

  return { hasToilets, hasWater, hasPower }
}

async function main() {
  // EPSG:2193 (NZGD2000 / NZTM2000) -> EPSG:4326 (WGS84)
  proj4.defs(
    'EPSG:2193',
    '+proj=tmerc +lat_0=0 +lon_0=173 +k=0.9996 +x_0=1600000 +y_0=10000000 +ellps=GRS80 +units=m +no_defs +type=crs'
  )
  proj4.defs('EPSG:4326', '+proj=longlat +datum=WGS84 +no_defs +type=crs')

  const defaultFile = path.resolve(
    __dirname,
    '../../../data/geojson/DOC_Campsites_202602.geojson'
  )
  const filePath = getArgValue('--file', defaultFile)
  const dataset = getArgValue('--dataset', 'DOC_Campsites_202602')

  const prisma = new PrismaClient()
  try {
    const raw = fs.readFileSync(filePath, 'utf8')
    const geojson = JSON.parse(raw)
    const features = geojson.features

    if (!Array.isArray(features)) {
      throw new Error('GeoJSON missing `features` array.')
    }

    console.log(`Seeding dataset=${dataset}`)
    console.log(`File: ${filePath}`)
    console.log(`Features: ${features.length}`)

    // Replace-style seed: clear existing rows for this dataset first
    await prisma.campsite.deleteMany({ where: { dataset } })

    const batchSize = 200
    let batch = []
    let inserted = 0

    const toWgs84 = (coords) => {
      // DOC Point geometry.coordinates are [x, y] in NZTM2000
      if (!Array.isArray(coords) || coords.length < 2) return null
      const x = toFloatOrNull(coords[0])
      const y = toFloatOrNull(coords[1])
      if (x === null || y === null) return null

      // proj4 output order is [lon, lat]
      const out = proj4('EPSG:2193', 'EPSG:4326', [x, y])
      const lon = toFloatOrNull(out?.[0])
      const lat = toFloatOrNull(out?.[1])
      if (lat === null || lon === null) return null

      return { lat, lon }
    }

    for (let i = 0; i < features.length; i += 1) {
      const f = features[i]
      const props = f.properties || {}

      const sourceId =
        f.id ?? props.OBJECTID ?? props.objectid ?? props.GlobalID ?? null
      if (sourceId === null || sourceId === undefined) continue

      const wgs = toWgs84(f.geometry?.coordinates)
      if (!wgs) continue

      const facilities = toNullIfEmpty(props.facilities)
      const { hasToilets, hasWater, hasPower } = parseFacilityFlags(facilities)

      batch.push({
        dataset,
        sourceId: String(sourceId),

        name: toNullIfEmpty(props.name),
        place: toNullIfEmpty(props.place),
        region: toNullIfEmpty(props.region),
        campsiteCategory: toNullIfEmpty(props.campsiteCategory),
        introduction: toNullIfEmpty(props.introduction),
        access: toNullIfEmpty(props.access),
        facilities: toNullIfEmpty(props.facilities),
        dogsAllowed: toNullIfEmpty(props.dogsAllowed),
        dogsAllowedBool: toDogsAllowedBoolFromDoc(props.dogsAllowed),

        lat: wgs.lat,
        lon: wgs.lon,

        // Defaults exist in schema, set booleans to be explicit.
        numberOfPoweredSites: toIntOrNull(props.numberOfPoweredSites),
        numberOfUnpoweredSites: toIntOrNull(props.numberOfUnpoweredSites),
        bookable: toBoolFromDocYesNo(props.bookable),

        hasToilets,
        hasWater,
        hasPower,

        landscape: toNullIfEmpty(props.landscape),
        activities: toNullIfEmpty(props.activities),

        staticLink: toNullIfEmpty(props.staticLink),
        imageUrl: toNullIfEmpty(props.introductionThumbnail),

        properties: JSON.stringify(props),
        geometry: JSON.stringify(f.geometry ?? null),
      })

      if (batch.length >= batchSize) {
        await prisma.campsite.createMany({ data: batch })
        inserted += batch.length
        batch = []
        console.log(`Inserted: ${inserted}`)
      }
    }

    if (batch.length > 0) {
      await prisma.campsite.createMany({ data: batch })
      inserted += batch.length
    }

    console.log(`Done. Inserted: ${inserted}`)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

