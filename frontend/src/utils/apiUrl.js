function trimTrailingSlashes(s) {
  return s.replace(/\/+$/, '')
}

/**
 * Backend origin. Empty uses relative URLs so Vite's dev proxy can forward /api → localhost:4000.
 */
export function apiOrigin() {
  const v = import.meta.env.VITE_API_URL
  if (v == null || v === '') return ''
  return trimTrailingSlashes(String(v))
}

/**
 * @param {string} pathAndQuery - e.g. `/api/geocode?q=x`
 */
export function apiUrl(pathAndQuery) {
  const path = pathAndQuery.startsWith('/') ? pathAndQuery : `/${pathAndQuery}`
  const origin = apiOrigin()
  return origin ? `${origin}${path}` : path
}
