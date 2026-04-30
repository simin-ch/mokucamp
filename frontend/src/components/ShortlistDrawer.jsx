import { useEffect } from 'react'
import CampsiteCard from './CampsiteCard'

export default function ShortlistDrawer({ open, onClose, items, onToggleShortlist, isShortlisted, onClear }) {
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
                Tap the bookmark icon on any campsite card to save it here.
              </p>
            </div>
          ) : (
            <ul className="space-y-4 list-none pl-0">
              {items.map((c) => (
                <CampsiteCard
                  key={c.id}
                  campsite={c}
                  onToggleShortlist={onToggleShortlist}
                  isShortlisted={isShortlisted(c.id)}
                />
              ))}
            </ul>
          )}
        </div>
      </aside>
    </>
  )
}
