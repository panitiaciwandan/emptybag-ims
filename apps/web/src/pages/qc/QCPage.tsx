import { useQuery } from '@tanstack/react-query'
import { Page } from '@/components/ui/Page'
import { Card, CardBody, EmptyState } from '@/components/ui/Card'
import { getQCSamples } from '@/services/operations'
import { formatNumber, formatDate } from '@/utils/format'
import { useState } from 'react'
import { DataTable, Pagination } from '@/components/ui/Table'
import { StatusBadge } from '@/components/ui/Badge'
import type { QCSample } from '@/types'

export default function QCPage() {
  const [page, setPage] = useState(0)
  const { data, isLoading } = useQuery({
    queryKey: ['qc', page],
    queryFn: () => getQCSamples({}, page, 50)
  })

  return (
    <Page title="QC Sample" action={<a href="/qc/new" className="btn-primary">Input QC</a>}>
      <Card>
        <CardBody className="p-0">
          {!data || data.data.length === 0 ? (
            <EmptyState message="Belum ada data QC" />
          ) : (
            <>
              <DataTable<QCSample>
                data={data.data}
                loading={isLoading}
                columns={[
                  { key: 'date', header: 'Tanggal', render: (r) => formatDate(r.qc_date) },
                  { key: 'item', header: 'Item', render: (r) => <span>{r.item?.item_code} — {r.item?.item_name}</span> },
                  { key: 'qty', header: 'Sample', render: (r) => formatNumber(r.sample_qty) },
                  { key: 'result', header: 'Hasil', render: (r) => <StatusBadge status={r.result} /> },
                  { key: 'pic', header: 'PIC', render: (r) => r.checker?.full_name ?? '-' }
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
