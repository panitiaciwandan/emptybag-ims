import { useQuery } from '@tanstack/react-query'
import { Page } from '@/components/ui/Page'
import { Card, CardBody, EmptyState } from '@/components/ui/Card'
import { getEnvironmentLogs } from '@/services/operations'
import { formatNumber, formatDate } from '@/utils/format'
import { useState } from 'react'
import { DataTable, Pagination } from '@/components/ui/Table'
import type { EnvironmentLog } from '@/types'

export default function EnvironmentPage() {
  const [page, setPage] = useState(0)
  const { data, isLoading } = useQuery({
    queryKey: ['environment', page],
    queryFn: () => getEnvironmentLogs({}, page, 50)
  })

  return (
    <Page title="Environment Monitoring" action={<a href="/environment/new" className="btn-primary">Input</a>}>
      <Card>
        <CardBody className="p-0">
          {!data || data.data.length === 0 ? (
            <EmptyState message="Belum ada data lingkungan" />
          ) : (
            <>
              <DataTable<EnvironmentLog>
                data={data.data}
                loading={isLoading}
                columns={[
                  { key: 'date', header: 'Tanggal', render: (r) => formatDate(r.log_date) },
                  { key: 'loc', header: 'Lokasi', render: (r) => r.location?.location_name ?? '-' },
                  { key: 'temp', header: 'Suhu (°C)', render: (r) => r.temperature != null ? formatNumber(r.temperature) : '-' },
                  { key: 'hum', header: 'Humidity (%)', render: (r) => r.humidity != null ? formatNumber(r.humidity) : '-' },
                  { key: 'remarks', header: 'Catatan', render: (r) => r.remarks ?? '-' }
                ]}
              />
              <Pagination page={page} pageSize={50} total={data?.count ?? 0} onChange={setPage} />
            </>
          )}
        </CardBody>
      </Card>
    </Page>
  )
}
