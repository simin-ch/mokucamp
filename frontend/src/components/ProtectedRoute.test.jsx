import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './ProtectedRoute'
import { AuthContext } from '../hooks/authContext'

function renderProtectedRoute(authValue) {
  return render(
    <MemoryRouter initialEntries={['/profile']}>
      <AuthContext.Provider value={authValue}>
        <Routes>
          <Route path="/" element={<div>home</div>} />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <div>profile</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthContext.Provider>
    </MemoryRouter>,
  )
}

describe('ProtectedRoute', () => {
  it('shows a loading spinner while auth is resolving', () => {
    renderProtectedRoute({ user: null, loading: true })
    expect(document.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('redirects unauthenticated users to home', () => {
    renderProtectedRoute({ user: null, loading: false })
    expect(screen.getByText('home')).toBeInTheDocument()
  })

  it('renders children when the user is signed in', () => {
    renderProtectedRoute({
      user: { id: 1, email: 'camper@example.com' },
      loading: false,
    })
    expect(screen.getByText('profile')).toBeInTheDocument()
  })
})
