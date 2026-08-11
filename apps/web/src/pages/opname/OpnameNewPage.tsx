import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Page } from '@/components/ui/Page'
import { Button } from '@/components/ui/Button'
import { Field, TextInput, SelectInput, TextArea } from '@/components/ui/Form'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { getItems } from '@/services/stock'
import { getLocations } from '@/services/master'
import { createOpname } from '@/services/operations'
import { useToast } from '@/hooks/useToast'
import { todayISO, errorMessage } from '@/utils/format'

export default function OpnameNewPage() {
  const navigate = useNavigate()
  const { toastEl, error: toastError, success } = useToast()
  const [date, setDate] = useState(todayISO())
  const [locationId, setLocationId] = useState('')
  const [itemId, setItemId] = useState('')
  const [physicalQty, setPhysicalQty] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const { data: items } = useQuery({ queryKey: ['items'], queryFn: getItems })
  const { data: locations } = useQuery({ queryKey: ['locations'], queryFn: getLocations })

  const selectedItem = items?.find((i) => i.id === itemId)

  const handleSubmit = async () => {
    if (!locationId || !itemId || !physicalQty) {
      toastError('Lengkapi lokasi, item, dan qty fisik')
      return
    }
    setSubmitting(true)
    try {
      await createOpname({
        opname_date: date,
        location_id: locationId,
        item_id: itemId,
        physical_qty: Number(physicalQty),
        notes: notes || undefined
      })
      success('Opname dibuat (menunggu approval SI untuk adjustment)')
      setTimeout(() => navigate('/opname'), 500)
    } catch (e) {
      toastError(errorMessage(e))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Page title="Stock Opname" action={<Button variant="secondary" size="sm" onClick={() => navigate('/opname')}>Kembali</Button>}>
      {toastEl}
      <div className="max-w-xl">
        <Card>
          <CardHeader title="Perhitungan Fisik" />
          <CardBody>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Tanggal" required>
                <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </Field>
              <Field label="Lokasi" required>
                <SelectInput value={locationId} onChange={(e) => setLocationId(e.target.value)}>
                  <option value="">Pilih lokasi</option>
                  {locations?.map((l) => (
                    <option key={l.id} value={l.id}>{l.location_name}</option>
                  ))}
                </SelectInput>
              </Field>
            </div>
            <Field label="Item" required>
              <SelectInput value={itemId} onChange={(e) => setItemId(e.target.value)}>
                <option value="">Pilih item</option>
                {items?.map((i) => (
                  <option key={i.id} value={i.id}>{i.item_code} — {i.item_name}</option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Qty Fisik (PCS)" required hint={selectedItem ? `Saldo sistem saat ini akan dihitung otomatis pada submit.` : undefined}>
              <TextInput type="number" min="0" value={physicalQty} onChange={(e) => setPhysicalQty(e.target.value)} />
            </Field>
            <Field label="Catatan">
              <TextArea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Field>
            <Button fullWidth loading={submitting} onClick={handleSubmit}>Submit Opname</Button>
            <p className="mt-2 text-xs text-slate-400">
              Selisih (fisik - sistem) akan menghasilkan adjustment yang memerlukan approval SI sebelum mempengaruhi stock.
            </p>
          </CardBody>
        </Card>
      </div>
    </Page>
  )
}
