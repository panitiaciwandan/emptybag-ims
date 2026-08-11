import type { ReactNode } from 'react'

interface PaginationProps {
  page: number
  pageSize: number
  total: number
  onChange: (page: number) => void
}

export function Pagination({ page, pageSize, total, onChange }: PaginationProps) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  if (pages <= 1) return null
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200">
      <p className="text-xs text-slate-500">
        {total > 0 ? `Menampilkan ${page * pageSize + 1}-${Math.min((page + 1) * pageSize, total)} dari ${total}` : '0 data'}
      </p>
      <div className="flex gap-1">
        <button
          className="px-2 py-1 text-xs rounded border border-slate-300 disabled:opacity-40"
          disabled={page === 0}
          onClick={() => onChange(page - 1)}
        >
          Prev
        </button>
        <span className="px-2 py-1 text-xs text-slate-600">{page + 1}/{pages}</span>
        <button
          className="px-2 py-1 text-xs rounded border border-slate-300 disabled:opacity-40"
          disabled={page >= pages - 1}
          onClick={() => onChange(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  )
}

export interface TableColumn<T> {
  key: string
  header: ReactNode
  render?: (row: T) => ReactNode
  className?: string
}

export function DataTable<T extends { id: string }>({
  columns,
  data,
  loading,
  emptyMessage = 'Tidak ada data'
}: {
  columns: TableColumn<T>[]
  data: T[]
  loading?: boolean
  emptyMessage?: string
}) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50">
          <tr>
            {columns.map((c) => (
              <th key={c.key} className={`px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider ${c.className ?? ''}`}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-slate-100">
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-slate-400">
                Memuat...
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-slate-400">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr key={row.id} className="hover:bg-slate-50">
                {columns.map((c) => (
                  <td key={c.key} className={`px-4 py-2.5 text-slate-700 ${c.className ?? ''}`}>
                    {c.render ? c.render(row) : (row as Record<string, unknown>)[c.key] as ReactNode}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

export type { ReactNode }
