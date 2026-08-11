import { useCallback, useState } from 'react'

type ToastType = 'success' | 'error' | 'info'

interface Toast {
  id: number
  type: ToastType
  message: string
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const show = useCallback(
    (type: ToastType, message: string) => {
      const id = Date.now() + Math.random()
      setToasts((prev) => [...prev, { id, type, message }])
      setTimeout(() => remove(id), 4000)
    },
    [remove]
  )

  const success = useCallback((m: string) => show('success', m), [show])
  const error = useCallback((m: string) => show('error', m), [show])
  const info = useCallback((m: string) => show('info', m), [show])

  const toastEl = (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] space-y-2 w-[calc(100%-2rem)] max-w-sm">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white ${
            t.type === 'success' ? 'bg-emerald-600' : t.type === 'error' ? 'bg-red-600' : 'bg-slate-700'
          }`}
        >
          {t.message}
        </div>
      ))}
    </div>
  )

  return { success, error, info, toastEl }
}
