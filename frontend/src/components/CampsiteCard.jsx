function boolLabel(v) {
  if (v === true) return 'Yes'
  if (v === false) return 'No'
  return '—'
}

export default function CampsiteCard({ campsite: c }) {
  return (
    <li className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
      {/* Header */}
      <div className="border-b border-stone-100 px-4 py-3 sm:flex sm:items-start sm:justify-between sm:gap-4">
        <div>
          <h2 className="text-base font-semibold text-stone-900">{c.name}</h2>
          <p className="mt-0.5 text-sm text-stone-600">
            {[c.place, c.region].filter(Boolean).join(' · ') || '—'}
          </p>
        </div>
        <div className="mt-2 flex flex-wrap gap-2 sm:mt-0 sm:justify-end">
          {c.distanceKm != null && (
            <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-medium text-sky-800">
              {c.distanceKm < 1
                ? `${Math.round(c.distanceKm * 1000)} m`
                : `${c.distanceKm} km`}
            </span>
          )}
          {c.campsiteCategory && (
            <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-700">
              {c.campsiteCategory}
            </span>
          )}
          {c.bookable && (
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
              Bookable
            </span>
          )}
        </div>
      </div>

      {/* Details grid */}
      <div className="grid gap-3 px-4 py-3 text-sm sm:grid-cols-2">
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-stone-600">
          <dt className="text-stone-500">Dogs</dt>
          <dd>{boolLabel(c.dogsAllowedBool)}</dd>
          <dt className="text-stone-500">Toilets</dt>
          <dd>{boolLabel(c.hasToilets)}</dd>
          <dt className="text-stone-500">Water</dt>
          <dd>{boolLabel(c.hasWater)}</dd>
          <dt className="text-stone-500">Power</dt>
          <dd>{boolLabel(c.hasPower)}</dd>
        </dl>
        <div className="text-stone-600">
          <p className="text-xs uppercase tracking-wide text-stone-500">Coordinates</p>
          <p className="mt-1 font-mono text-xs tabular-nums">
            {c.lat?.toFixed(5)}, {c.lon?.toFixed(5)}
          </p>
          {(c.numberOfPoweredSites != null || c.numberOfUnpoweredSites != null) && (
            <p className="mt-2 text-xs text-stone-500">
              Sites: powered {c.numberOfPoweredSites ?? '—'}, unpowered{' '}
              {c.numberOfUnpoweredSites ?? '—'}
            </p>
          )}
        </div>
      </div>

      {c.introduction && (
        <p className="border-t border-stone-100 px-4 py-3 text-sm leading-relaxed text-stone-600 line-clamp-3">
          {c.introduction}
        </p>
      )}

      {c.staticLink && (
        <div className="border-t border-stone-100 px-4 py-2">
          <a
            href={c.staticLink}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-medium text-emerald-700 hover:text-emerald-800 hover:underline"
          >
            Open official page
          </a>
        </div>
      )}
    </li>
  )
}
