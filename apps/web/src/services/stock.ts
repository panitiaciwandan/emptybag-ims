import { supabase } from '@/lib/supabase'
import type { Stock, StockLedger, Item, ShiftInfo } from '@/types'

export async function getStocks(filters?: {
  locationId?: string
  itemId?: string
}): Promise<Stock[]> {
  let query = supabase
    .from('stock')
    .select('*, item:items(*), location:locations(*)')

  if (filters?.locationId) query = query.eq('location_id', filters.locationId)
  if (filters?.itemId) query = query.eq('item_id', filters.itemId)

  const { data, error } = await query.order('location_code', { referencedTable: 'locations' })
  if (error) throw error
  return data as Stock[]
}

export async function getLedger(
  filters: {
    itemId?: string
    locationId?: string
    dateFrom?: string
    dateTo?: string
  } = {},
  page = 0,
  pageSize = 50
): Promise<{ data: StockLedger[]; count: number }> {
  let query = supabase
    .from('stock_ledger')
    .select('*, item:items(*), location:locations(*)', { count: 'exact' })

  if (filters.itemId) query = query.eq('item_id', filters.itemId)
  if (filters.locationId) query = query.eq('location_id', filters.locationId)
  if (filters.dateFrom) query = query.gte('ledger_date', filters.dateFrom)
  if (filters.dateTo) query = query.lte('ledger_date', filters.dateTo)

  const { data, count, error } = await query
    .order('created_at', { ascending: false })
    .range(page * pageSize, (page + 1) * pageSize - 1)

  if (error) throw error
  return { data: data as StockLedger[], count: count ?? 0 }
}

export async function getItems(): Promise<Item[]> {
  const { data, error } = await supabase
    .from('items')
    .select('*, product:products(*), supplier:suppliers(*), specification:specifications(*), pallet:pallets(*)')
    .eq('is_active', true)
    .order('item_code')
  if (error) throw error
  return data as Item[]
}

export async function getActiveShift(): Promise<ShiftInfo> {
  const { data, error } = await supabase.rpc('get_active_shift', { ts: new Date().toISOString() })
  if (error) throw error
  return data as ShiftInfo
}

export async function getLowStock() {
  const { data, error } = await supabase.rpc('get_low_stock')
  if (error) throw error
  return data
}
