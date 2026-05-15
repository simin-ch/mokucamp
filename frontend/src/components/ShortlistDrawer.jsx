import { useEffect } from 'react'

function BookmarkIcon({ filled }) {
  return filled ? (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
      <path d="M6 2a2 2 0 0 0-2 2v18l8-4 8 4V4a2 2 0 0 0-2-2H6Z" />
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M6 2a2 2 0 0 0-2 2v18l8-4 8 4V4a2 2 0 0 0-2-2H6Z" />
    </svg>
  )
}

function ShortlistItem({ campsite: c, onToggleShortlist, isShortlisted }) {
  return (
    <div className="overflow-hidden rounded-xl border border-stone-200/90 bg-white/85 shadow-sm">
      <div className="flex items-start justify-between gap-2 border-b border-stone-100 px-3 py-2.5">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-stone-900">{c.name}</h3>
          <p className="truncate text-xs text-stone-500">{[c.place, c.region].filter(Boolean).join(' · ') || '—'}</p>
        </div>
        {onToggleShortlist && (
          <button
            type="button"
            onClick={() => onToggleShortlist(c)}
            title={isShortlisted ? 'Remove from shortlist' : 'Add to shortlist'}
            className={`shrink-0 rounded-lg border p-1.5 transition-colors ${
              isShortlisted
                ? 'border-violet-200 bg-violet-50 text-violet-600 hover:bg-violet-100'
                : 'border-stone-200 bg-white/60 text-stone-400 hover:border-stone-300 hover:text-stone-600'
            }`}
          >
            <BookmarkIcon filled={isShortlisted} />
          </button>
        )}
      </div>
      {c.staticLink && (
        <div className="px-3 py-2">
          <a
            href={c.staticLink}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-medium text-emerald-700 hover:text-emerald-800 hover:underline"
          >
            Open official page
          </a>
        </div>
      )}
    </div>
  )
}

export default function ShortlistDrawer({ open, onClose, items, onToggleShortlist, isShortlisted, onClear, onLocate }) {
  // Close on Escape key
  useEffect(() => {
    if (!open) return
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-stone-900/30 backdrop-blur-[2px] transition-opacity duration-300 ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      {/* Drawer panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Shortlist"
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-stone-200/80 bg-white/90 shadow-2xl backdrop-blur-md transition-transform duration-300 ease-in-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Drawer header */}
        <div className="flex shrink-0 items-center justify-between border-b border-stone-200/80 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 text-violet-500">
              <path d="M6 2a2 2 0 0 0-2 2v18l8-4 8 4V4a2 2 0 0 0-2-2H6Z" />
            </svg>
            <h2 className="text-base font-semibold text-stone-900">Shortlist</h2>
            {items.length > 0 && (
              <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-700">
                {items.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {items.length > 0 && (
              <button
                type="button"
                onClick={onClear}
                className="rounded-lg border border-stone-200/90 bg-white/75 px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-white/90"
              >
                Clear all
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close shortlist"
              className="rounded-lg border border-stone-200/90 bg-white/75 p-1.5 text-stone-500 hover:bg-white/90 hover:text-stone-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Drawer body */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-10 w-10 text-stone-300">
                <path d="M6 2a2 2 0 0 0-2 2v18l8-4 8 4V4a2 2 0 0 0-2-2H6Z" />
              </svg>
              <p className="text-sm text-stone-500">No campsites saved yet.</p>
              <p className="text-xs text-stone-400">
                Use the bookmark in the map popup or campsite detail to save sites here.
              </p>
            </div>
          ) : (
            <ul className="list-none space-y-3 pl-0">
              {items.map((c) => (
                <li key={c.id} className="list-none">
                  {onLocate && (
                    <button
                      type="button"
                      onClick={() => { onLocate(c); onClose() }}
                      className="mb-1.5 flex w-full items-center gap-1.5 rounded-lg border border-stone-200 bg-white/70 px-3 py-1.5 text-xs font-medium text-stone-600 transition hover:border-emerald-300 hover:text-emerald-700"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
                        <line x1="9" y1="3" x2="9" y2="18" />
                        <line x1="15" y1="6" x2="15" y2="21" />
                      </svg>
                      View on map
                    </button>
                  )}
                  <ShortlistItem
                    campsite={c}
                    onToggleShortlist={onToggleShortlist}
                    isShortlisted={isShortlisted(c.id)}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </>
  )
}
