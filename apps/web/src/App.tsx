import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { LoadingState } from '@/components/ui/Card'
import { rolePath } from '@/layouts/AppLayout'

const LoginPage = lazy(() => import('@/pages/auth/LoginPage'))
const UnauthorizedPage = lazy(() => import('@/pages/auth/UnauthorizedPage'))
const SIDashboardPage = lazy(() => import('@/pages/dashboard/SIDashboardPage'))
const LeaderDashboardPage = lazy(() => import('@/pages/dashboard/LeaderDashboardPage'))
const TransitDashboardPage = lazy(() => import('@/pages/dashboard/TransitDashboardPage'))
const StockPage = lazy(() => import('@/pages/stock/StockPage'))
const ConsumptionPage = lazy(() => import('@/pages/consumption/ConsumptionPage'))
const ConsumptionNewPage = lazy(() => import('@/pages/consumption/ConsumptionNewPage'))
const TransferPage = lazy(() => import('@/pages/transfer/TransferPage'))
const TransferNewPage = lazy(() => import('@/pages/transfer/TransferNewPage'))
const DOPage = lazy(() => import('@/pages/do/DOPage'))
const DONewPage = lazy(() => import('@/pages/do/DONewPage'))
const ReportPage = lazy(() => import('@/pages/report/ReportPage'))
const ReportHistoryPage = lazy(() => import('@/pages/report/ReportHistoryPage'))
const QCPage = lazy(() => import('@/pages/qc/QCPage'))
const QCNewPage = lazy(() => import('@/pages/qc/QCNewPage'))
const EnvironmentPage = lazy(() => import('@/pages/environment/EnvironmentPage'))
const EnvironmentNewPage = lazy(() => import('@/pages/environment/EnvironmentNewPage'))
const OpnamePage = lazy(() => import('@/pages/opname/OpnamePage'))
const OpnameNewPage = lazy(() => import('@/pages/opname/OpnameNewPage'))
const MasterPage = lazy(() => import('@/pages/master/MasterPage'))
const AuditPage = lazy(() => import('@/pages/audit/AuditPage'))

const ALL_ROLES = ['SI', 'LEADER', 'PETUGAS_TRANSIT']

function RoleHome() {
  const { roleCode } = useAuth()
  return <Navigate to={rolePath(roleCode)} replace />
}

function withSuspense(node: React.ReactNode) {
  return <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><LoadingState /></div>}>{node}</Suspense>
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={withSuspense(<LoginPage />)} />
      <Route path="/unauthorized" element={withSuspense(<UnauthorizedPage />)} />

      <Route path="/" element={<RoleHome />} />

      <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['SI']}><SIDashboardPage /></ProtectedRoute>} />
      <Route path="/leader" element={<ProtectedRoute allowedRoles={['LEADER']}><LeaderDashboardPage /></ProtectedRoute>} />
      <Route path="/operator" element={<ProtectedRoute allowedRoles={['PETUGAS_TRANSIT']}><TransitDashboardPage /></ProtectedRoute>} />

      <Route path="/stock" element={<ProtectedRoute allowedRoles={ALL_ROLES}><StockPage /></ProtectedRoute>} />
      <Route path="/consumption" element={<ProtectedRoute allowedRoles={ALL_ROLES}><ConsumptionPage /></ProtectedRoute>} />
      <Route path="/consumption/new" element={<ProtectedRoute allowedRoles={ALL_ROLES}><ConsumptionNewPage /></ProtectedRoute>} />
      <Route path="/transfer" element={<ProtectedRoute allowedRoles={ALL_ROLES}><TransferPage /></ProtectedRoute>} />
      <Route path="/transfer/new" element={<ProtectedRoute allowedRoles={ALL_ROLES}><TransferNewPage /></ProtectedRoute>} />
      <Route path="/do" element={<ProtectedRoute allowedRoles={ALL_ROLES}><DOPage /></ProtectedRoute>} />
      <Route path="/do/new" element={<ProtectedRoute allowedRoles={ALL_ROLES}><DONewPage /></ProtectedRoute>} />
      <Route path="/report" element={<ProtectedRoute allowedRoles={ALL_ROLES}><ReportPage /></ProtectedRoute>} />
      <Route path="/report/history" element={<ProtectedRoute allowedRoles={ALL_ROLES}><ReportHistoryPage /></ProtectedRoute>} />
      <Route path="/qc" element={<ProtectedRoute allowedRoles={ALL_ROLES}><QCPage /></ProtectedRoute>} />
      <Route path="/qc/new" element={<ProtectedRoute allowedRoles={ALL_ROLES}><QCNewPage /></ProtectedRoute>} />
      <Route path="/environment" element={<ProtectedRoute allowedRoles={ALL_ROLES}><EnvironmentPage /></ProtectedRoute>} />
      <Route path="/environment/new" element={<ProtectedRoute allowedRoles={ALL_ROLES}><EnvironmentNewPage /></ProtectedRoute>} />
      <Route path="/opname" element={<ProtectedRoute allowedRoles={ALL_ROLES}><OpnamePage /></ProtectedRoute>} />
      <Route path="/opname/new" element={<ProtectedRoute allowedRoles={ALL_ROLES}><OpnameNewPage /></ProtectedRoute>} />

      <Route path="/master" element={<ProtectedRoute allowedRoles={['SI']}><MasterPage /></ProtectedRoute>} />
      <Route path="/audit" element={<ProtectedRoute allowedRoles={['SI']}><AuditPage /></ProtectedRoute>} />

      <Route path="*" element={<RoleHome />} />
    </Routes>
  )
}
