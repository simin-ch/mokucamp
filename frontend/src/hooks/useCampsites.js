import { useCallback, useState } from 'react'
import { buildMapQueryString, buildQueryString, initialForm } from '../utils/queryString'

export function useCampsites() {
  const [form, setForm] = useState(() => ({ ...initialForm }))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)
  const [mapResult, setMapResult] = useState(null)

  const fetchCampsites = useCallback(async (overrideForm, selectedPlace) => {
    const f = overrideForm ?? form
    setLoading(true)
    setError(null)
    try {
      const qs = buildQueryString(f, selectedPlace)
      const mapQs = buildMapQueryString(f, selectedPlace)
      const [res, mapRes] = await Promise.all([
        fetch(`/api/campsites${qs ? `?${qs}` : ''}`),
        fetch(`/api/campsites${mapQs ? `?${mapQs}` : ''}`),
      ])
      const [json, mapJson] = await Promise.all([
        res.json().catch(() => ({})),
        mapRes.json().catch(() => ({})),
      ])
      if (!res.ok) {
        const fallback =
          res.status === 500
            ? 'Backend unreachable via /api proxy. Start backend on port 4000.'
            : `HTTP ${res.status}`
        throw new Error(json.message || fallback)
      }
      setResult({ data: json.data ?? [], total: json.total ?? 0, landscapeNotFound: json.landscapeNotFound ?? false })
      if (mapRes.ok) {
        setMapResult({ data: mapJson.data ?? [], landscapeNotFound: mapJson.landscapeNotFound ?? false })
      }
    } catch (e) {
      setError(e.message || 'Failed to load')
      setResult(null)
      setMapResult(null)
    } finally {
      setLoading(false)
    }
  }, [form])

  return { form, setForm, loading, error, setError, result, setResult, mapResult, setMapResult, fetchCampsites }
}
