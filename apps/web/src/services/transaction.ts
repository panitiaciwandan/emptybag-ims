import { supabase } from '@/lib/supabase'
import type { Transaction, ConsumptionCategory, ShiftInfo } from '@/types'

export interface IssueItemInput {
  item_id: string
  qty: number
  category: ConsumptionCategory
  reason?: string | null
}

export interface IssueInput {
  location_id: string
  shift_id: string
  transaction_date: string
  do_id?: string | null
  notes?: string | null
  items: IssueItemInput[]
}

export async function createIssue(input: IssueInput): Promise<Transaction> {
  const { data, error } = await supabase.rpc('create_issue', {
    p_location_id: input.location_id,
    p_shift_id: input.shift_id,
    p_transaction_date: input.transaction_date,
    p_do_id: input.do_id ?? null,
    p_notes: input.notes ?? null,
    p_items: input.items.map((i) => ({
      item_id: i.item_id,
      qty: i.qty,
      category: i.category,
      reason: i.reason ?? null
    }))
  })
  if (error) throw error
  return data as Transaction
}

export async function createAdjustment(input: {
  location_id: string
  shift_id: string
  transaction_date: string
  item_id: string
  qty: number
  reason: string
  notes?: string
}): Promise<Transaction> {
  const { data, error } = await supabase.rpc('create_adjustment', {
    p_location_id: input.location_id,
    p_shift_id: input.shift_id,
    p_transaction_date: input.transaction_date,
    p_item_id: input.item_id,
    p_qty: input.qty,
    p_reason: input.reason,
    p_notes: input.notes ?? null
  })
  if (error) throw error
  return data as Transaction
}

export async function getTransactions(
  filters: {
    dateFrom?: string
    dateTo?: string
    locationId?: string
    type?: string
  } = {},
  page = 0,
  pageSize = 50
): Promise<{ data: Transaction[]; count: number }> {
  let query = supabase
    .from('transactions')
    .select('*, location:locations(*), shift:shifts(*), creator:users(*), details:transaction_details(*, item:items(*))', { count: 'exact' })

  if (filters.dateFrom) query = query.gte('transaction_date', filters.dateFrom)
  if (filters.dateTo) query = query.lte('transaction_date', filters.dateTo)
  if (filters.locationId) query = query.eq('location_id', filters.locationId)
  if (filters.type) query = query.eq('transaction_type', filters.type)

  const { data, count, error } = await query
    .order('created_at', { ascending: false })
    .range(page * pageSize, (page + 1) * pageSize - 1)

  if (error) throw error
  return { data: data as Transaction[], count: count ?? 0 }
}

export async function approveTransaction(id: string): Promise<Transaction> {
  const { data, error } = await supabase.rpc('approve_transaction', { p_transaction_id: id })
  if (error) throw error
  return data as Transaction
}

export async function voidTransaction(id: string, reason: string): Promise<Transaction> {
  const { data, error } = await supabase.rpc('void_transaction', {
    p_transaction_id: id,
    p_reason: reason
  })
  if (error) throw error
  return data as Transaction
}

export function getActiveShiftInfo(): ShiftInfo | null {
  return null
}
