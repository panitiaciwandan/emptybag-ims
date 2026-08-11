import { useQuery } from '@tanstack/react-query'
import { Page } from '@/components/ui/Page'
import { Card, CardBody, EmptyState } from '@/components/ui/Card'
import { getTransactions } from '@/services/transaction'
import { getLocations } from '@/services/master'
import { formatNumber, formatDate } from '@/utils/format'
import { SelectInput, Field } from '@/components/ui/Form'
import { useState } from 'react'
import { DataTable, Pagination } from '@/components/ui/Table'
import { StatusBadge, CategoryBadge } from '@/components/ui/Badge'
import type { Transaction } from '@/types'

export default function ConsumptionPage() {
  const [locationId, setLocationId] = useState('')
  const [page, setPage] = useState(0)

  const { data: locations } = useQuery({ queryKey: ['locations'], queryFn: getLocations })
  const { data, isLoading } = useQuery({
    queryKey: ['transactions', locationId, page],
    queryFn: () => getTransactions({ locationId: locationId || undefined, type: 'ISSUE' }, page, 50)
  })

  return (
    <Page title="Consumption" action={
      <a href="/consumption/new" className="btn-primary">Input Konsumsi</a>
    }>
      <div className="mb-4 w-48">
        <Field label="Lokasi">
          <SelectInput value={locationId} onChange={(e) => { setLocationId(e.target.value); setPage(0) }}>
            <option value="">Semua Lokasi</option>
            {locations?.map((l) => (
              <option key={l.id} value={l.id}>{l.location_name}</option>
            ))}
          </SelectInput>
        </Field>
      </div>
      <Card>
        <CardBody className="p-0">
          {!data || data.data.length === 0 ? (
            <EmptyState message="Tidak ada transaksi konsumsi" />
          ) : (
            <>
              <DataTable<Transaction>
                data={data.data}
                loading={isLoading}
                columns={[
                  { key: 'number', header: 'No. Transaksi', render: (r) => <span className="font-medium">{r.transaction_number}</span> },
                  { key: 'date', header: 'Tanggal', render: (r) => formatDate(r.transaction_date) },
                  { key: 'location', header: 'Lokasi', render: (r) => r.location?.location_name ?? '-' },
                  { key: 'details', header: 'Item', render: (r) => (
                    <div className="space-y-0.5">
                      {r.details?.map((d) => (
                        <div key={d.id} className="flex items-center gap-2 text-xs">
                          <span>{d.item?.item_code}</span>
                          <span className="font-semibold">{formatNumber(d.qty)}</span>
                          {d.category && <CategoryBadge category={d.category} />}
                        </div>
                      ))}
                    </div>
                  ) },
                  { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
                  { key: 'pic', header: 'PIC', render: (r) => r.creator?.full_name ?? '-' }
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
