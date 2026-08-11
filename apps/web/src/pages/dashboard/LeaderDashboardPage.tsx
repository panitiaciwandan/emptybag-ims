import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { Page } from '@/components/ui/Page'
import { Card, CardBody, CardHeader, StatCard, EmptyState, LoadingState } from '@/components/ui/Card'
import { getDashboardLeader } from '@/services/dashboard'
import { formatNumber, formatDateTime } from '@/utils/format'
import { ArrowLeftRight, Package, Activity } from 'lucide-react'

export default function LeaderDashboardPage() {
  const { profile } = useAuth()
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-leader'],
    queryFn: getDashboardLeader,
    refetchInterval: 30_000
  })

  return (
    <Page title={`Dashboard Leader${profile ? ` — ${profile.full_name}` : ''}`}>
      {isLoading ? (
        <LoadingState />
      ) : !data ? (
        <EmptyState />
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Transfer Draft" value={formatNumber(data.draft_transfers)} icon={<ArrowLeftRight className="h-4 w-4" />} />
            <StatCard label="Transfer In Transit" value={formatNumber(data.in_transit_transfers)} icon={<ArrowLeftRight className="h-4 w-4" />} />
            <StatCard label="Konsumsi Hari Ini" value={formatNumber(data.today_consumption)} icon={<Activity className="h-4 w-4" />} />
            <StatCard label="Total Stock Transit" value={formatNumber(data.transit_stock.reduce((a, b) => a + b.qty, 0))} icon={<Package className="h-4 w-4" />} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader title="Stock Transit" />
              <CardBody>
                {data.transit_stock.length === 0 ? (
                  <EmptyState />
                ) : (
                  <div className="space-y-2">
                    {data.transit_stock.map((s) => (
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
              <CardHeader title="Aktivitas Terkini" />
              <CardBody>
                {data.recent_activity.length === 0 ? (
                  <EmptyState message="Belum ada aktivitas" />
                ) : (
                  <div className="space-y-2">
                    {data.recent_activity.map((a) => (
                      <div key={a.id} className="flex items-center justify-between text-sm border-b border-slate-100 pb-2">
                        <div>
                          <p className="text-slate-700 font-medium">{a.transaction_number}</p>
                          <p className="text-xs text-slate-400">{a.transaction_type} • {formatDateTime(a.created_at)}</p>
                        </div>
                        <span className="badge bg-slate-100 text-slate-600">{a.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>
          </div>
        </div>
      )}
    </Page>
  )
}
