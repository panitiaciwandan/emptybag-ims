import { supabase } from '@/lib/supabase'
import type {
  Role,
  Product,
  Supplier,
  Specification,
  Pallet,
  Location,
  Shift
} from '@/types'

export async function getRoles(): Promise<Role[]> {
  const { data, error } = await supabase.from('roles').select('*').order('code')
  if (error) throw error
  return data as Role[]
}

export async function getProducts(): Promise<Product[]> {
  const { data, error } = await supabase.from('products').select('*').eq('is_active', true).order('product_code')
  if (error) throw error
  return data as Product[]
}

export async function getSuppliers(): Promise<Supplier[]> {
  const { data, error } = await supabase.from('suppliers').select('*').eq('is_active', true).order('supplier_code')
  if (error) throw error
  return data as Supplier[]
}

export async function getSpecifications(): Promise<Specification[]> {
  const { data, error } = await supabase.from('specifications').select('*').eq('is_active', true).order('spec_code')
  if (error) throw error
  return data as Specification[]
}

export async function getPallets(): Promise<Pallet[]> {
  const { data, error } = await supabase.from('pallets').select('*').eq('is_active', true).order('pallet_code')
  if (error) throw error
  return data as Pallet[]
}

export async function getLocations(): Promise<Location[]> {
  const { data, error } = await supabase.from('locations').select('*').eq('is_active', true).order('location_code')
  if (error) throw error
  return data as Location[]
}

export async function getShifts(): Promise<Shift[]> {
  const { data, error } = await supabase.from('shifts').select('*').eq('is_active', true).order('start_time')
  if (error) throw error
  return data as Shift[]
}

export async function createItem(input: Record<string, unknown>) {
  const { data, error } = await supabase.from('items').insert(input).select().single()
  if (error) throw error
  return data
}

export async function updateItem(id: string, patch: Record<string, unknown>) {
  const { data, error } = await supabase.from('items').update(patch).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function createRecord(table: string, input: Record<string, unknown>) {
  const { data, error } = await supabase.from(table).insert(input).select().single()
  if (error) throw error
  return data
}

export async function updateRecord(table: string, id: string, patch: Record<string, unknown>) {
  const { data, error } = await supabase.from(table).update(patch).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function activateUser(id: string, isActive: boolean) {
  const { data, error } = await supabase.rpc('set_user_active', { p_user_id: id, p_active: isActive })
  if (error) throw error
  return data
}
