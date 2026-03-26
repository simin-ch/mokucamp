import { useEffect, useRef, useState } from 'react'

export function useGeocode() {
  const [locationInput, setLocationInput] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedPlace, setSelectedPlace] = useState(null)
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
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(locationInput)}`)
        const data = await res.json().catch(() => null)
        if (!res.ok || data === null) {
          setGeocodeError('Address search unavailable — check the backend is running.')
          setSuggestions([])
          setShowSuggestions(false)
          return
        }
        const list = Array.isArray(data) ? data : []
        setSuggestions(list)
        setShowSuggestions(list.length > 0)
        if (list.length === 0) setGeocodeError('No results found. Try a different place name.')
      } catch {
        setGeocodeError('Address search failed. Is the backend running on port 4000?')
        setSuggestions([])
        setShowSuggestions(false)
      } finally {
        setGeocodeLoading(false)
      }
    }, 400)
    return () => {
      clearTimeout(timer)
      setGeocodeLoading(false)
    }
  }, [locationInput])

  function handleLocationChange(e) {
    const val = e.target.value
    setLocationInput(val)
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
  }

  function clearLocation() {
    setLocationInput('')
    setSelectedPlace(null)
    setSuggestions([])
    setShowSuggestions(false)
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
