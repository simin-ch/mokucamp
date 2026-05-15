import { Navigate, Route, Routes } from 'react-router-dom'
import EmailVerifyPage from './components/EmailVerifyPage'
import ProtectedRoute from './components/ProtectedRoute'
import AuthProvider from './hooks/AuthProvider'
import HomePage from './pages/HomePage'
import ProfilePage from './pages/ProfilePage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import './App.css'

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/verify-email" element={<EmailVerifyPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}
