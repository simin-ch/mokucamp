import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import StarRating from './StarRating'

describe('StarRating', () => {
  it('renders readonly stars with the current value', () => {
    render(<StarRating value={3} />)
    expect(screen.getByLabelText('3 out of 5 stars')).toBeInTheDocument()
    expect(screen.getByLabelText('3 stars')).toBeDisabled()
  })

  it('calls onChange when a star is clicked', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<StarRating value={2} onChange={onChange} />)

    await user.click(screen.getByLabelText('4 stars'))
    expect(onChange).toHaveBeenCalledWith(4)
  })
})
