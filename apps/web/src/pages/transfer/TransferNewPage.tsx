import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Page } from '@/components/ui/Page'
import { Button } from '@/components/ui/Button'
import { Field, TextInput, SelectInput } from '@/components/ui/Form'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { getItems, getActiveShift } from '@/services/stock'
import { getLocations } from '@/services/master'
import { createTransfer } from '@/services/transfer'
import { useToast } from '@/hooks/useToast'
import { todayISO, errorMessage } from '@/utils/format'
import { Trash2, Plus } from 'lucide-react'

interface Line { id: number; item_id: string; qty: string; pallet_code: string }

export default function TransferNewPage() {
  const navigate = useNavigate()
  const { toastEl, error: toastError, success } = useToast()
  const [date, setDate] = useState(todayISO())
  const [fromLocation, setFromLocation] = useState('')
  const [toLocation, setToLocation] = useState('')
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<Line[]>([{ id: 1, item_id: '', qty: '', pallet_code: '' }])
  const [submitting, setSubmitting] = useState(false)

  const { data: items } = useQuery({ queryKey: ['items'], queryFn: getItems })
  const { data: locations } = useQuery({ queryKey: ['locations'], queryFn: getLocations })
  const { data: activeShift } = useQuery({ queryKey: ['active-shift'], queryFn: getActiveShift })

  const updateLine = (id: number, patch: Partial<Line>) => setLines((p) => p.map((l) => (l.id === id ? { ...l, ...patch } : l)))
  const removeLine = (id: number) => setLines((p) => p.filter((l) => l.id !== id))

  const handleSubmit = async () => {
    if (!fromLocation || !toLocation) {
      toastError('Pilih lokasi asal dan tujuan')
      return
    }
    if (fromLocation === toLocation) {
      toastError('Lokasi asal dan tujuan tidak boleh sama')
      return
    }
    if (!activeShift) {
      toastError('Shift tidak dapat ditentukan')
      return
    }
    const valid = lines.filter((l) => l.item_id && Number(l.qty) > 0)
    if (valid.length === 0) {
      toastError('Minimal satu item dengan qty > 0')
      return
    }

    setSubmitting(true)
    try {
      await createTransfer({
        transfer_date: date,
        shift_id: activeShift.shift_id,
        from_location_id: fromLocation,
        to_location_id: toLocation,
        notes: notes || null,
        details: valid.map((l) => ({ item_id: l.item_id, qty: Number(l.qty), pallet_code: l.pallet_code || null }))
      })
      success('Transfer berhasil dibuat')
      setTimeout(() => navigate('/transfer'), 500)
    } catch (e) {
      toastError(errorMessage(e))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Page title="Buat Transfer" action={<Button variant="secondary" size="sm" onClick={() => navigate('/transfer')}>Kembali</Button>}>
      {toastEl}
      <div className="max-w-3xl space-y-4">
        <Card>
          <CardHeader title="Informasi Transfer" />
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Tanggal" required>
                <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </Field>
              <Field label="Shift Aktif">
                <TextInput value={activeShift ? `${activeShift.shift_name}` : 'Memuat...'} disabled />
              </Field>
              <Field label="Dari Lokasi (WHS)" required>
                <SelectInput value={fromLocation} onChange={(e) => setFromLocation(e.target.value)}>
                  <option value="">Pilih asal</option>
                  {locations?.filter((l) => l.location_type === 'WAREHOUSE').map((l) => (
                    <option key={l.id} value={l.id}>{l.location_name}</option>
                  ))}
                </SelectInput>
              </Field>
              <Field label="Ke Lokasi (Transit)" required>
                <SelectInput value={toLocation} onChange={(e) => setToLocation(e.target.value)}>
                  <option value="">Pilih tujuan</option>
                  {locations?.filter((l) => l.location_type === 'TRANSIT').map((l) => (
                    <option key={l.id} value={l.id}>{l.location_name}</option>
                  ))}
                </SelectInput>
              </Field>
            </div>
            <Field label="Catatan">
              <TextInput value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opsional" />
            </Field>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Item Transfer" action={
            <Button variant="secondary" size="sm" onClick={() => setLines((p) => [...p, { id: Date.now(), item_id: '', qty: '', pallet_code: '' }])}><Plus className="h-4 w-4" /> Tambah</Button>
          } />
          <CardBody>
            <div className="space-y-3">
              {lines.map((line, idx) => (
                <div key={line.id} className="border border-slate-200 rounded-lg p-3 grid grid-cols-1 md:grid-cols-4 gap-2">
                  <span className="text-xs font-semibold text-slate-500 md:col-span-4">Line {idx + 1}
                    {lines.length > 1 && <button onClick={() => removeLine(line.id)} className="ml-2 text-red-500"><Trash2 className="h-4 w-4" /></button>}
                  </span>
                  <div className="md:col-span-2">
                    <Field label="Item">
                      <SelectInput value={line.item_id} onChange={(e) => updateLine(line.id, { item_id: e.target.value })}>
                        <option value="">Pilih item</option>
                        {items?.map((i) => (
                          <option key={i.id} value={i.id}>{i.item_code} — {i.item_name}</option>
                        ))}
                      </SelectInput>
                    </Field>
                  </div>
                  <Field label="Qty (PCS)">
                    <TextInput type="number" min="1" value={line.qty} onChange={(e) => updateLine(line.id, { qty: e.target.value })} />
                  </Field>
                  <Field label="No. Pallet">
                    <TextInput value={line.pallet_code} onChange={(e) => updateLine(line.id, { pallet_code: e.target.value })} placeholder="Opsional" />
                  </Field>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <Button fullWidth loading={submitting} onClick={handleSubmit}>Submit Transfer</Button>
            </div>
          </CardBody>
        </Card>
      </div>
    </Page>
  )
}
