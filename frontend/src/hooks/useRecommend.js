import { useCallback, useState } from 'react'
import { buildRecommendQueryString } from '../utils/queryString'

export function useRecommend() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)

  const fetchRecommendations = useCallback(async (form, selectedPlace) => {
    setLoading(true)
    setError(null)
    try {
      const qs = buildRecommendQueryString(form, selectedPlace)
      const res = await fetch(`/api/recommend${qs ? `?${qs}` : ''}`)
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(json.message || `HTTP ${res.status}`)
      }
      setResult({ data: json.data ?? [], total: json.total ?? 0, landscapeNotFound: json.landscapeNotFound ?? false })
    } catch (e) {
      setError(e.message || 'Failed to load recommendations')
      setResult(null)
    } finally {
      setLoading(false)
    }
  }, [])

  function clearResult() {
    setResult(null)
    setError(null)
  }

  return { loading, error, result, fetchRecommendations, clearResult }
}
