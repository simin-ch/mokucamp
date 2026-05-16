import { useEffect, useRef, useState } from 'react'
import { apiUrl } from '../utils/apiUrl'

export function useGeocode() {
  const [locationInput, setLocationInput] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedPlace, setSelectedPlace] = useState(null)
  // After selecting a suggestion, the debounced effect will run once more
  // (because locationInput is updated). Suppress opening the dropdown again.
  const suppressNextOpenRef = useRef(false)
  const [geocodeLoading, setGeocodeLoading] = useState(false)
  const [geocodeError, setGeocodeError] = useState(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (locationInput.length < 3) {
      setSuggestions([])
      setShowSuggestions(false)
      setGeocodeError(null)
      return
    }

    setGeocodeLoading(true)
    setGeocodeError(null)
    const controller = new AbortController()

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(apiUrl(`/api/geocode?q=${encodeURIComponent(locationInput)}`), {
          signal: controller.signal,
        })
        const data = await res.json().catch(() => null)
        if (controller.signal.aborted) return

        if (!res.ok || data === null) {
          const serverMsg =
            data && typeof data.message === 'string' && data.message.trim() ? data.message.trim() : null
          setGeocodeError(
            serverMsg ?? 'Address search unavailable — check the backend is running.',
          )
          setSuggestions([])
          setShowSuggestions(false)
          return
        }

        const list = Array.isArray(data) ? data : []
        const exact = list.find((s) => s.displayName === locationInput)
        if (exact && !suppressNextOpenRef.current) {
          setSelectedPlace(exact)
          suppressNextOpenRef.current = true
          setSuggestions([])
          setShowSuggestions(false)
          return
        }

        setSuggestions(list)
        setShowSuggestions(list.length > 0 && !suppressNextOpenRef.current)
        if (list.length === 0) setGeocodeError('No results found. Try a different place name.')
      } catch (err) {
        if (err.name === 'AbortError') return
        setGeocodeError(
          'Address search failed. Check VITE_API_URL (production) or run the backend on port 4000 (local).',
        )
        setSuggestions([])
        setShowSuggestions(false)
      } finally {
        if (!controller.signal.aborted) setGeocodeLoading(false)
      }
    }, 550)

    return () => {
      clearTimeout(timer)
      controller.abort()
      setGeocodeLoading(false)
    }
  }, [locationInput])

  function handleLocationChange(e) {
    const val = e.target.value
    setLocationInput(val)
    suppressNextOpenRef.current = false
    setGeocodeError(null)
    if (!val) {
      setSelectedPlace(null)
      setSuggestions([])
    } else if (selectedPlace && val !== selectedPlace.displayName) {
      setSelectedPlace(null)
    }
  }

  function selectSuggestion(s) {
    setSelectedPlace(s)
    setLocationInput(s.displayName)
    setShowSuggestions(false)
    setSuggestions([])
    suppressNextOpenRef.current = true
  }

  function clearLocation() {
    setLocationInput('')
    setSelectedPlace(null)
    setSuggestions([])
    setShowSuggestions(false)
    suppressNextOpenRef.current = false
    setGeocodeError(null)
  }

  return {
    inputRef,
    locationInput,
    suggestions,
    showSuggestions,
    setShowSuggestions,
    selectedPlace,
    geocodeLoading,
    geocodeError,
    handleLocationChange,
    selectSuggestion,
    clearLocation,
  }
}
