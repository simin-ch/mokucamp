import { useCallback, useEffect, useRef, useState } from 'react'
import { apiUrl } from '../utils/apiUrl'
import { NEARBY_TRACKS_LIMIT, NEARBY_TRACKS_RADIUS_KM } from '../utils/nearbyTracks'

/**
 * Manages fetching and caching nearby DOC walking tracks for a single campsite.
 *
 * Returns:
 *   nearbyTrails  — { campsiteId, campsite, trails, loading, error, empty } | null
 *   showTrails(campsite) — fetch tracks for a campsite; aborts any in-flight request
 *   hideTrails()         — clear tracks and cancel in-flight request
 */
export function useNearbyTrails(mapSearchEpoch) {
  const [nearbyTrails, setNearbyTrails] = useState(null)
  const abortRef = useRef(null)

  // Clear tracks whenever the user runs a new search
  useEffect(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setNearbyTrails(null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapSearchEpoch])

  // Abort any in-flight request on unmount
  useEffect(() => () => abortRef.current?.abort(), [])

  const hideTrails = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setNearbyTrails(null)
  }, [])

  const showTrails = useCallback(async (campsite) => {
    abortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac

    setNearbyTrails({ campsiteId: campsite.id, campsite, trails: [], loading: true, error: null, empty: false })

    try {
      const qs = new URLSearchParams({
        radiusKm: String(NEARBY_TRACKS_RADIUS_KM),
        limit: String(NEARBY_TRACKS_LIMIT),
      })
      const res = await fetch(apiUrl(`/api/campsites/${campsite.id}/nearby-tracks?${qs}`), { signal: ac.signal })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.message || 'Failed to load tracks')

      const trails = json.data ?? []
      setNearbyTrails({ campsiteId: campsite.id, campsite, trails, loading: false, error: null, empty: trails.length === 0 })
    } catch (err) {
      if (err.name === 'AbortError') return
      setNearbyTrails({ campsiteId: campsite.id, campsite, trails: [], loading: false, error: err.message || 'Failed to load tracks', empty: false })
    }
  }, [])

  return { nearbyTrails, showTrails, hideTrails }
}
