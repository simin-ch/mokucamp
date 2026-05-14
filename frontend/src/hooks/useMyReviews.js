import { useCallback, useEffect, useState } from 'react'

const TOKEN_KEY = 'mokucamp_auth_token'
const API = import.meta.env.VITE_API_URL ?? ''

export function useMyReviews() {
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchReviews = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const token = localStorage.getItem(TOKEN_KEY)
      const res = await fetch(`${API}/api/reviews/mine`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load reviews.')
      setReviews(data.reviews)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchReviews()
  }, [fetchReviews])

  const deleteReview = useCallback(async (campsiteId) => {
    const token = localStorage.getItem(TOKEN_KEY)
    const res = await fetch(`${API}/api/reviews/${campsiteId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || 'Failed to delete review.')
    }
    setReviews((prev) => prev.filter((r) => r.campsite.id !== campsiteId))
  }, [])

  return { reviews, loading, error, refetch: fetchReviews, deleteReview }
}
