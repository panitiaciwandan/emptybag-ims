import { useQuery } from '@tanstack/react-query'
import { Page } from '@/components/ui/Page'
import { Card, CardBody, EmptyState } from '@/components/ui/Card'
import { getOpnames, submitOpname, approveOpname } from '@/services/operations'
import { formatNumber, formatDate, errorMessage } from '@/utils/format'
import { useState } from 'react'
import { DataTable, Pagination } from '@/components/ui/Table'
import { StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/hooks/useToast'
import { useAuth } from '@/hooks/useAuth'
import type { StockOpname } from '@/types'

export default function OpnamePage() {
  const { toastEl, error: toastError, success } = useToast()
  const { roleCode } = useAuth()
  const [page, setPage] = useState(0)
  const [busy, setBusy] = useState<string | null>(null)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['opname', page],
    queryFn: () => getOpnames({}, page, 50)
  })

  const run = async (id: string, fn: (id: string) => Promise<unknown>, msg: string) => {
    setBusy(id)
    try {
      await fn(id)
      success(msg)
      refetch()
    } catch (e) {
      toastError(errorMessage(e))
    } finally {
      setBusy(null)
    }
  }

  return (
    <Page title="Stock Opname" action={<a href="/opname/new" className="btn-primary">Buat Opname</a>}>
      {toastEl}
      <Card>
        <CardBody className="p-0">
          {!data || data.data.length === 0 ? (
            <EmptyState message="Belum ada opname" />
          ) : (
            <>
              <DataTable<StockOpname>
                data={data.data}
                loading={isLoading}
                columns={[
                  { key: 'number', header: 'No. Opname', render: (r) => <span className="font-medium">{r.opname_number}</span> },
                  { key: 'date', header: 'Tanggal', render: (r) => formatDate(r.opname_date) },
                  { key: 'item', header: 'Item', render: (r) => r.item?.item_code ?? '-' },
                  { key: 'loc', header: 'Lokasi', render: (r) => r.location?.location_name ?? '-' },
                  { key: 'sys', header: 'Sistem', render: (r) => formatNumber(r.system_qty) },
                  { key: 'phy', header: 'Fisik', render: (r) => formatNumber(r.physical_qty) },
                  { key: 'diff', header: 'Selisih', render: (r) => (
                    <span className={`font-semibold ${r.difference > 0 ? 'text-emerald-600' : r.difference < 0 ? 'text-red-600' : 'text-slate-600'}`}>
                      {formatNumber(r.difference)}
                    </span>
                  ) },
                  { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
                  { key: 'actions', header: 'Aksi', render: (r) => (
                    <div className="flex gap-1">
                      {r.status === 'DRAFT' && (
                        <Button size="sm" variant="secondary" loading={busy === r.id} onClick={() => run(r.id, submitOpname, 'Opname disubmit')}>Submit</Button>
                      )}
                      {r.status === 'SUBMITTED' && roleCode === 'SI' && (
                        <Button size="sm" variant="success" loading={busy === r.id} onClick={() => run(r.id, approveOpname, 'Opname disetujui + adjustment dibuat')}>Approve</Button>
                      )}
                    </div>
                  ) }
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
