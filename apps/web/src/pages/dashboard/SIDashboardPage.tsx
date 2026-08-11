import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { Page } from '@/components/ui/Page'
import { Card, CardBody, CardHeader, StatCard, EmptyState } from '@/components/ui/Card'
import { getDashboardSI } from '@/services/dashboard'
import { formatNumber } from '@/utils/format'
import { Package, AlertTriangle, Layers } from 'lucide-react'
import { todayISO } from '@/utils/format'
import { useState } from 'react'

export default function SIDashboardPage() {
  const { profile } = useAuth()
  const today = todayISO()
  const [dateFrom] = useState(today)
  const [dateTo] = useState(today)

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-si', dateFrom, dateTo],
    queryFn: () => getDashboardSI(dateFrom, dateTo),
    refetchInterval: 30_000
  })

  return (
    <Page title={`Dashboard SI${profile ? ` — ${profile.full_name}` : ''}`}>
      {isLoading ? (
        <p className="text-sm text-slate-400">Memuat data...</p>
      ) : !data ? (
        <EmptyState />
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Total Stock (PCS)" value={formatNumber(data.total_stock)} icon={<Package className="h-4 w-4" />} />
            <StatCard label="Konsumsi Hari Ini" value={formatNumber(data.today_consumption)} icon={<Layers className="h-4 w-4" />} />
            <StatCard label="Damage Hari Ini" value={formatNumber(data.today_damage)} color="text-red-600" />
            <StatCard label="Reject Hari Ini" value={formatNumber(data.today_reject)} color="text-orange-600" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Lower (PCS Issued)" value={formatNumber(data.today_lower)} color="text-purple-600" />
            <StatCard label="Buffer" value={formatNumber(data.today_buffer)} color="text-blue-600" />
            <StatCard label="Good (DO)" value={formatNumber(data.today_good)} color="text-emerald-600" />
            <StatCard label="Low Stock" value={formatNumber(data.low_stock_count)} color={data.low_stock_count > 0 ? 'text-red-600' : 'text-slate-900'} icon={<AlertTriangle className="h-4 w-4" />} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader title="Stock per Lokasi" />
              <CardBody>
                {data.by_location.length === 0 ? (
                  <EmptyState />
                ) : (
                  <div className="space-y-2">
                    {data.by_location.map((l) => (
                      <div key={l.location_code} className="flex items-center justify-between">
                        <span className="text-sm text-slate-600 flex items-center gap-2">
                          <Layers className="h-4 w-4 text-slate-400" /> {l.location_name}
                        </span>
                        <span className="font-semibold text-sm">{formatNumber(l.total)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Konsumsi per Kategori" />
              <CardBody>
                {data.by_category.length === 0 ? (
                  <EmptyState />
                ) : (
                  <div className="space-y-2">
                    {data.by_category.map((c) => (
                      <div key={c.category} className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">{c.category}</span>
                        <span className="font-semibold text-sm">{formatNumber(c.total)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>
          </div>

          <Card>
            <CardHeader title="Low Stock Alert" />
            <CardBody>
              {data.low_stock.length === 0 ? (
                <p className="text-sm text-emerald-600">Semua stock di atas minimum.</p>
              ) : (
                <div className="space-y-2">
                  {data.low_stock.map((s) => (
                    <div key={s.item_code + s.location_code} className="flex items-center justify-between text-sm">
                      <span className="text-slate-700">{s.item_name} ({s.location_code})</span>
                      <span className="text-red-600 font-medium">
                        {formatNumber(s.qty)} / min {formatNumber(s.min_stock)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      )}
    </Page>
  )
}
