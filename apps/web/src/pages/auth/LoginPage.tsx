import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/Button'
import { Field, TextInput, ErrorText } from '@/components/ui/Form'
import { Package } from 'lucide-react'
import { errorMessage } from '@/utils/format'
import { rolePath } from '@/layouts/AppLayout'

export default function LoginPage() {
  const { signIn, roleCode, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await signIn(email.trim(), password)
      // Wait for profile to load; roleCode may still be null here.
      // Navigate will be handled by an effect in the redirect wrapper.
      setTimeout(() => {
        const target = rolePath(roleCode)
        navigate(target, { replace: true })
      }, 300)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-white/10 mb-3">
            <Package className="h-8 w-8 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">EmptyBag-IMS</h1>
          <p className="text-sm text-slate-400 mt-1">Empty Bag Inventory Management System</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl p-6">
          <Field label="Email" required>
            <TextInput
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@company.com"
              autoComplete="email"
              required
            />
          </Field>
          <Field label="Password" required>
            <TextInput
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </Field>
          {error && <ErrorText>{error}</ErrorText>}
          <Button type="submit" fullWidth loading={submitting || authLoading} className="mt-4">
            Masuk
          </Button>
        </form>
      </div>
    </div>
  )
}
