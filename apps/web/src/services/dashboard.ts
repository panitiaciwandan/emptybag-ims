import { supabase } from '@/lib/supabase'
import type { AuditLog } from '@/types'
import type { DashboardSummarySI, DashboardSummaryLeader, DashboardSummaryTransit } from '@/types'

export async function getDashboardSI(dateFrom: string, dateTo: string): Promise<DashboardSummarySI> {
  const { data, error } = await supabase.rpc('dashboard_summary_si', {
    p_date_from: dateFrom,
    p_date_to: dateTo
  })
  if (error) throw error
  return data as DashboardSummarySI
}

export async function getDashboardLeader(): Promise<DashboardSummaryLeader> {
  const { data, error } = await supabase.rpc('dashboard_summary_leader')
  if (error) throw error
  return data as DashboardSummaryLeader
}

export async function getDashboardTransit(): Promise<DashboardSummaryTransit> {
  const { data, error } = await supabase.rpc('dashboard_summary_transit')
  if (error) throw error
  return data as DashboardSummaryTransit
}

export async function getAuditLogs(
  filters: { user?: string; table?: string; action?: string } = {},
  page = 0,
  pageSize = 50
): Promise<{ data: AuditLog[]; count: number }> {
  let query = supabase.from('audit_logs').select('*, user:users(*)', { count: 'exact' })
  if (filters.user) query = query.eq('user_id', filters.user)
  if (filters.table) query = query.eq('table_name', filters.table)
  if (filters.action) query = query.eq('action', filters.action)
  const { data, count, error } = await query
    .order('created_at', { ascending: false })
    .range(page * pageSize, (page + 1) * pageSize - 1)
  if (error) throw error
  return { data: data as AuditLog[], count: count ?? 0 }
}
