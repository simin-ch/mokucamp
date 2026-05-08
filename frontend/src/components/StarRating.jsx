/**
 * StarRating
 *
 * Props:
 *   value   – current rating (1–5, or 0 for unset)
 *   onChange – if provided, renders as an interactive star picker
 *   size    – 'sm' | 'md' (default 'md')
 */
export default function StarRating({ value = 0, onChange, size = 'md' }) {
  const readonly = !onChange
  const starSize = size === 'sm' ? 'h-3.5 w-3.5' : 'h-5 w-5'

  return (
    <div className="flex items-center gap-0.5" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= value
        return (
          <button
            key={star}
            type="button"
            disabled={readonly}
            onClick={readonly ? undefined : () => onChange(star)}
            className={[
              starSize,
              'transition-colors',
              filled ? 'text-amber-400' : 'text-stone-300',
              readonly ? 'cursor-default' : 'cursor-pointer hover:text-amber-300',
            ].join(' ')}
            aria-label={`${star} star${star !== 1 ? 's' : ''}`}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </button>
        )
      })}
    </div>
  )
}
