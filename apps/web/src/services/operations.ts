import { supabase } from '@/lib/supabase'
import type { QCSample, EnvironmentLog, StockOpname } from '@/types'

// --- QC Sample ---
export async function createQC(input: {
  qc_date: string
  shift_id: string
  item_id: string
  sample_qty: number
  result: 'PASS' | 'REJECT'
  parameter?: Record<string, unknown>
  notes?: string
}): Promise<QCSample> {
  const { data, error } = await supabase.from('qc_sample').insert(input).select().single()
  if (error) throw error
  return data as QCSample
}

export async function getQCSamples(
  filters: { from?: string; to?: string; itemId?: string } = {},
  page = 0,
  pageSize = 50
): Promise<{ data: QCSample[]; count: number }> {
  let query = supabase
    .from('qc_sample')
    .select('*, item:items(*), shift:shifts(*), checker:users(*)', { count: 'exact' })
  if (filters.from) query = query.gte('qc_date', filters.from)
  if (filters.to) query = query.lte('qc_date', filters.to)
  if (filters.itemId) query = query.eq('item_id', filters.itemId)
  const { data, count, error } = await query
    .order('qc_date', { ascending: false })
    .range(page * pageSize, (page + 1) * pageSize - 1)
  if (error) throw error
  return { data: data as QCSample[], count: count ?? 0 }
}

// --- Environment Monitoring ---
export async function createEnvironmentLog(input: {
  log_date: string
  shift_id: string
  location_id: string
  temperature?: number | null
  humidity?: number | null
  remarks?: string
}): Promise<EnvironmentLog> {
  const { data, error } = await supabase.from('environment_log').insert(input).select().single()
  if (error) throw error
  return data as EnvironmentLog
}

export async function getEnvironmentLogs(
  filters: { from?: string; to?: string; locationId?: string } = {},
  page = 0,
  pageSize = 50
): Promise<{ data: EnvironmentLog[]; count: number }> {
  let query = supabase
    .from('environment_log')
    .select('*, location:locations(*)', { count: 'exact' })
  if (filters.from) query = query.gte('log_date', filters.from)
  if (filters.to) query = query.lte('log_date', filters.to)
  if (filters.locationId) query = query.eq('location_id', filters.locationId)
  const { data, count, error } = await query
    .order('log_date', { ascending: false })
    .range(page * pageSize, (page + 1) * pageSize - 1)
  if (error) throw error
  return { data: data as EnvironmentLog[], count: count ?? 0 }
}

// --- Stock Opname ---
export async function createOpname(input: {
  opname_date: string
  location_id: string
  item_id: string
  physical_qty: number
  notes?: string
}): Promise<StockOpname> {
  const { data, error } = await supabase.rpc('create_opname', {
    p_opname_date: input.opname_date,
    p_location_id: input.location_id,
    p_item_id: input.item_id,
    p_physical_qty: input.physical_qty,
    p_notes: input.notes ?? null
  })
  if (error) throw error
  return data as StockOpname
}

export async function submitOpname(id: string): Promise<StockOpname> {
  const { data, error } = await supabase.rpc('submit_opname', { p_opname_id: id })
  if (error) throw error
  return data as StockOpname
}

export async function approveOpname(id: string): Promise<StockOpname> {
  const { data, error } = await supabase.rpc('approve_opname', { p_opname_id: id })
  if (error) throw error
  return data as StockOpname
}

export async function getOpnames(
  filters: { from?: string; to?: string; locationId?: string } = {},
  page = 0,
  pageSize = 50
): Promise<{ data: StockOpname[]; count: number }> {
  let query = supabase
    .from('stock_opname')
    .select('*, item:items(*), location:locations(*)', { count: 'exact' })
  if (filters.from) query = query.gte('opname_date', filters.from)
  if (filters.to) query = query.lte('opname_date', filters.to)
  if (filters.locationId) query = query.eq('location_id', filters.locationId)
  const { data, count, error } = await query
    .order('opname_date', { ascending: false })
    .range(page * pageSize, (page + 1) * pageSize - 1)
  if (error) throw error
  return { data: data as StockOpname[], count: count ?? 0 }
}
