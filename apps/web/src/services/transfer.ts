import { supabase } from '@/lib/supabase'
import type { TransferHeader } from '@/types'

export interface TransferInput {
  transfer_date: string
  shift_id: string
  from_location_id: string
  to_location_id: string
  notes?: string | null
  details: Array<{ item_id: string; qty: number; pallet_code?: string | null }>
}

export async function createTransfer(input: TransferInput): Promise<TransferHeader> {
  const { data, error } = await supabase.rpc('create_transfer', {
    p_transfer_date: input.transfer_date,
    p_shift_id: input.shift_id,
    p_from_location_id: input.from_location_id,
    p_to_location_id: input.to_location_id,
    p_notes: input.notes ?? null,
    p_items: input.details.map((d) => ({ item_id: d.item_id, qty: d.qty, pallet_code: d.pallet_code ?? null }))
  })
  if (error) throw error
  return data as TransferHeader
}

export async function submitTransfer(id: string): Promise<TransferHeader> {
  const { data, error } = await supabase.rpc('submit_transfer', { p_transfer_id: id })
  if (error) throw error
  return data as TransferHeader
}

export async function receiveTransfer(id: string): Promise<TransferHeader> {
  const { data, error } = await supabase.rpc('receive_transfer', { p_transfer_id: id })
  if (error) throw error
  return data as TransferHeader
}

export async function approveTransfer(id: string): Promise<TransferHeader> {
  const { data, error } = await supabase.rpc('approve_transfer', { p_transfer_id: id })
  if (error) throw error
  return data as TransferHeader
}

export async function voidTransfer(id: string, reason: string): Promise<TransferHeader> {
  const { data, error } = await supabase.rpc('void_transfer', {
    p_transfer_id: id,
    p_reason: reason
  })
  if (error) throw error
  return data as TransferHeader
}

export async function getTransfers(
  filters: { status?: string; from?: string; to?: string } = {},
  page = 0,
  pageSize = 50
): Promise<{ data: TransferHeader[]; count: number }> {
  let query = supabase
    .from('transfer_header')
    .select('*, from_location:locations!transfer_header_from_location_id_fkey(*), to_location:locations!transfer_header_to_location_id_fkey(*), creator:users!transfer_header_created_by_fkey(*), shift:shifts(*), details:transfer_detail(*, item:items(*))', { count: 'exact' })

  if (filters.status) query = query.eq('status', filters.status)
  if (filters.from) query = query.gte('transfer_date', filters.from)
  if (filters.to) query = query.lte('transfer_date', filters.to)

  const { data, count, error } = await query
    .order('created_at', { ascending: false })
    .range(page * pageSize, (page + 1) * pageSize - 1)

  if (error) throw error
  return { data: data as TransferHeader[], count: count ?? 0 }
}
