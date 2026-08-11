import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Page } from '@/components/ui/Page'
import { Button } from '@/components/ui/Button'
import { Field, TextInput, SelectInput, TextArea } from '@/components/ui/Form'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { getItems, getActiveShift } from '@/services/stock'
import { getLocations } from '@/services/master'
import { getDOs } from '@/services/do'
import { createIssue } from '@/services/transaction'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'
import { CATEGORY_LABELS, ADDITIONAL_CATEGORIES, errorMessage, todayISO } from '@/utils/format'
import { Trash2, Plus } from 'lucide-react'
import type { ConsumptionCategory } from '@/types'

interface Line {
  id: number
  item_id: string
  qty: string
  category: ConsumptionCategory
  reason: string
}

export default function ConsumptionNewPage() {
  const navigate = useNavigate()
  const { toastEl, error: toastError, success } = useToast()
  const { roleCode } = useAuth()

  const [date, setDate] = useState(todayISO())
  const [locationId, setLocationId] = useState('')
  const [doId, setDoId] = useState('')
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<Line[]>([
    { id: 1, item_id: '', qty: '', category: 'GOOD', reason: '' }
  ])
  const [submitting, setSubmitting] = useState(false)

  const { data: items } = useQuery({ queryKey: ['items'], queryFn: getItems })
  const { data: locations } = useQuery({ queryKey: ['locations'], queryFn: getLocations })
  const { data: activeShift } = useQuery({ queryKey: ['active-shift'], queryFn: getActiveShift })
  const { data: doList } = useQuery({
    queryKey: ['dos-approved'],
    queryFn: () => getDOs({ status: 'APPROVED' }, 0, 100)
  })

  const addLine = () => {
    setLines((prev) => [...prev, { id: Date.now(), item_id: '', qty: '', category: 'DAMAGE', reason: '' }])
  }

  const updateLine = (id: number, patch: Partial<Line>) => {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)))
  }

  const removeLine = (id: number) => {
    setLines((prev) => prev.filter((l) => l.id !== id))
  }

  const handleSubmit = async () => {
    if (!locationId) {
      toastError('Pilih lokasi terlebih dahulu')
      return
    }
    if (!activeShift) {
      toastError('Shift tidak dapat ditentukan')
      return
    }
    const validLines = lines.filter((l) => l.item_id && Number(l.qty) > 0)
    if (validLines.length === 0) {
      toastError('Minimal satu item dengan qty > 0')
      return
    }
    // Additional categories require reason
    for (const l of validLines) {
      if (l.category !== 'GOOD' && !l.reason.trim()) {
        toastError(`Alasan wajib untuk kategori ${CATEGORY_LABELS[l.category]}`)
        return
      }
    }

    setSubmitting(true)
    try {
      await createIssue({
        location_id: locationId,
        shift_id: activeShift.shift_id,
        transaction_date: date,
        do_id: doId || null,
        notes: notes || null,
        items: validLines.map((l) => ({
          item_id: l.item_id,
          qty: Number(l.qty),
          category: l.category,
          reason: l.reason || null
        }))
      })
      success('Konsumsi berhasil dicatat')
      setTimeout(() => navigate('/consumption'), 500)
    } catch (e) {
      toastError(errorMessage(e))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Page title="Input Konsumsi / Issue" action={
      <Button variant="secondary" size="sm" onClick={() => navigate('/consumption')}>Kembali</Button>
    }>
      {toastEl}
      <div className="max-w-3xl space-y-4">
        <Card>
          <CardHeader title="Informasi Transaksi" />
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Field label="Tanggal" required>
                <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </Field>
              <Field label="Shift Aktif">
                <TextInput value={activeShift ? `${activeShift.shift_name} (${activeShift.shift_date})` : 'Memuat...'} disabled />
              </Field>
              <Field label="Lokasi" required>
                <SelectInput value={locationId} onChange={(e) => setLocationId(e.target.value)}>
                  <option value="">Pilih lokasi</option>
                  {locations?.filter((l) => l.location_type === 'TRANSIT').map((l) => (
                    <option key={l.id} value={l.id}>{l.location_name}</option>
                  ))}
                </SelectInput>
              </Field>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Referensi DO (untuk GOOD)" hint={roleCode === 'PETUGAS_TRANSIT' ? 'Pilih DO yang telah disetujui' : undefined}>
                <SelectInput value={doId} onChange={(e) => setDoId(e.target.value)}>
                  <option value="">Tanpa DO (issue langsung)</option>
                  {doList?.data.map((d) => (
                    <option key={d.id} value={d.id}>{d.do_number}</option>
                  ))}
                </SelectInput>
              </Field>
              <Field label="Catatan">
                <TextInput value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opsional" />
              </Field>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Item & Kategori" action={
            <Button variant="secondary" size="sm" onClick={addLine}><Plus className="h-4 w-4" /> Tambah</Button>
          } />
          <CardBody>
            <div className="space-y-3">
              {lines.map((line, idx) => (
                <div key={line.id} className="border border-slate-200 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">Line {idx + 1}</span>
                    {lines.length > 1 && (
                      <button onClick={() => removeLine(line.id)} className="text-red-500 p-1"><Trash2 className="h-4 w-4" /></button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <div className="col-span-2">
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
                      <TextInput type="number" min="1" value={line.qty} onChange={(e) => updateLine(line.id, { qty: e.target.value })} placeholder="0" />
                    </Field>
                    <Field label="Kategori">
                      <SelectInput value={line.category} onChange={(e) => updateLine(line.id, { category: e.target.value as ConsumptionCategory })}>
                        <option value="GOOD">GOOD</option>
                        {ADDITIONAL_CATEGORIES.map((c) => (
                          <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                        ))}
                      </SelectInput>
                    </Field>
                  </div>
                  {line.category !== 'GOOD' && (
                    <Field label={`Alasan (wajib) — ${CATEGORY_LABELS[line.category]}`} required>
                      <TextArea rows={2} value={line.reason} onChange={(e) => updateLine(line.id, { reason: e.target.value })} placeholder="Jelaskan alasan tambahan issue" />
                    </Field>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-4">
              <Button fullWidth loading={submitting} onClick={handleSubmit}>Submit Konsumsi</Button>
            </div>
            <p className="mt-2 text-xs text-slate-400">
              Total Issued = GOOD + DAMAGE + REJECT + BUFFER + LOWER + TRIAL ROTO + OTHER.
              LOWER dicatat sebagai jumlah PCS yang benar-benar di-issued, bukan konversi tonase.
            </p>
          </CardBody>
        </Card>
      </div>
    </Page>
  )
}
