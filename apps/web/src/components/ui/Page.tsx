import { useEffect, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'

export function Page({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  const location = useLocation()

  useEffect(() => {
    document.title = title ? `${title} - EmptyBag-IMS` : 'EmptyBag-IMS'
  }, [title, location.pathname])

  return (
    <div className="pb-24 md:pb-8">
      <div className="px-4 pt-4 md:px-6 md:pt-6 mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg md:text-xl font-bold text-slate-900">{title}</h1>
        </div>
        {action}
      </div>
      <div className="px-4 md:px-6">{children}</div>
    </div>
  )
}
