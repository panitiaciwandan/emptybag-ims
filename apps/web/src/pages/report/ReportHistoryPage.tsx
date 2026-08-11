import { useQuery } from '@tanstack/react-query'
import { Page } from '@/components/ui/Page'
import { Card, CardBody, EmptyState } from '@/components/ui/Card'
import { getReportHistory } from '@/services/report'
import { formatDate, formatDateTime } from '@/utils/format'
import { useState } from 'react'
import { DataTable, Pagination } from '@/components/ui/Table'
import type { ReportRecord } from '@/types'

export default function ReportHistoryPage() {
  const [page, setPage] = useState(0)
  const { data, isLoading } = useQuery({
    queryKey: ['report-history', page],
    queryFn: () => getReportHistory(page, 50)
  })

  return (
    <Page title="History Laporan">
      <Card>
        <CardBody className="p-0">
          {!data || data.data.length === 0 ? (
            <EmptyState message="Belum ada laporan tersimpan" />
          ) : (
            <>
              <DataTable<ReportRecord>
                data={data.data}
                loading={isLoading}
                columns={[
                  { key: 'type', header: 'Tipe', render: (r) => <span className="badge bg-slate-100 text-slate-700">{r.report_type}</span> },
                  { key: 'date', header: 'Tanggal', render: (r) => formatDate(r.report_date) },
                  { key: 'snapshot', header: 'Baris Data', render: (r) => {
                    const s = r.data_snapshot as unknown
                    return <span>{Array.isArray(s) ? `${s.length} baris` : '-'}</span>
                  } },
                  { key: 'created', header: 'Dibuat', render: (r) => formatDateTime(r.created_at) }
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
