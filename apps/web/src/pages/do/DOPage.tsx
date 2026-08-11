import { useQuery } from '@tanstack/react-query'
import { Page } from '@/components/ui/Page'
import { Card, CardBody, EmptyState } from '@/components/ui/Card'
import { getDOs, submitDO, approveDO, rejectDO, voidDO, closeDO } from '@/services/do'
import { formatNumber, formatDate, errorMessage } from '@/utils/format'
import { useState } from 'react'
import { DataTable, Pagination } from '@/components/ui/Table'
import { StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/hooks/useToast'
import { useAuth } from '@/hooks/useAuth'
import type { DOHeader } from '@/types'

export default function DOPage() {
  const { toastEl, error: toastError, success } = useToast()
  const { roleCode } = useAuth()
  const [page, setPage] = useState(0)
  const [busy, setBusy] = useState<string | null>(null)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['dos', page],
    queryFn: () => getDOs({}, page, 50),
    refetchInterval: 30_000
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
    <Page title="DO Management" action={<a href="/do/new" className="btn-primary">Buat DO</a>}>
      {toastEl}
      <Card>
        <CardBody className="p-0">
          {!data || data.data.length === 0 ? (
            <EmptyState message="Tidak ada DO" />
          ) : (
            <>
              <DataTable<DOHeader>
                data={data.data}
                loading={isLoading}
                columns={[
                  { key: 'number', header: 'No. DO', render: (r) => <span className="font-medium">{r.do_number}</span> },
                  { key: 'date', header: 'Tanggal', render: (r) => formatDate(r.do_date) },
                  { key: 'items', header: 'Item', render: (r) => (
                    <div className="text-xs space-y-0.5">
                      {r.details?.map((d) => (
                        <div key={d.id}>{d.item?.item_code}: {formatNumber(d.requested_qty)} PCS</div>
                      ))}
                    </div>
                  ) },
                  { key: 'requester', header: 'Pemohon', render: (r) => r.requester?.full_name ?? '-' },
                  { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
                  { key: 'actions', header: 'Aksi', render: (r) => (
                    <div className="flex gap-1 flex-wrap">
                      {r.status === 'DRAFT' && (
                        <Button size="sm" variant="secondary" loading={busy === r.id} onClick={() => run(r.id, submitDO, 'DO disubmit')}>Submit</Button>
                      )}
                      {r.status === 'SUBMITTED' && roleCode === 'LEADER' && (
                        <>
                          <Button size="sm" variant="success" loading={busy === r.id} onClick={() => run(r.id, approveDO, 'DO disetujui')}>Approve</Button>
                          <Button size="sm" variant="danger" loading={busy === r.id} onClick={() => run(r.id, (id) => rejectDO(id, 'Ditolak'), 'DO ditolak')}>Tolak</Button>
                        </>
                      )}
                      {r.status === 'APPROVED' && (
                        <Button size="sm" variant="success" loading={busy === r.id} onClick={() => run(r.id, closeDO, 'DO ditutup')}>Close</Button>
                      )}
                      {(r.status === 'DRAFT' || r.status === 'SUBMITTED') && (
                        <Button size="sm" variant="danger" loading={busy === r.id} onClick={() => run(r.id, (id) => voidDO(id, 'Dibatalkan'), 'DO dibatalkan')}>Void</Button>
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
