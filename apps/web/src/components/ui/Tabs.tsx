import { useEffect, useState } from 'react'

export function Tabs({
  tabs,
  active,
  onChange
}: {
  tabs: Array<{ key: string; label: string }>
  active: string
  onChange: (key: string) => void
}) {
  return (
    <div className="inline-flex rounded-lg bg-slate-200 p-1 gap-1">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            active === t.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

export function useDebounced<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}
