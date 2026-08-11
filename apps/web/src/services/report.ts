import { supabase } from '@/lib/supabase'
import type { ShiftReportRow, ReportRecord } from '@/types'

export async function getShiftConsumptionReport(
  dateFrom: string,
  dateTo: string
): Promise<ShiftReportRow[]> {
  const { data, error } = await supabase.rpc('get_shift_consumption_report', {
    p_date_from: dateFrom,
    p_date_to: dateTo
  })
  if (error) throw error
  return data as ShiftReportRow[]
}

export async function saveReport(payload: {
  report_type: string
  report_date: string
  shift_id: string | null
  data_snapshot: unknown
}): Promise<ReportRecord> {
  const { data, error } = await supabase.from('reports').insert(payload).select().single()
  if (error) throw error
  return data as ReportRecord
}

export async function getReportHistory(page = 0, pageSize = 50): Promise<{ data: ReportRecord[]; count: number }> {
  const { data, count, error } = await supabase
    .from('reports')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(page * pageSize, (page + 1) * pageSize - 1)
  if (error) throw error
  return { data: data as ReportRecord[], count: count ?? 0 }
}
