import { useQuery } from '@tanstack/react-query'
import { Page } from '@/components/ui/Page'
import { Card, CardBody, EmptyState } from '@/components/ui/Card'
import { getAuditLogs } from '@/services/dashboard'
import { formatDateTime } from '@/utils/format'
import { useState } from 'react'
import { DataTable, Pagination } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import type { AuditLog } from '@/types'

export default function AuditPage() {
  const [page, setPage] = useState(0)
  const { data, isLoading } = useQuery({
    queryKey: ['audit', page],
    queryFn: () => getAuditLogs({}, page, 50)
  })

  return (
    <Page title="Audit Log">
      <Card>
        <CardBody className="p-0">
          {!data || data.data.length === 0 ? (
            <EmptyState message="Belum ada audit log" />
          ) : (
            <>
              <DataTable<AuditLog>
                data={data.data}
                loading={isLoading}
                columns={[
                  { key: 'time', header: 'Waktu', render: (r) => <span className="text-xs whitespace-nowrap">{formatDateTime(r.created_at)}</span> },
                  { key: 'user', header: 'User', render: (r) => r.user?.full_name ?? '-' },
                  { key: 'action', header: 'Aksi', render: (r) => (
                    <Badge color={
                      r.action === 'CREATE' ? 'bg-emerald-100 text-emerald-700' :
                      r.action === 'UPDATE' ? 'bg-blue-100 text-blue-700' :
                      r.action === 'DELETE' || r.action === 'VOID' ? 'bg-red-100 text-red-700' :
                      r.action === 'APPROVE' ? 'bg-purple-100 text-purple-700' :
                      'bg-slate-100 text-slate-700'
                    }>{r.action}</Badge>
                  ) },
                  { key: 'table', header: 'Tabel', render: (r) => <span className="text-xs font-mono">{r.table_name}</span> },
                  { key: 'record', header: 'Record', render: (r) => r.record_id ? <span className="text-xs font-mono">{r.record_id.slice(0, 8)}…</span> : '-' }
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
