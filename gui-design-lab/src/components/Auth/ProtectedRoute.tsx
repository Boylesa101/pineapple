import type { PropsWithChildren } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { hasSession } from '../../utils/auth'

export function ProtectedRoute({ children }: PropsWithChildren) {
  const location = useLocation()

  if (!hasSession()) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return children
}
