import type { ReactNode } from 'react'

export function Badge({ children, color = 'bg-slate-100 text-slate-700' }: { children: ReactNode; color?: string }) {
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>{children}</span>
}

export function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    DRAFT: 'bg-slate-100 text-slate-600',
    SUBMITTED: 'bg-blue-100 text-blue-700',
    APPROVED: 'bg-emerald-100 text-emerald-700',
    REJECTED: 'bg-red-100 text-red-700',
    CLOSED: 'bg-slate-700 text-white',
    VOID: 'bg-slate-200 text-slate-500',
    IN_TRANSIT: 'bg-amber-100 text-amber-700',
    RECEIVED: 'bg-blue-100 text-blue-700',
    COMPLETED: 'bg-emerald-100 text-emerald-700',
    ADJUSTED: 'bg-purple-100 text-purple-700',
    PASS: 'bg-emerald-100 text-emerald-700',
    PENDING: 'bg-amber-100 text-amber-700'
  }
  return <Badge color={colors[status] ?? 'bg-slate-100 text-slate-600'}>{status}</Badge>
}

export function CategoryBadge({ category }: { category: string }) {
  const colors: Record<string, string> = {
    GOOD: 'bg-emerald-100 text-emerald-700',
    DAMAGE: 'bg-red-100 text-red-700',
    REJECT: 'bg-orange-100 text-orange-700',
    BUFFER: 'bg-blue-100 text-blue-700',
    LOWER: 'bg-purple-100 text-purple-700',
    TRIAL_ROTO: 'bg-yellow-100 text-yellow-700',
    OTHER: 'bg-slate-100 text-slate-700'
  }
  return <Badge color={colors[category] ?? 'bg-slate-100 text-slate-600'}>{category}</Badge>
}
