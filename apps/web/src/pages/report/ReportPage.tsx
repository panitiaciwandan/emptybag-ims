import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Page } from '@/components/ui/Page'
import { Card, CardBody, CardHeader, EmptyState, LoadingState } from '@/components/ui/Card'
import { Field, TextInput } from '@/components/ui/Form'
import { Button } from '@/components/ui/Button'
import { getShiftConsumptionReport, saveReport } from '@/services/report'
import { getActiveShift } from '@/services/stock'
import { formatNumber, todayISO, errorMessage } from '@/utils/format'
import { useToast } from '@/hooks/useToast'
import { Copy, Download, Save, ClipboardCheck } from 'lucide-react'
import type { ShiftReportRow } from '@/types'

function buildReportText(rows: ShiftReportRow[]): string {
  const lines: string[] = []
  lines.push('LAPORAN PEMAKAIAN KANTONG BAG TRANSIT')
  lines.push('='.repeat(80))
  for (const r of rows) {
    lines.push(`Tanggal: ${r.report_date}  Shift: ${r.shift_code}  PIC: ${r.pic}`)
    lines.push(`Item: ${r.item_code} - ${r.item_name}`)
    lines.push(`  GOOD: ${formatNumber(r.good)}`)
    lines.push(`  DAMAGE: ${formatNumber(r.damage)}`)
    lines.push(`  REJECT: ${formatNumber(r.reject)}`)
    lines.push(`  BUFFER: ${formatNumber(r.buffer)}`)
    lines.push(`  LOWER: ${formatNumber(r.lower)}`)
    lines.push(`  TRIAL ROTO: ${formatNumber(r.trial_roto)}`)
    lines.push(`  OTHER: ${formatNumber(r.other)}`)
    lines.push(`  TOTAL ISSUED: ${formatNumber(r.total_issued)}`)
    lines.push(`  Stock Transit Room: ${formatNumber(r.stock_transit_room)}`)
    lines.push(`  Stock Transit Side: ${formatNumber(r.stock_transit_side)}`)
    lines.push(`  Transfer dari Central WH: ${formatNumber(r.transfer_from_whs)}`)
    lines.push('-'.repeat(80))
  }
  return lines.join('\n')
}

function toCSV(rows: ShiftReportRow[]): string {
  const header = [
    'Tanggal', 'Shift', 'PIC', 'Item Code', 'Item Name',
    'Good', 'Damage', 'Reject', 'Buffer', 'Lower', 'Trial Roto', 'Other', 'Total Issued',
    'Stock Transit Room', 'Stock Transit Side', 'Transfer dari Central WH'
  ]
  const csv = [
    header.join(','),
    ...rows.map((r) =>
      [
        r.report_date, r.shift_code, r.pic, r.item_code, r.item_name,
        r.good, r.damage, r.reject, r.buffer, r.lower, r.trial_roto, r.other, r.total_issued,
        r.stock_transit_room, r.stock_transit_side, r.transfer_from_whs
      ].join(',')
    )
  ]
  return csv.join('\n')
}

export default function ReportPage() {
  const { toastEl, success: toastSuccess, error: toastError } = useToast()
  const [dateFrom, setDateFrom] = useState(todayISO())
  const [dateTo, setDateTo] = useState(todayISO())

  const { data: activeShift } = useQuery({ queryKey: ['active-shift'], queryFn: getActiveShift })

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['shift-report', dateFrom, dateTo],
    queryFn: () => getShiftConsumptionReport(dateFrom, dateTo),
    enabled: false
  })

  const saveMutation = useMutation({
    mutationFn: () =>
      saveReport({
        report_type: 'SHIFT_REPORT',
        report_date: dateTo,
        shift_id: activeShift?.shift_id ?? null,
        data_snapshot: data ?? []
      }),
    onSuccess: () => toastSuccess('Laporan disimpan ke history'),
    onError: (e) => toastError(errorMessage(e))
  })

  const run = () => refetch()

  const copy = async () => {
    if (!data?.length) return
    await navigator.clipboard.writeText(buildReportText(data))
    toastSuccess('Laporan disalin ke clipboard')
  }

  const downloadCSV = () => {
    if (!data?.length) return
    const blob = new Blob([toCSV(data)], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `laporan-pemakaian-${dateTo}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Page title="LAPORAN PEMAKAIAN KANTONG BAG TRANSIT" action={
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" onClick={copy} disabled={!data?.length}><Copy className="h-4 w-4" /> Copy</Button>
        <Button size="sm" variant="secondary" onClick={downloadCSV} disabled={!data?.length}><Download className="h-4 w-4" /> Export</Button>
        <Button size="sm" onClick={run}><ClipboardCheck className="h-4 w-4" /> Generate</Button>
      </div>
    }>
      {toastEl}
      <div className="mb-4 flex flex-wrap gap-3 items-end">
        <div className="w-40">
          <Field label="Dari Tanggal">
            <TextInput type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </Field>
        </div>
        <div className="w-40">
          <Field label="Sampai Tanggal">
            <TextInput type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </Field>
        </div>
        <div className="pb-1">
          <Button variant="secondary" size="sm" onClick={run}>Tampilkan</Button>
        </div>
      </div>

      {isLoading ? (
        <LoadingState />
      ) : !data || data.length === 0 ? (
        <EmptyState message="Tekan Generate / Tampilkan untuk membuat laporan" />
      ) : (
        <Card>
          <CardHeader title={`Laporan ${dateFrom} — ${dateTo}`} action={
            <Button size="sm" variant="secondary" onClick={() => saveMutation.mutate()} loading={saveMutation.isPending}>
              <Save className="h-4 w-4" /> Simpan ke History
            </Button>
          } />
          <CardBody className="p-0 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-xs md:text-sm">
              <thead className="bg-slate-50">
                <tr>
                  {['Tanggal', 'Shift', 'PIC', 'Item', 'Good', 'Damage', 'Reject', 'Buffer', 'Lower', 'Trial', 'Other', 'Total', 'Stock Room', 'Stock Side', 'Transfer WHS'].map((h) => (
                    <th key={h} className="px-2 py-2 text-left font-semibold text-slate-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-2 py-2 whitespace-nowrap">{r.report_date}</td>
                    <td className="px-2 py-2">{r.shift_code}</td>
                    <td className="px-2 py-2 whitespace-nowrap">{r.pic}</td>
                    <td className="px-2 py-2">{r.item_code}</td>
                    <td className="px-2 py-2 text-right">{formatNumber(r.good)}</td>
                    <td className="px-2 py-2 text-right">{formatNumber(r.damage)}</td>
                    <td className="px-2 py-2 text-right">{formatNumber(r.reject)}</td>
                    <td className="px-2 py-2 text-right">{formatNumber(r.buffer)}</td>
                    <td className="px-2 py-2 text-right">{formatNumber(r.lower)}</td>
                    <td className="px-2 py-2 text-right">{formatNumber(r.trial_roto)}</td>
                    <td className="px-2 py-2 text-right">{formatNumber(r.other)}</td>
                    <td className="px-2 py-2 text-right font-bold">{formatNumber(r.total_issued)}</td>
                    <td className="px-2 py-2 text-right">{formatNumber(r.stock_transit_room)}</td>
                    <td className="px-2 py-2 text-right">{formatNumber(r.stock_transit_side)}</td>
                    <td className="px-2 py-2 text-right">{formatNumber(r.transfer_from_whs)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      )}
    </Page>
  )
}
