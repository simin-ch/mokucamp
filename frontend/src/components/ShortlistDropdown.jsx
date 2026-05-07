import { useEffect, useRef } from 'react'

/**
 * Renders landscape tags split by comma, each as a teal pill.
 */
function LandscapeTags({ landscape }) {
  if (!landscape) return null
  return (
    <div className="flex flex-wrap gap-1">
      {landscape.split(',').map((l) => (
        <span
          key={l}
          className="rounded-full bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-700"
        >
          {l.trim()}
        </span>
      ))}
    </div>
  )
}

/**
 * A single row in the dropdown list.
 */
function ShortlistRow({ campsite: c, onToggleShortlist }) {
  return (
    <li className="group flex items-start gap-3 rounded-lg px-3 py-2.5 hover:bg-stone-50">
      {/* Text content */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-stone-900">{c.name}</p>

        {/* Region */}
        {c.region && (
          <p className="mt-0.5 truncate text-xs text-stone-500">{c.region}</p>
        )}

        {/* Landscape tags */}
        {c.landscape && (
          <div className="mt-1">
            <LandscapeTags landscape={c.landscape} />
          </div>
        )}

        {/* Facilities */}
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-stone-400">
          <span className={c.dogsAllowedBool ? 'text-emerald-600' : ''}>
            Dogs {c.dogsAllowedBool ? '✓' : '✗'}
          </span>
          <span className={c.hasToilets ? 'text-emerald-600' : ''}>
            Toilets {c.hasToilets ? '✓' : '✗'}
          </span>
          <span className={c.hasWater ? 'text-emerald-600' : ''}>
            Water {c.hasWater ? '✓' : '✗'}
          </span>
          <span className={c.hasPower ? 'text-emerald-600' : ''}>
            Power {c.hasPower ? '✓' : '✗'}
          </span>
        </div>
      </div>

      {/* Remove button */}
      <button
        type="button"
        onClick={() => onToggleShortlist(c)}
        title="Remove from shortlist"
        className="mt-0.5 shrink-0 rounded p-1 text-stone-300 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-stone-100 hover:text-stone-500"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-3.5 w-3.5"
        >
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    </li>
  )
}

/**
 * Dropdown panel that appears below the Shortlist header button.
 * Closes when the user clicks outside or presses Escape.
 */
export default function ShortlistDropdown({ open, onClose, items, onToggleShortlist, onClear }) {
  const panelRef = useRef(null)

  // Close on Escape
  useEffect(() => {
    if (!open) return
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <>
      {/* Click-away backdrop */}
      <div className="fixed inset-0 z-[9998]" onClick={onClose} />

      {/* Dropdown panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Shortlist"
        className="absolute right-0 top-full z-[9999] mt-1.5 flex w-80 flex-col rounded-xl border border-stone-200 bg-white shadow-xl"
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-stone-100 px-3 py-2.5">
          <div className="flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="h-3.5 w-3.5 text-violet-500"
            >
              <path d="M6 2a2 2 0 0 0-2 2v18l8-4 8 4V4a2 2 0 0 0-2-2H6Z" />
            </svg>
            <span className="text-sm font-semibold text-stone-900">Shortlist</span>
            {items.length > 0 && (
              <span className="rounded-full bg-violet-100 px-1.5 py-0.5 text-xs font-semibold text-violet-700">
                {items.length}
              </span>
            )}
          </div>

          {items.length > 0 && (
            <button
              type="button"
              onClick={onClear}
              className="text-xs text-stone-400 hover:text-red-500 transition-colors"
            >
              Clear all
            </button>
          )}
        </div>

        {/* Body */}
        <div className="max-h-[min(420px,60vh)] overflow-y-auto py-1">
          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-8 w-8 text-stone-300"
              >
                <path d="M6 2a2 2 0 0 0-2 2v18l8-4 8 4V4a2 2 0 0 0-2-2H6Z" />
              </svg>
              <p className="text-sm text-stone-500">No campsites saved yet.</p>
              <p className="text-xs text-stone-400">
                Tap the bookmark icon on any campsite to save it here.
              </p>
            </div>
          ) : (
            <ul className="list-none p-0">
              {items.map((c) => (
                <ShortlistRow
                  key={c.id}
                  campsite={c}
                  onToggleShortlist={onToggleShortlist}
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  )
}
