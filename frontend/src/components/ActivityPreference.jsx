import { useEffect, useRef, useState } from 'react'
import { ACTIVITY_OPTIONS } from '../utils/queryString'
import {
  SEARCH_DROPDOWN_OPTION,
  SEARCH_DROPDOWN_PANEL,
  SEARCH_FIELD_CONTROL,
  SEARCH_FIELD_LABEL_SPACED,
} from './searchFormStyles'

function summaryLabel(selected) {
  if (selected.length === 0) return 'Any activities'
  if (selected.length === 1) {
    return ACTIVITY_OPTIONS.find((o) => o.value === selected[0])?.label ?? selected[0]
  }
  return `${selected.length} activities selected`
}

export default function ActivityPreference({ selected, onChange }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)

  useEffect(() => {
    function onPointerDown(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [])

  function toggle(value) {
    const next = selected.includes(value)
      ? selected.filter((v) => v !== value)
      : [...selected, value]
    onChange(next)
  }

  return (
    <div className="relative max-w-xs" ref={rootRef}>
      <label
        id="activity-select-label"
        className={SEARCH_FIELD_LABEL_SPACED}
      >
        Activities
      </label>
      <button
        type="button"
        id="activity-select"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby="activity-select-label activity-select"
        onClick={() => setOpen((v) => !v)}
        className={`${SEARCH_FIELD_CONTROL} flex items-center justify-between text-left`}
      >
        <span>{summaryLabel(selected)}</span>
        <span className="ml-2 text-stone-400" aria-hidden>
          ▾
        </span>
      </button>

      {open && (
        <ul
          role="listbox"
          aria-multiselectable="true"
          aria-labelledby="activity-select-label"
          className={`${SEARCH_DROPDOWN_PANEL} max-h-52 overflow-y-auto`}
        >
          {ACTIVITY_OPTIONS.map(({ value, label }) => {
            const checked = selected.includes(value)
            return (
              <li key={value} role="option" aria-selected={checked}>
                <label className={SEARCH_DROPDOWN_OPTION}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(value)}
                    className="h-4 w-4 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>{label}</span>
                </label>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
