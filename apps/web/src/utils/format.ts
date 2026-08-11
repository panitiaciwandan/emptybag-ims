import type { ConsumptionCategory } from '@/types'

export const CATEGORY_LABELS: Record<ConsumptionCategory, string> = {
  GOOD: 'Good',
  DAMAGE: 'Damage',
  REJECT: 'Reject',
  BUFFER: 'Buffer',
  LOWER: 'Lower',
  TRIAL_ROTO: 'Trial Roto',
  OTHER: 'Other'
}

export const ADDITIONAL_CATEGORIES: ConsumptionCategory[] = [
  'DAMAGE',
  'REJECT',
  'BUFFER',
  'LOWER',
  'TRIAL_ROTO',
  'OTHER'
]

export const CATEGORY_COLORS: Record<ConsumptionCategory, string> = {
  GOOD: 'bg-emerald-100 text-emerald-700',
  DAMAGE: 'bg-red-100 text-red-700',
  REJECT: 'bg-orange-100 text-orange-700',
  BUFFER: 'bg-blue-100 text-blue-700',
  LOWER: 'bg-purple-100 text-purple-700',
  TRIAL_ROTO: 'bg-yellow-100 text-yellow-700',
  OTHER: 'bg-slate-100 text-slate-700'
}

export const TRANSACTION_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  CLOSED: 'Closed',
  VOID: 'Void',
  IN_TRANSIT: 'In Transit',
  RECEIVED: 'Received',
  COMPLETED: 'Completed',
  ADJUSTED: 'Adjusted'
}

export function formatNumber(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '0'
  return new Intl.NumberFormat('id-ID').format(n)
}

export function formatDate(d: string | null | undefined): string {
  if (!d) return '-'
  const date = new Date(d)
  if (Number.isNaN(date.getTime())) return d
  return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatDateTime(d: string | null | undefined): string {
  if (!d) return '-'
  const date = new Date(d)
  if (Number.isNaN(date.getTime())) return d
  return date.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

export function errorMessage(e: unknown): string {
  if (typeof e === 'object' && e !== null) {
    const anyE = e as { message?: string; error_description?: string; details?: { message?: string } }
    return anyE.message || anyE.error_description || anyE.details?.message || 'Terjadi kesalahan'
  }
  return String(e)
}
