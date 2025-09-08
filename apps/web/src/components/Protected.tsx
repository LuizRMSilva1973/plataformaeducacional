import React from 'react'
import { useAuth } from '../lib/auth'
import { Navigate, useLocation } from 'react-router-dom'

export function Protected({ children }: { children: React.ReactNode }) {
  const { token } = useAuth()
  const loc = useLocation()
  if (!token) return <Navigate to="/login" state={{ from: loc.pathname }} replace />
  return <>{children}</>
}

