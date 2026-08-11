import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Page } from '@/components/ui/Page'
import { Button } from '@/components/ui/Button'
import { Field, TextInput, SelectInput, TextArea } from '@/components/ui/Form'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { getActiveShift } from '@/services/stock'
import { getLocations } from '@/services/master'
import { createEnvironmentLog } from '@/services/operations'
import { useToast } from '@/hooks/useToast'
import { todayISO, errorMessage } from '@/utils/format'

export default function EnvironmentNewPage() {
  const navigate = useNavigate()
  const { toastEl, error: toastError, success } = useToast()
  const [date, setDate] = useState(todayISO())
  const [locationId, setLocationId] = useState('')
  const [temperature, setTemperature] = useState('')
  const [humidity, setHumidity] = useState('')
  const [remarks, setRemarks] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const { data: locations } = useQuery({ queryKey: ['locations'], queryFn: getLocations })
  const { data: activeShift } = useQuery({ queryKey: ['active-shift'], queryFn: getActiveShift })

  const handleSubmit = async () => {
    if (!locationId) {
      toastError('Pilih lokasi')
      return
    }
    if (!activeShift) {
      toastError('Shift tidak dapat ditentukan')
      return
    }
    setSubmitting(true)
    try {
      await createEnvironmentLog({
        log_date: date,
        shift_id: activeShift.shift_id,
        location_id: locationId,
        temperature: temperature ? Number(temperature) : null,
        humidity: humidity ? Number(humidity) : null,
        remarks: remarks || undefined
      })
      success('Log lingkungan tercatat')
      setTimeout(() => navigate('/environment'), 500)
    } catch (e) {
      toastError(errorMessage(e))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Page title="Input Monitoring Lingkungan" action={<Button variant="secondary" size="sm" onClick={() => navigate('/environment')}>Kembali</Button>}>
      {toastEl}
      <div className="max-w-xl">
        <Card>
          <CardHeader title="Data Lingkungan" />
          <CardBody>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Tanggal" required>
                <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </Field>
              <Field label="Shift">
                <TextInput value={activeShift?.shift_name ?? 'Memuat...'} disabled />
              </Field>
            </div>
            <Field label="Lokasi" required>
              <SelectInput value={locationId} onChange={(e) => setLocationId(e.target.value)}>
                <option value="">Pilih lokasi</option>
                {locations?.map((l) => (
                  <option key={l.id} value={l.id}>{l.location_name}</option>
                ))}
              </SelectInput>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Suhu (°C)">
                <TextInput type="number" step="0.1" value={temperature} onChange={(e) => setTemperature(e.target.value)} placeholder="Contoh: 30.5" />
              </Field>
              <Field label="Kelembapan (%)">
                <TextInput type="number" step="0.1" value={humidity} onChange={(e) => setHumidity(e.target.value)} placeholder="Contoh: 60" />
              </Field>
            </div>
            <Field label="Catatan">
              <TextArea rows={3} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
            </Field>
            <Button fullWidth loading={submitting} onClick={handleSubmit}>Simpan</Button>
          </CardBody>
        </Card>
      </div>
    </Page>
  )
}
