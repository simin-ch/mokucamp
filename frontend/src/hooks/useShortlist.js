import { useState } from 'react'

const STORAGE_KEY = 'mokucamp_shortlist'

function readStorage() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? []
  } catch {
    return []
  }
}

export function useShortlist() {
  const [items, setItems] = useState(readStorage)

  function toggle(campsite) {
    setItems((prev) => {
      const exists = prev.some((c) => c.id === campsite.id)
      const next = exists ? prev.filter((c) => c.id !== campsite.id) : [...prev, campsite]
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }

  function isShortlisted(id) {
    return items.some((c) => c.id === id)
  }

  function clear() {
    setItems([])
    localStorage.removeItem(STORAGE_KEY)
  }

  return { items, toggle, isShortlisted, clear }
}
