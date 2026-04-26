import { useEffect, useState } from 'react'

const QUERY = '(min-width: 640px)'

/**
 * Matches Tailwind `sm:` — safe for first paint in the browser (Vite SPA).
 * Leaflet must not mount while the map panel is `display: none` on narrow viewports.
 */
export function useMinWidthSm() {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(QUERY).matches : false,
  )

  useEffect(() => {
    const m = window.matchMedia(QUERY)
    const sync = () => setMatches(m.matches)
    sync()
    m.addEventListener('change', sync)
    return () => m.removeEventListener('change', sync)
  }, [])

  return matches
}
