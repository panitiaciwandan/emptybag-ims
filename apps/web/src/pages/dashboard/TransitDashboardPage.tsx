import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { Page } from '@/components/ui/Page'
import { Card, CardBody, CardHeader, StatCard, EmptyState, LoadingState } from '@/components/ui/Card'
import { getDashboardTransit } from '@/services/dashboard'
import { formatNumber } from '@/utils/format'
import { Package, ArrowDown, FlaskConical, Thermometer, FileBarChart } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function TransitDashboardPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-transit'],
    queryFn: getDashboardTransit,
    refetchInterval: 30_000
  })

  const quickActions = [
    { label: 'Input Konsumsi', path: '/consumption', icon: <ArrowDown className="h-5 w-5" /> },
    { label: 'Input Transfer', path: '/transfer', icon: <Package className="h-5 w-5" /> },
    { label: 'Input QC', path: '/qc', icon: <FlaskConical className="h-5 w-5" /> },
    { label: 'Input Lingkungan', path: '/environment', icon: <Thermometer className="h-5 w-5" /> },
    { label: 'Shift Report', path: '/report', icon: <FileBarChart className="h-5 w-5" /> }
  ]

  return (
    <Page title={`Dashboard Transit${profile ? ` — ${profile.full_name}` : ''}`}>
      {isLoading ? (
        <LoadingState />
      ) : !data ? (
        <EmptyState />
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-2">
            {quickActions.map((a) => (
              <button
                key={a.path}
                onClick={() => navigate(a.path)}
                className="flex flex-col items-center gap-2 bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:bg-slate-50 active:scale-95 transition"
              >
                <span className="text-slate-700">{a.icon}</span>
                <span className="text-xs font-medium text-slate-700">{a.label}</span>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Stock Transit" value={formatNumber(data.current_stock.reduce((a, b) => a + b.qty, 0))} icon={<Package className="h-4 w-4" />} />
            <StatCard label="Issued Hari Ini" value={formatNumber(data.today_issued)} icon={<ArrowDown className="h-4 w-4" />} />
            <StatCard label="QC Hari Ini" value={formatNumber(data.today_qc)} icon={<FlaskConical className="h-4 w-4" />} />
            <StatCard label="Log Lingkungan" value={formatNumber(data.today_env)} icon={<Thermometer className="h-4 w-4" />} />
          </div>

          <Card>
            <CardHeader title="Current Stock" />
            <CardBody>
              {data.current_stock.length === 0 ? (
                <EmptyState />
              ) : (
                <div className="space-y-2">
                  {data.current_stock.map((s) => (
                    <div key={s.item_code + s.location_code} className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">{s.item_name}</span>
                      <span className="font-medium">{formatNumber(s.qty)} <span className="text-xs text-slate-400">({s.location_code})</span></span>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Status Shift Report" />
            <CardBody>
              <p className="text-sm text-slate-600">
                {data.report_status ? `Laporan terakhir: ${data.report_status}` : 'Belum ada laporan untuk shift ini.'}
              </p>
            </CardBody>
          </Card>
        </div>
      )}
    </Page>
  )
}
