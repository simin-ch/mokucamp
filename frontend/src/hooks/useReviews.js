const TOKEN_KEY = 'mokucamp_auth_token'

function apiFetch(path, options = {}) {
  const token = localStorage.getItem(TOKEN_KEY)
  return fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })
}

/**
 * Fetch paginated reviews + aggregate stats for a campsite.
 * Returns { aggregate, reviews, page, totalPages } or throws on error.
 */
export async function fetchReviews(campsiteId, page = 1) {
  const res = await apiFetch(`/api/reviews/${campsiteId}?page=${page}`)
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || 'Failed to load reviews.')
  }
  return res.json()
}

/**
 * Submit (create or update) the current user's review for a campsite.
 * Returns { review } or throws on error.
 */
export async function submitReview(campsiteId, { rating, content }) {
  const res = await apiFetch(`/api/reviews/${campsiteId}`, {
    method: 'POST',
    body: JSON.stringify({ rating, content }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || 'Failed to submit review.')
  }
  return res.json()
}

/**
 * Delete the current user's review for a campsite.
 * Returns { message } or throws on error.
 */
export async function deleteReview(campsiteId) {
  const res = await apiFetch(`/api/reviews/${campsiteId}`, { method: 'DELETE' })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || 'Failed to delete review.')
  }
  return res.json()
}
