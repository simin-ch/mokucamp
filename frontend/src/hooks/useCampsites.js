import { useCallback, useState } from 'react'
import { apiUrl } from '../utils/apiUrl'
import { buildMapQueryString, initialForm } from '../utils/queryString'

export function useCampsites() {
  const [form, setForm] = useState(() => ({ ...initialForm }))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [mapResult, setMapResult] = useState(null)

  const fetchCampsites = useCallback(async (overrideForm, selectedPlace) => {
    const f = overrideForm ?? form
    setLoading(true)
    setError(null)
    try {
      const qs = buildMapQueryString(f, selectedPlace)
      const res = await fetch(apiUrl(`/api/campsites${qs ? `?${qs}` : ''}`))
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        const fallback =
          res.status === 500
            ? 'Backend unreachable via /api proxy. Start backend on port 4000.'
            : `HTTP ${res.status}`
        throw new Error(json.message || fallback)
      }
      setMapResult({
        data: json.data ?? [],
        total: json.total ?? 0,
      })
    } catch (e) {
      setError(e.message || 'Failed to load')
      setMapResult(null)
    } finally {
      setLoading(false)
    }
  }, [form])

  return { form, setForm, loading, error, setError, mapResult, setMapResult, fetchCampsites }
}
