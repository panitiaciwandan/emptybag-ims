import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Page } from '@/components/ui/Page'
import { Button } from '@/components/ui/Button'
import { Field, TextInput, SelectInput, TextArea } from '@/components/ui/Form'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { getItems, getActiveShift } from '@/services/stock'
import { createQC } from '@/services/operations'
import { useToast } from '@/hooks/useToast'
import { todayISO, errorMessage } from '@/utils/format'

export default function QCNewPage() {
  const navigate = useNavigate()
  const { toastEl, error: toastError, success } = useToast()
  const [date, setDate] = useState(todayISO())
  const [itemId, setItemId] = useState('')
  const [sampleQty, setSampleQty] = useState('')
  const [result, setResult] = useState<'PASS' | 'REJECT'>('PASS')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const { data: items } = useQuery({ queryKey: ['items'], queryFn: getItems })
  const { data: activeShift } = useQuery({ queryKey: ['active-shift'], queryFn: getActiveShift })

  const handleSubmit = async () => {
    if (!itemId || !sampleQty) {
      toastError('Lengkapi item dan sample qty')
      return
    }
    if (!activeShift) {
      toastError('Shift tidak dapat ditentukan')
      return
    }
    setSubmitting(true)
    try {
      await createQC({
        qc_date: date,
        shift_id: activeShift.shift_id,
        item_id: itemId,
        sample_qty: Number(sampleQty),
        result,
        notes: notes || undefined
      })
      success('QC sample tercatat')
      setTimeout(() => navigate('/qc'), 500)
    } catch (e) {
      toastError(errorMessage(e))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Page title="Input QC Sample" action={<Button variant="secondary" size="sm" onClick={() => navigate('/qc')}>Kembali</Button>}>
      {toastEl}
      <div className="max-w-xl">
        <Card>
          <CardHeader title="Data QC" />
          <CardBody>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Tanggal" required>
                <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </Field>
              <Field label="Shift">
                <TextInput value={activeShift?.shift_name ?? 'Memuat...'} disabled />
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
            <div className="grid grid-cols-2 gap-3">
              <Field label="Sample Qty" required>
                <TextInput type="number" min="1" value={sampleQty} onChange={(e) => setSampleQty(e.target.value)} />
              </Field>
              <Field label="Hasil" required>
                <SelectInput value={result} onChange={(e) => setResult(e.target.value as 'PASS' | 'REJECT')}>
                  <option value="PASS">PASS</option>
                  <option value="REJECT">REJECT</option>
                </SelectInput>
              </Field>
            </div>
            <Field label="Catatan">
              <TextArea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Parameter QC, dll" />
            </Field>
            <Button fullWidth loading={submitting} onClick={handleSubmit}>Simpan QC</Button>
          </CardBody>
        </Card>
      </div>
    </Page>
  )
}
