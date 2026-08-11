import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { AppLayout } from '@/layouts/AppLayout'
import { LoadingState } from '@/components/ui/Card'

export function ProtectedRoute({ allowedRoles, children }: { allowedRoles: string[]; children: ReactNode }) {
  const { session, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingState />
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  const role = profile?.role?.code ?? null

  if (!role) {
    return <Navigate to="/unauthorized" replace />
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    return <Navigate to="/unauthorized" replace />
  }

  return <AppLayout>{children}</AppLayout>
}
