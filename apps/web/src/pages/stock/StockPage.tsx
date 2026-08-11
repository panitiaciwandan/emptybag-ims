import { useQuery } from '@tanstack/react-query'
import { Page } from '@/components/ui/Page'
import { Card, CardBody, EmptyState, LoadingState } from '@/components/ui/Card'
import { getStocks, getLedger } from '@/services/stock'
import { getLocations } from '@/services/master'
import { formatNumber, formatDate } from '@/utils/format'
import { SelectInput, Field } from '@/components/ui/Form'
import { useState } from 'react'
import { DataTable, Pagination } from '@/components/ui/Table'
import type { Stock, StockLedger } from '@/types'
import { Tabs } from '@/components/ui/Tabs'

export default function StockPage() {
  const [locationId, setLocationId] = useState('')
  const [tab, setTab] = useState<'stock' | 'ledger'>('stock')
  const [page, setPage] = useState(0)

  const { data: locations } = useQuery({ queryKey: ['locations'], queryFn: getLocations })

  const { data: stocks, isLoading: loadingStocks } = useQuery({
    queryKey: ['stocks', locationId],
    queryFn: () => getStocks({ locationId: locationId || undefined }),
    refetchInterval: 30_000
  })

  const { data: ledgerData, isLoading: loadingLedger } = useQuery({
    queryKey: ['ledger', locationId, page],
    queryFn: () => getLedger({ locationId: locationId || undefined }, page, 50)
  })

  return (
    <Page title="Stock Monitoring">
      <div className="mb-4 flex flex-wrap gap-3 items-end">
        <div className="w-48">
          <Field label="Lokasi">
            <SelectInput value={locationId} onChange={(e) => { setLocationId(e.target.value); setPage(0) }}>
              <option value="">Semua Lokasi</option>
              {locations?.map((l) => (
                <option key={l.id} value={l.id}>{l.location_name}</option>
              ))}
            </SelectInput>
          </Field>
        </div>
        <Tabs
          tabs={[
            { key: 'stock', label: 'Saldo Stock' },
            { key: 'ledger', label: 'Stock Ledger' }
          ]}
          active={tab}
          onChange={(t) => { setTab(t as 'stock' | 'ledger'); setPage(0) }}
        />
      </div>

      {tab === 'stock' ? (
        <Card>
          <CardBody className="p-0">
            {loadingStocks ? (
              <LoadingState />
            ) : !stocks || stocks.length === 0 ? (
              <EmptyState message="Tidak ada data stock" />
            ) : (
              <DataTable<Stock>
                data={stocks}
                loading={loadingStocks}
                columns={[
                  { key: 'item', header: 'Item', render: (r) => <span className="font-medium">{r.item?.item_code} — {r.item?.item_name}</span> },
                  { key: 'location', header: 'Lokasi', render: (r) => r.location?.location_name },
                  { key: 'qty', header: 'Qty', render: (r) => (
                    <span className={`font-semibold ${r.qty < (r.item?.min_stock ?? 0) ? 'text-red-600' : ''}`}>{formatNumber(r.qty)}</span>
                  ) },
                  { key: 'min', header: 'Min', render: (r) => formatNumber(r.item?.min_stock) },
                  { key: 'updated', header: 'Updated', render: (r) => formatDate(r.updated_at) }
                ]}
              />
            )}
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardBody className="p-0">
            {loadingLedger ? (
              <LoadingState />
            ) : !ledgerData || ledgerData.data.length === 0 ? (
              <EmptyState message="Tidak ada data ledger" />
            ) : (
              <>
                <DataTable<StockLedger>
                  data={ledgerData.data}
                  loading={loadingLedger}
                  columns={[
                    { key: 'date', header: 'Tanggal', render: (r) => formatDate(r.ledger_date) },
                    { key: 'item', header: 'Item', render: (r) => r.item?.item_code ?? '-' },
                    { key: 'loc', header: 'Lokasi', render: (r) => r.location?.location_code ?? '-' },
                    { key: 'type', header: 'Tipe', render: (r) => r.transaction_type },
                    { key: 'mov', header: 'In/Out', render: (r) => (
                      <span className={r.movement_type === 'IN' ? 'text-emerald-600' : 'text-red-600'}>{r.movement_type}</span>
                    ) },
                    { key: 'qty', header: 'Qty', render: (r) => formatNumber(r.qty) },
                    { key: 'balance', header: 'Saldo Akhir', render: (r) => <span className="font-semibold">{formatNumber(r.balance_after)}</span> },
                    { key: 'category', header: 'Kategori', render: (r) => r.category ?? '-' }
                  ]}
                />
                <Pagination page={page} pageSize={50} total={ledgerData.count} onChange={setPage} />
              </>
            )}
          </CardBody>
        </Card>
      )}
    </Page>
  )
}
