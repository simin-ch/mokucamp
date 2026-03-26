const RADIUS_OPTIONS = ['25', '50', '100', '200', '300']

export default function LocationSearch({
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
  radiusKm,
  onRadiusChange,
}) {
  return (
    <div>
      <span className="mb-2 block text-xs font-medium uppercase tracking-wide text-stone-500">
        Location
      </span>

      {/* Input with inline clear button and dropdown */}
      <div className="relative" ref={inputRef}>
        <input
          type="text"
          value={locationInput}
          onChange={handleLocationChange}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          placeholder="Type at least 3 characters…"
          className="w-full rounded-lg border border-stone-200 px-3 py-2 pr-20 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
        />
        {geocodeLoading && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400">
            Searching…
          </span>
        )}
        {selectedPlace && !geocodeLoading && (
          <button
            type="button"
            onMouseDown={clearLocation}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 py-0.5 text-xs text-stone-400 hover:text-stone-700"
          >
            ✕ Clear
          </button>
        )}
        {showSuggestions && suggestions.length > 0 && (
          <ul className="absolute left-0 right-0 top-full z-50 mt-1 max-h-52 overflow-y-auto rounded-lg border border-stone-200 bg-white shadow-lg">
            {suggestions.map((s, i) => (
              <li
                key={i}
                onMouseDown={() => selectSuggestion(s)}
                className="cursor-pointer truncate px-3 py-2 text-sm hover:bg-stone-50"
                title={s.displayName}
              >
                {s.displayName}
              </li>
            ))}
          </ul>
        )}
      </div>

      {geocodeError && (
        <p className="mt-1.5 text-xs text-amber-600">{geocodeError}</p>
      )}

      {/* Radius pills — only visible once a place is selected */}
      {selectedPlace && (
        <div className="mt-3 flex items-center gap-3">
          <span className="shrink-0 text-xs font-medium text-stone-500">Radius</span>
          <div className="flex flex-wrap gap-1.5">
            {RADIUS_OPTIONS.map((km) => (
              <button
                key={km}
                type="button"
                onClick={() => onRadiusChange(km)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  radiusKm === km
                    ? 'bg-emerald-600 text-white'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {km} km
              </button>
            ))}
          </div>
        </div>
      )}

      {selectedPlace && (
        <p className="mt-1.5 text-xs text-emerald-700">
          ✓ Within {radiusKm} km of{' '}
          <span className="font-medium">
            {selectedPlace.displayName.split(',').slice(0, 2).join(',')}
          </span>
        </p>
      )}
    </div>
  )
}
