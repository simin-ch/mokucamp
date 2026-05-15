import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { deleteReview, fetchReviews, submitReview } from '../hooks/useReviews'
import LoginModal from './LoginModal'
import StarRating from './StarRating'

const MAX_CHARS = 500

// ---------------------------------------------------------------------------
// Aggregate block: ★★★★☆ 4.2 · 18 reviews + distribution bars
// ---------------------------------------------------------------------------
function AggregateBlock({ aggregate }) {
  const { avg, total, distribution } = aggregate
  const maxBar = Math.max(...distribution, 1)

  return (
    <div className="border-b border-stone-100 px-5 py-4">
      <div className="flex items-center gap-2">
        <StarRating value={Math.round(avg ?? 0)} size="md" />
        <span className="text-sm font-semibold text-stone-800">
          {avg != null ? avg.toFixed(1) : '—'}
        </span>
        <span className="text-sm text-stone-400">· {total} review{total !== 1 ? 's' : ''}</span>
      </div>

      {total > 0 && (
        <div className="mt-3 space-y-1">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = distribution[star - 1] ?? 0
            const pct = Math.round((count / maxBar) * 100)
            return (
              <div key={star} className="flex items-center gap-2">
                <span className="w-3 text-right text-xs text-stone-500">{star}</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-stone-100">
                  <div
                    className="h-full rounded-full bg-amber-400 transition-all duration-300"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-4 text-right text-xs text-stone-400">{count}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Individual review row
// ---------------------------------------------------------------------------
function ReviewRow({ review, currentUserId, onDelete, deleting }) {
  const date = new Date(review.createdAt).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
  })
  const isOwn = currentUserId && review.user.id === currentUserId
  const emailPrefix = review.user.email.split('@')[0]

  return (
    <div className="border-b border-stone-100 px-5 py-4 last:border-b-0">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-700">
            {emailPrefix[0].toUpperCase()}
          </div>
          <div>
            <p className="text-xs font-medium text-stone-700">{emailPrefix}</p>
            <p className="text-xs text-stone-400">{date}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StarRating value={review.rating} size="sm" />
          {isOwn && (
            <button
              type="button"
              onClick={() => onDelete(review)}
              disabled={deleting}
              className="rounded p-1 text-stone-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
              aria-label="Delete review"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6" />
                <path d="M14 11v6" />
                <path d="M9 6V4h6v2" />
              </svg>
            </button>
          )}
        </div>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-stone-700">{review.content}</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Write review form (shown to logged-in users)
// ---------------------------------------------------------------------------
function WriteReviewForm({ campsiteId, onSubmitSuccess }) {
  const [rating, setRating] = useState(0)
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    if (rating === 0) { setError('Please select a star rating.'); return }
    if (content.trim().length === 0) { setError('Please write something.'); return }
    setError(null)
    setSubmitting(true)
    try {
      await submitReview(campsiteId, { rating, content })
      setRating(0)
      setContent('')
      onSubmitSuccess()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="border-t border-stone-100 px-5 py-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-stone-400">Write a Review</p>
      <div className="mb-3">
        <StarRating value={rating} onChange={setRating} size="md" />
      </div>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        maxLength={MAX_CHARS}
        rows={3}
        placeholder="Share your experience..."
        className="w-full resize-none rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-800 placeholder-stone-400 outline-none transition-colors focus:border-emerald-400 focus:bg-white"
      />
      <div className="mt-1 flex items-center justify-between">
        <span className="text-xs text-stone-400">{content.length}/{MAX_CHARS}</span>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="mt-3 w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-60"
      >
        {submitting ? 'Submitting…' : 'Submit Review'}
      </button>
    </form>
  )
}

// ---------------------------------------------------------------------------
// Main ReviewsTab
// ---------------------------------------------------------------------------
export default function ReviewsTab({ campsiteId }) {
  const { user } = useAuth()
  const [loginOpen, setLoginOpen] = useState(false)

  const [data, setData] = useState(null)   // { aggregate, reviews, page, totalPages }
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  const campsiteIdRef = useRef(campsiteId)

  function load(p = 1) {
    setLoading(true)
    setFetchError(null)
    fetchReviews(campsiteId, p)
      .then((d) => {
        if (campsiteIdRef.current !== campsiteId) return  // stale
        setData(d)
        setPage(p)
      })
      .catch((err) => setFetchError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    campsiteIdRef.current = campsiteId
    setData(null)
    setPage(1)
    load(1)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campsiteId])

  async function handleDelete(review) {
    setDeletingId(review.id)
    try {
      await deleteReview(campsiteId)
      load(page)
    } catch (err) {
      alert(err.message)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="flex flex-col">
      {/* Aggregate */}
      {data && (
        <AggregateBlock aggregate={data.aggregate} />
      )}

      {/* Loading / error states */}
      {loading && !data && (
        <div className="flex items-center justify-center py-12 text-sm text-stone-400">
          Loading reviews…
        </div>
      )}
      {fetchError && (
        <div className="px-5 py-4 text-sm text-red-500">{fetchError}</div>
      )}

      {/* Review list */}
      {data && data.reviews.length === 0 && !loading && (
        <div className="px-5 py-8 text-center text-sm text-stone-400">
          No reviews yet. Be the first!
        </div>
      )}
      {data && data.reviews.length > 0 && (
        <div>
          {data.reviews.map((r) => (
            <ReviewRow
              key={r.id}
              review={r}
              currentUserId={user?.id}
              onDelete={handleDelete}
              deleting={deletingId === r.id}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 border-t border-stone-100 px-5 py-3">
          <button
            type="button"
            onClick={() => load(page - 1)}
            disabled={page <= 1 || loading}
            className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-600 transition-colors hover:bg-stone-50 disabled:opacity-40"
          >
            ← Prev
          </button>
          <span className="text-xs text-stone-400">
            {page} / {data.totalPages}
          </span>
          <button
            type="button"
            onClick={() => load(page + 1)}
            disabled={page >= data.totalPages || loading}
            className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-600 transition-colors hover:bg-stone-50 disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      )}

      {/* Write review / login prompt */}
      {user ? (
        <WriteReviewForm campsiteId={campsiteId} onSubmitSuccess={() => load(1)} />
      ) : (
        <div className="border-t border-stone-100 px-5 py-4">
          <button
            type="button"
            onClick={() => setLoginOpen(true)}
            className="w-full rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-100"
          >
            Log in to leave a review
          </button>
        </div>
      )}

      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </div>
  )
}
