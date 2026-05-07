import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from './useAuth'

const STORAGE_KEY = 'mokucamp_shortlist'
const TOKEN_KEY   = 'mokucamp_auth_token'

function readStorage() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? []
  } catch {
    return []
  }
}

/** Authenticated fetch helper — reads JWT directly from localStorage. */
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

export function useShortlist() {
  const { user } = useAuth()
  const [items, setItems] = useState(readStorage)

  /**
   * Track which user ID we last synced so we only sync once per login,
   * not on every re-render.
   */
  const syncedForRef = useRef(null)

  useEffect(() => {
    if (!user) {
      syncedForRef.current = null  // reset so next login triggers a fresh sync
      return
    }
    if (syncedForRef.current === user.id) return  // already synced for this session
    syncedForRef.current = user.id

    const localItems = readStorage()

    if (localItems.length > 0) {
      // Merge local items into the backend shortlist, then load the union.
      apiFetch('/api/shortlist/sync', {
        method: 'POST',
        body: JSON.stringify({ ids: localItems.map((c) => c.id) }),
      })
        .then((r) => r.json())
        .then(({ items: synced }) => {
          setItems(synced)
          localStorage.setItem(STORAGE_KEY, JSON.stringify(synced))
        })
        .catch(() => {})
    } else {
      // No local items — just load whatever is stored on the server.
      apiFetch('/api/shortlist')
        .then((r) => r.json())
        .then(({ items: remote }) => {
          setItems(remote)
          localStorage.setItem(STORAGE_KEY, JSON.stringify(remote))
        })
        .catch(() => {})
    }
  }, [user])

  const toggle = useCallback((campsite) => {
    setItems((prev) => {
      const exists = prev.some((c) => c.id === campsite.id)
      const next = exists
        ? prev.filter((c) => c.id !== campsite.id)
        : [...prev, campsite]

      // Always keep localStorage in sync as an offline fallback.
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))

      // Mirror the change to the backend when the user is logged in.
      if (localStorage.getItem(TOKEN_KEY)) {
        const method = exists ? 'DELETE' : 'POST'
        apiFetch(`/api/shortlist/${campsite.id}`, { method }).catch(() => {})
      }

      return next
    })
  }, [])

  const isShortlisted = useCallback((id) => items.some((c) => c.id === id), [items])

  const clear = useCallback(() => {
    setItems([])
    localStorage.removeItem(STORAGE_KEY)

    if (localStorage.getItem(TOKEN_KEY)) {
      apiFetch('/api/shortlist', { method: 'DELETE' }).catch(() => {})
    }
  }, [])

  return { items, toggle, isShortlisted, clear }
}
