import CampsiteCard from './CampsiteCard'

function ScoreBar({ score }) {
  const pct = Math.round(score * 100)
  const color =
    pct >= 70 ? 'bg-emerald-500' : pct >= 45 ? 'bg-amber-400' : 'bg-stone-300'
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-stone-100">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs tabular-nums text-stone-500">{pct}%</span>
    </div>
  )
}

export default function RecommendList({ result, error, loading, tripDate, onClear }) {
  if (loading) {
    return (
      <div className="mb-8 rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <p className="text-sm text-amber-700">Generating recommendations…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mb-8 rounded-2xl border border-red-200 bg-red-50 p-5">
        <p className="text-sm text-red-700">{error}</p>
      </div>
    )
  }

  if (!result) return null

  const { data } = result

  if (result.landscapeNotFound) {
    return (
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-stone-900">✦ Top Picks</h2>
          <button type="button" onClick={onClear} className="text-xs text-stone-400 hover:text-stone-700">
            Dismiss
          </button>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <p className="font-medium">No campsites match your selected landscape in this area.</p>
          <p className="mt-0.5">Try expanding your radius or removing the landscape preference.</p>
        </div>
      </section>
    )
  }

  return (
    <section className="mb-8">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-stone-900">
            ✦ Top Picks
            <span className="ml-2 text-sm font-normal text-stone-500">
              — ranked by distance, weather, landscape &amp; facilities
            </span>
          </h2>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="text-xs text-stone-400 hover:text-stone-700"
        >
          Dismiss
        </button>
      </div>

      {data.length === 0 ? (
        <p className="rounded-xl border border-stone-200 bg-white px-4 py-6 text-center text-sm text-stone-500">
          No campsites found matching your criteria.
        </p>
      ) : (
        <ol className="space-y-4">
          {data.map((c, i) => (
            <li key={c.id}>
              <div className="mb-1 flex items-center gap-3 px-1">
                <span className="w-5 text-right text-xs font-semibold text-stone-400">
                  #{i + 1}
                </span>
                <ScoreBar score={c.score ?? 0} />
                {c.landscape && (
                  <span className="rounded-full bg-teal-50 px-2 py-0.5 text-xs text-teal-700">
                    {c.landscape}
                  </span>
                )}
              </div>
              <CampsiteCard campsite={c} tripDate={tripDate} />
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
