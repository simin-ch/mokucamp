import { useCallback, useState } from 'react'
import { buildQueryString, initialForm } from '../utils/queryString'

export function useCampsites() {
  const [form, setForm] = useState(initialForm)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)

  // selectedPlace is passed at call time so this hook stays decoupled from geocoding
  const fetchCampsites = useCallback(async (overrideForm, selectedPlace) => {
    const f = overrideForm ?? form
    setLoading(true)
    setError(null)
    try {
      const qs = buildQueryString(f, selectedPlace)
      const res = await fetch(`/api/campsites${qs ? `?${qs}` : ''}`)
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        const fallback =
          res.status === 500
            ? 'Backend unreachable via /api proxy. Start backend on port 4000.'
            : `HTTP ${res.status}`
        throw new Error(json.message || fallback)
      }
      setResult({ data: json.data ?? [], total: json.total ?? 0 })
    } catch (e) {
      setError(e.message || 'Failed to load')
      setResult(null)
    } finally {
      setLoading(false)
    }
  }, [form])

  return { form, setForm, loading, error, setError, result, setResult, fetchCampsites }
}
