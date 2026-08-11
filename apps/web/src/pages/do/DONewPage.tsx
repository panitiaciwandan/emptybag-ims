import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Page } from '@/components/ui/Page'
import { Button } from '@/components/ui/Button'
import { Field, TextInput, SelectInput } from '@/components/ui/Form'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { getItems, getActiveShift } from '@/services/stock'
import { createDO } from '@/services/do'
import { useToast } from '@/hooks/useToast'
import { todayISO, errorMessage } from '@/utils/format'
import { Trash2, Plus } from 'lucide-react'

interface Line { id: number; item_id: string; qty: string }

export default function DONewPage() {
  const navigate = useNavigate()
  const { toastEl, error: toastError, success } = useToast()
  const [date, setDate] = useState(todayISO())
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<Line[]>([{ id: 1, item_id: '', qty: '' }])
  const [submitting, setSubmitting] = useState(false)

  const { data: items } = useQuery({ queryKey: ['items'], queryFn: getItems })
  const { data: activeShift } = useQuery({ queryKey: ['active-shift'], queryFn: getActiveShift })

  const updateLine = (id: number, patch: Partial<Line>) => setLines((p) => p.map((l) => (l.id === id ? { ...l, ...patch } : l)))
  const removeLine = (id: number) => setLines((p) => p.filter((l) => l.id !== id))

  const handleSubmit = async () => {
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
      await createDO({
        do_date: date,
        shift_id: activeShift.shift_id,
        notes: notes || null,
        items: valid.map((l) => ({ item_id: l.item_id, qty: Number(l.qty) }))
      })
      success('DO berhasil dibuat')
      setTimeout(() => navigate('/do'), 500)
    } catch (e) {
      toastError(errorMessage(e))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Page title="Buat DO" action={<Button variant="secondary" size="sm" onClick={() => navigate('/do')}>Kembali</Button>}>
      {toastEl}
      <div className="max-w-2xl space-y-4">
        <Card>
          <CardHeader title="Informasi DO" />
          <CardBody>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Tanggal" required>
                <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </Field>
              <Field label="Shift">
                <TextInput value={activeShift ? activeShift.shift_name : 'Memuat...'} disabled />
              </Field>
            </div>
            <Field label="Catatan">
              <TextInput value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opsional" />
            </Field>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Item DO" action={
            <Button variant="secondary" size="sm" onClick={() => setLines((p) => [...p, { id: Date.now(), item_id: '', qty: '' }])}><Plus className="h-4 w-4" /> Tambah</Button>
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
                </div>
              ))}
            </div>
            <div className="mt-4">
              <Button fullWidth loading={submitting} onClick={handleSubmit}>Submit DO</Button>
            </div>
          </CardBody>
        </Card>
      </div>
    </Page>
  )
}
