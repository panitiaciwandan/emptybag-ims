import { supabase } from '@/lib/supabase'
import type { DOHeader } from '@/types'

export interface DOInput {
  do_date: string
  shift_id: string
  notes?: string | null
  items: Array<{ item_id: string; qty: number }>
}

export async function createDO(input: DOInput): Promise<DOHeader> {
  const { data, error } = await supabase.rpc('create_do', {
    p_do_date: input.do_date,
    p_shift_id: input.shift_id,
    p_notes: input.notes ?? null,
    p_items: input.items.map((i) => ({ item_id: i.item_id, qty: i.qty }))
  })
  if (error) throw error
  return data as DOHeader
}

export async function submitDO(id: string): Promise<DOHeader> {
  const { data, error } = await supabase.rpc('submit_do', { p_do_id: id })
  if (error) throw error
  return data as DOHeader
}

export async function approveDO(id: string): Promise<DOHeader> {
  const { data, error } = await supabase.rpc('approve_do', { p_do_id: id })
  if (error) throw error
  return data as DOHeader
}

export async function rejectDO(id: string, reason: string): Promise<DOHeader> {
  const { data, error } = await supabase.rpc('reject_do', { p_do_id: id, p_reason: reason })
  if (error) throw error
  return data as DOHeader
}

export async function voidDO(id: string, reason: string): Promise<DOHeader> {
  const { data, error } = await supabase.rpc('void_do', { p_do_id: id, p_reason: reason })
  if (error) throw error
  return data as DOHeader
}

export async function closeDO(id: string): Promise<DOHeader> {
  const { data, error } = await supabase.rpc('close_do', { p_do_id: id })
  if (error) throw error
  return data as DOHeader
}

export async function getDOs(
  filters: { status?: string; from?: string; to?: string } = {},
  page = 0,
  pageSize = 50
): Promise<{ data: DOHeader[]; count: number }> {
  let query = supabase
    .from('do_header')
    .select('*, requester:users!do_header_requested_by_fkey(*), shift:shifts(*), details:do_detail(*, item:items(*))', { count: 'exact' })

  if (filters.status) query = query.eq('status', filters.status)
  if (filters.from) query = query.gte('do_date', filters.from)
  if (filters.to) query = query.lte('do_date', filters.to)

  const { data, count, error } = await query
    .order('do_date', { ascending: false })
    .range(page * pageSize, (page + 1) * pageSize - 1)

  if (error) throw error
  return { data: data as DOHeader[], count: count ?? 0 }
}
