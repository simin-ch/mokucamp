import CampsiteCard from './CampsiteCard'

export default function CampsiteList({
  result,
  error,
  loading,
  offset,
  canPrev,
  canNext,
  onPrev,
  onNext,
  tripDate,
  onToggleShortlist,
  isShortlisted,
}) {
  if (error) {
    return (
      <div
        className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        role="alert"
      >
        <p className="font-medium">Request failed</p>
        <p className="mt-1 text-red-700">{error}</p>
        <p className="mt-2 text-xs text-red-600/90">
          Ensure the backend is running on port 4000 and the database is migrated / seeded.
        </p>
      </div>
    )
  }

  if (!result && !loading) {
    return (
      <p className="rounded-xl border border-dashed border-stone-300/90 bg-white/80 py-12 text-center text-stone-500 backdrop-blur-sm">
        Set filters and click <strong className="text-stone-700">Search</strong> to find campsites.
      </p>
    )
  }

  if (!result) return null

  const total = result.total ?? 0

  return (
    <>
      {result.landscapeNotFound && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <p className="font-medium">No campsites match your selected landscape in this area.</p>
          <p className="mt-0.5">Here are other campsites nearby you might like.</p>
        </div>
      )}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-sm text-stone-600">
        <p>
          Showing{' '}
          <span className="font-medium text-stone-900">
            {result.data.length === 0 ? 0 : offset + 1}–{offset + result.data.length}
          </span>{' '}
          of <span className="font-medium text-stone-900">{total}</span>
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={!canPrev || loading}
            onClick={onPrev}
            className="rounded-lg border border-stone-200/90 bg-white/80 px-3 py-1.5 text-sm font-medium backdrop-blur-sm hover:bg-white/92 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={!canNext || loading}
            onClick={onNext}
            className="rounded-lg border border-stone-200/90 bg-white/80 px-3 py-1.5 text-sm font-medium backdrop-blur-sm hover:bg-white/92 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>

      {result.data.length === 0 ? (
        <p className="rounded-xl border border-dashed border-stone-300/90 bg-white/80 py-12 text-center text-stone-500 backdrop-blur-sm">
          No campsites match your filters.
        </p>
      ) : (
        <ul className="space-y-4">
          {result.data.map((c) => (
            <CampsiteCard
              key={c.id}
              campsite={c}
              tripDate={tripDate}
              onToggleShortlist={onToggleShortlist}
              isShortlisted={isShortlisted?.(c.id)}
            />
          ))}
        </ul>
      )}
    </>
  )
}
