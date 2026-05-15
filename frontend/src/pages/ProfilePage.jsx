import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import StarRating from '../components/StarRating'
import { useAuth } from '../hooks/useAuth'
import { useMyReviews } from '../hooks/useMyReviews'

const TOKEN_KEY = 'mokucamp_auth_token'
const API = import.meta.env.VITE_API_URL ?? ''

// ---------------------------------------------------------------------------
// Edit Profile Tab
// ---------------------------------------------------------------------------
function EditProfileTab() {
  const { user, updateUser } = useAuth()
  const [username, setUsername] = useState(user?.username ?? '')
  const [profileMsg, setProfileMsg] = useState(null)
  const [profileErr, setProfileErr] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)

  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwMsg, setPwMsg] = useState(null)
  const [pwErr, setPwErr] = useState('')
  const [pwSaving, setPwSaving] = useState(false)

  async function handleSaveProfile(e) {
    e.preventDefault()
    setProfileMsg(null)
    setProfileErr('')
    setProfileSaving(true)
    try {
      const token = localStorage.getItem(TOKEN_KEY)
      const res = await fetch(`${API}/api/auth/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ username: username.trim() || null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update profile.')
      updateUser({ username: data.user.username })
      setProfileMsg('Profile updated successfully.')
    } catch (err) {
      setProfileErr(err.message)
    } finally {
      setProfileSaving(false)
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault()
    setPwMsg(null)
    setPwErr('')
    if (newPw !== confirmPw) { setPwErr('New passwords do not match.'); return }
    if (newPw.length < 8) { setPwErr('New password must be at least 8 characters.'); return }
    setPwSaving(true)
    try {
      const token = localStorage.getItem(TOKEN_KEY)
      const res = await fetch(`${API}/api/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to change password.')
      setPwMsg('Password updated successfully.')
      setCurrentPw('')
      setNewPw('')
      setConfirmPw('')
    } catch (err) {
      setPwErr(err.message)
    } finally {
      setPwSaving(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Profile Info */}
      <section>
        <h2 className="mb-4 text-base font-semibold text-stone-800">Personal info</h2>
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-500" htmlFor="profile-email">
              Email
            </label>
            <input
              id="profile-email"
              type="email"
              value={user?.email ?? ''}
              disabled
              className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-sm text-stone-400 cursor-not-allowed"
            />
            <p className="mt-1 text-xs text-stone-400">Email address cannot be changed.</p>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-stone-500" htmlFor="profile-username">
              Display name
            </label>
            <input
              id="profile-username"
              type="text"
              value={username}
              onChange={(e) => { setUsername(e.target.value); setProfileMsg(null); setProfileErr('') }}
              placeholder="Enter a display name (2–20 characters)"
              maxLength={20}
              className="w-full rounded-xl border border-stone-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
            />
          </div>

          {profileErr && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{profileErr}</p>
          )}
          {profileMsg && (
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{profileMsg}</p>
          )}

          <button
            type="submit"
            disabled={profileSaving}
            className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
          >
            {profileSaving ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      </section>

      <hr className="border-stone-100" />

      {/* Change Password */}
      <section>
        <h2 className="mb-4 text-base font-semibold text-stone-800">Change password</h2>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-500" htmlFor="pw-current">
              Current password
            </label>
            <input
              id="pw-current"
              type="password"
              autoComplete="current-password"
              required
              value={currentPw}
              onChange={(e) => { setCurrentPw(e.target.value); setPwMsg(null); setPwErr('') }}
              className="w-full rounded-xl border border-stone-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-500" htmlFor="pw-new">
              New password
            </label>
            <input
              id="pw-new"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              placeholder="At least 8 characters"
              value={newPw}
              onChange={(e) => { setNewPw(e.target.value); setPwMsg(null); setPwErr('') }}
              className="w-full rounded-xl border border-stone-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-500" htmlFor="pw-confirm">
              Confirm new password
            </label>
            <input
              id="pw-confirm"
              type="password"
              autoComplete="new-password"
              required
              value={confirmPw}
              onChange={(e) => { setConfirmPw(e.target.value); setPwMsg(null); setPwErr('') }}
              className="w-full rounded-xl border border-stone-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
            />
          </div>

          {pwErr && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{pwErr}</p>
          )}
          {pwMsg && (
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{pwMsg}</p>
          )}

          <button
            type="submit"
            disabled={pwSaving}
            className="rounded-xl bg-stone-800 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-stone-900 disabled:opacity-50"
          >
            {pwSaving ? 'Updating…' : 'Update password'}
          </button>
        </form>
      </section>
    </div>
  )
}

// ---------------------------------------------------------------------------
// My Reviews Tab
// ---------------------------------------------------------------------------
function MyReviewsTab() {
  const navigate = useNavigate()
  const { reviews, loading, error, deleteReview } = useMyReviews()
  const [deletingId, setDeletingId] = useState(null)
  const [deleteError, setDeleteError] = useState('')

  async function handleDelete(campsiteId) {
    if (!confirm('Delete this review?')) return
    setDeletingId(campsiteId)
    setDeleteError('')
    try {
      await deleteReview(campsiteId)
    } catch (err) {
      setDeleteError(err.message)
    } finally {
      setDeletingId(null)
    }
  }

  function handleGoToMap(campsiteId) {
    navigate('/', { state: { focusCampsiteId: campsiteId } })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
      </div>
    )
  }

  if (error) {
    return (
      <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
    )
  }

  if (reviews.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-stone-100">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-stone-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-stone-600">No reviews yet</p>
        <p className="mt-1 text-xs text-stone-400">Your reviews will appear here once you write one.</p>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="mt-4 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          Explore campsites →
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {deleteError && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{deleteError}</p>
      )}
      {reviews.map((review) => (
        <div
          key={review.id}
          className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"
        >
          {/* Campsite name + locate button */}
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <button
                type="button"
                onClick={() => handleGoToMap(review.campsite.id)}
                className="text-left text-sm font-semibold text-emerald-700 hover:underline"
              >
                {review.campsite.name}
              </button>
              {(review.campsite.place || review.campsite.region) && (
                <p className="mt-0.5 text-xs text-stone-400">
                  {[review.campsite.place, review.campsite.region].filter(Boolean).join(' · ')}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => handleGoToMap(review.campsite.id)}
              title="View on map"
              className="shrink-0 rounded-lg border border-stone-200 p-1.5 text-stone-400 transition hover:border-emerald-300 hover:text-emerald-600"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
                <line x1="9" y1="3" x2="9" y2="18" />
                <line x1="15" y1="6" x2="15" y2="21" />
              </svg>
            </button>
          </div>

          {/* Rating */}
          <div className="mb-2">
            <StarRating value={review.rating} size="sm" />
          </div>

          {/* Review content */}
          <p className="text-sm leading-relaxed text-stone-700">{review.content}</p>

          {/* Footer: date + delete */}
          <div className="mt-3 flex items-center justify-between">
            <time className="text-xs text-stone-400">
              {new Date(review.createdAt).toLocaleDateString('en-NZ', {
                year: 'numeric', month: 'short', day: 'numeric',
              })}
            </time>
            <button
              type="button"
              onClick={() => handleDelete(review.campsite.id)}
              disabled={deletingId === review.campsite.id}
              className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-red-500 transition hover:bg-red-50 disabled:opacity-50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6M14 11v6" />
                <path d="M9 6V4h6v2" />
              </svg>
              {deletingId === review.campsite.id ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// ProfilePage
// ---------------------------------------------------------------------------
export default function ProfilePage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('profile')

  return (
    <div className="min-h-screen bg-stone-100">
      {/* Header */}
      <header className="border-b border-stone-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-5 py-3.5">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-sm font-medium text-stone-500 transition hover:text-stone-800"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back to map
          </button>
          <button
            type="button"
            onClick={logout}
            className="flex items-center gap-1.5 text-sm font-medium text-red-500 transition hover:text-red-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Log out
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl bg-white px-5 py-8 min-h-[calc(100vh-3.75rem)]">
        {/* User info banner */}
        <div className="mb-6 flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-xl font-bold select-none">
            {(user?.username ?? user?.email ?? '?')[0].toUpperCase()}
          </div>
          <div>
            <p className="text-lg font-bold text-stone-900">
              {user?.username || 'Set a display name'}
            </p>
            <p className="text-sm text-stone-400">{user?.email}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex border-b border-stone-200">
          <button
            type="button"
            onClick={() => setTab('profile')}
            className={`px-4 pb-3 text-sm font-medium transition-colors ${
              tab === 'profile'
                ? 'border-b-2 border-emerald-600 text-emerald-700'
                : 'text-stone-500 hover:text-stone-700'
            }`}
          >
            Personal info
          </button>
          <button
            type="button"
            onClick={() => setTab('reviews')}
            className={`px-4 pb-3 text-sm font-medium transition-colors ${
              tab === 'reviews'
                ? 'border-b-2 border-emerald-600 text-emerald-700'
                : 'text-stone-500 hover:text-stone-700'
            }`}
          >
            My reviews
          </button>
        </div>

        {/* Tab content */}
        {tab === 'profile' && <EditProfileTab />}
        {tab === 'reviews' && <MyReviewsTab />}
      </main>
    </div>
  )
}
