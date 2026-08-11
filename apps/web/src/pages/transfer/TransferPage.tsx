import { useQuery } from '@tanstack/react-query'
import { Page } from '@/components/ui/Page'
import { Card, CardBody, EmptyState } from '@/components/ui/Card'
import { getTransfers, submitTransfer, receiveTransfer, approveTransfer, voidTransfer } from '@/services/transfer'
import { formatNumber, formatDate, errorMessage } from '@/utils/format'
import { useState } from 'react'
import { DataTable, Pagination } from '@/components/ui/Table'
import { StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/hooks/useToast'
import { useAuth } from '@/hooks/useAuth'
import type { TransferHeader } from '@/types'

export default function TransferPage() {
  const { toastEl, error: toastError, success } = useToast()
  const { roleCode } = useAuth()
  const [page, setPage] = useState(0)
  const [actionBusy, setActionBusy] = useState<string | null>(null)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['transfers', page],
    queryFn: () => getTransfers({}, page, 50),
    refetchInterval: 30_000
  })

  const run = async (id: string, fn: (id: string) => Promise<unknown>, msg: string) => {
    setActionBusy(id)
    try {
      await fn(id)
      success(msg)
      refetch()
    } catch (e) {
      toastError(errorMessage(e))
    } finally {
      setActionBusy(null)
    }
  }

  return (
    <Page title="Transfer WHS → Transit" action={
      <a href="/transfer/new" className="btn-primary">Buat Transfer</a>
    }>
      {toastEl}
      <Card>
        <CardBody className="p-0">
          {!data || data.data.length === 0 ? (
            <EmptyState message="Tidak ada transfer" />
          ) : (
            <>
              <DataTable<TransferHeader>
                data={data.data}
                loading={isLoading}
                columns={[
                  { key: 'number', header: 'No. Transfer', render: (r) => <span className="font-medium">{r.transfer_number}</span> },
                  { key: 'date', header: 'Tanggal', render: (r) => formatDate(r.transfer_date) },
                  { key: 'route', header: 'Rute', render: (r) => (
                    <span>{r.from_location?.location_code} → {r.to_location?.location_code}</span>
                  ) },
                  { key: 'details', header: 'Item', render: (r) => (
                    <div className="text-xs space-y-0.5">
                      {r.details?.map((d) => (
                        <div key={d.id}>{d.item?.item_code}: {formatNumber(d.qty)} PCS</div>
                      ))}
                    </div>
                  ) },
                  { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
                  { key: 'actions', header: 'Aksi', render: (r) => (
                    <div className="flex gap-1">
                      {r.status === 'DRAFT' && roleCode === 'LEADER' && (
                        <Button size="sm" variant="secondary" loading={actionBusy === r.id} onClick={() => run(r.id, submitTransfer, 'Transfer disubmit')}>Submit</Button>
                      )}
                      {r.status === 'IN_TRANSIT' && roleCode === 'PETUGAS_TRANSIT' && (
                        <Button size="sm" variant="success" loading={actionBusy === r.id} onClick={() => run(r.id, receiveTransfer, 'Transfer diterima')}>Terima</Button>
                      )}
                      {r.status === 'RECEIVED' && (roleCode === 'LEADER' || roleCode === 'SI') && (
                        <Button size="sm" variant="success" loading={actionBusy === r.id} onClick={() => run(r.id, approveTransfer, 'Transfer disetujui')}>Approve</Button>
                      )}
                      {r.status === 'DRAFT' && roleCode === 'LEADER' && (
                        <Button size="sm" variant="danger" loading={actionBusy === r.id} onClick={() => run(r.id, (id) => voidTransfer(id, 'Dibatalkan'), 'Transfer dibatalkan')}>Void</Button>
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
