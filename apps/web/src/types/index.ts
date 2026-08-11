// Database domain types mirroring the PostgreSQL schema in supabase/migrations.

export type RoleCode = 'SI' | 'LEADER' | 'PETUGAS_TRANSIT'

export interface Role {
  id: string
  code: RoleCode
  name: string
  description: string | null
}

export interface UserProfile {
  id: string
  role_id: string
  full_name: string
  employee_id: string | null
  location_ids: string[]
  phone: string | null
  is_active: boolean
  email?: string
  role?: Role
}

export interface Item {
  id: string
  item_code: string
  item_name: string
  item_type: string
  weight: number | null
  material: string | null
  product_id: string
  supplier_id: string
  specification_id: string
  unit: string
  pallet_id: string | null
  qty_per_pallet: number
  min_stock: number
  reorder_point: number
  target_stock: number
  is_active: boolean
  remarks: string | null
  product?: Product
  supplier?: Supplier
  specification?: Specification
  pallet?: Pallet
}

export interface Product {
  id: string
  product_code: string
  product_name: string
  is_active: boolean
}

export interface Supplier {
  id: string
  supplier_code: string
  supplier_name: string
  contact: string | null
  is_active: boolean
}

export interface Specification {
  id: string
  spec_code: string
  spec_name: string
  description: string | null
  is_active: boolean
}

export interface Pallet {
  id: string
  pallet_code: string
  description: string | null
  capacity: number | null
  is_active: boolean
}

export interface Location {
  id: string
  location_code: string
  location_name: string
  location_type: 'WAREHOUSE' | 'TRANSIT'
  is_active: boolean
}

export interface Shift {
  id: string
  shift_code: string
  shift_name: string
  start_time: string
  end_time: string
  crosses_midnight: boolean
  is_active: boolean
}

export type TransactionStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'VOID'
export type DOStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'CLOSED' | 'VOID'
export type TransferStatus = 'DRAFT' | 'IN_TRANSIT' | 'RECEIVED' | 'COMPLETED' | 'VOID'
export type OpnameStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'ADJUSTED' | 'VOID'
export type TransactionType = 'OPENING' | 'TRANSFER_IN' | 'TRANSFER_OUT' | 'ISSUE' | 'ADJUSTMENT' | 'RETURN'
export type ConsumptionCategory = 'GOOD' | 'DAMAGE' | 'REJECT' | 'BUFFER' | 'LOWER' | 'TRIAL_ROTO' | 'OTHER'
export type MovementType = 'IN' | 'OUT'

export interface DOHeader {
  id: string
  do_number: string
  do_date: string
  shift_id: string
  requested_by: string
  approved_by: string | null
  status: DOStatus
  notes: string | null
  approved_at: string | null
  details?: DODetail[]
  requester?: UserProfile
  shift?: Shift
}

export interface DODetail {
  id: string
  do_id: string
  item_id: string
  requested_qty: number
  issued_qty: number
  item?: Item
}

export interface TransferHeader {
  id: string
  transfer_number: string
  transfer_date: string
  shift_id: string
  from_location_id: string
  to_location_id: string
  created_by: string
  received_by: string | null
  status: TransferStatus
  notes: string | null
  details?: TransferDetail[]
  from_location?: Location
  to_location?: Location
  creator?: UserProfile
  shift?: Shift
}

export interface TransferDetail {
  id: string
  transfer_id: string
  item_id: string
  qty: number
  pallet_code: string | null
  item?: Item
}

export interface Transaction {
  id: string
  transaction_number: string
  transaction_type: TransactionType
  transaction_date: string
  shift_id: string
  location_id: string
  reference_type: string | null
  reference_id: string | null
  created_by: string
  approved_by: string | null
  status: TransactionStatus
  notes: string | null
  created_at: string
  details?: TransactionDetail[]
  location?: Location
  shift?: Shift
  creator?: UserProfile
}

export interface TransactionDetail {
  id: string
  transaction_id: string
  item_id: string
  qty: number
  category: ConsumptionCategory | null
  reason: string | null
  item?: Item
}

export interface Stock {
  id: string
  item_id: string
  location_id: string
  qty: number
  last_ledger_id: string | null
  updated_at: string
  item?: Item
  location?: Location
}

export interface StockLedger {
  id: string
  ledger_date: string
  shift_id: string
  item_id: string
  location_id: string
  transaction_id: string
  transaction_type: TransactionType
  movement_type: MovementType
  category: ConsumptionCategory | null
  qty: number
  balance_after: number
  created_by: string
  created_at: string
  item?: Item
  location?: Location
}

export interface StockOpname {
  id: string
  opname_number: string
  opname_date: string
  location_id: string
  item_id: string
  system_qty: number
  physical_qty: number
  difference: number
  status: OpnameStatus
  adjusted_by: string | null
  notes: string | null
  item?: Item
  location?: Location
}

export interface QCSample {
  id: string
  qc_date: string
  shift_id: string
  item_id: string
  sample_qty: number
  result: 'PASS' | 'REJECT'
  parameter: Record<string, unknown> | null
  checked_by: string
  notes: string | null
  item?: Item
  shift?: Shift
  checker?: UserProfile
}

export interface EnvironmentLog {
  id: string
  log_date: string
  shift_id: string
  location_id: string
  temperature: number | null
  humidity: number | null
  remarks: string | null
  recorded_by: string
  location?: Location
}

export interface AuditLog {
  id: string
  user_id: string | null
  action: string
  table_name: string
  record_id: string | null
  old_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
  ip_address: string | null
  user_agent: string | null
  created_at: string
  user?: UserProfile
}

export interface ShiftReportRow {
  report_date: string
  shift_code: string
  pic: string
  item_code: string
  item_name: string
  good: number
  damage: number
  reject: number
  buffer: number
  lower: number
  trial_roto: number
  other: number
  total_issued: number
  stock_transit_room: number
  stock_transit_side: number
  transfer_from_whs: number
}

export interface ReportRecord {
  id: string
  report_type: string
  report_date: string
  shift_id: string | null
  data_snapshot: unknown
  created_by: string
  file_url: string | null
  created_at: string
}

export interface ShiftInfo {
  shift_id: string
  shift_code: string
  shift_name: string
  shift_date: string
}

export interface DashboardSummarySI {
  total_stock: number
  total_items: number
  today_consumption: number
  today_damage: number
  today_reject: number
  today_lower: number
  today_buffer: number
  today_good: number
  low_stock_count: number
  low_stock: Array<{ item_code: string; item_name: string; qty: number; min_stock: number; location_code: string }>
  by_location: Array<{ location_code: string; location_name: string; total: number }>
  by_category: Array<{ category: string; total: number }>
  trend: Array<{ day: string; total: number }>
}

export interface DashboardSummaryLeader {
  draft_transfers: number
  in_transit_transfers: number
  today_consumption: number
  transit_stock: Array<{ item_code: string; item_name: string; qty: number; location_code: string }>
  recent_activity: Array<{ id: string; transaction_number: string; transaction_type: string; created_at: string; status: string }>
}

export interface DashboardSummaryTransit {
  current_stock: Array<{ item_code: string; item_name: string; qty: number; location_code: string }>
  today_issued: number
  today_qc: number
  today_env: number
  report_status: string | null
}
