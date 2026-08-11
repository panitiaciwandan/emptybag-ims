import { Link } from 'react-router-dom'

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center">
        <h1 className="text-2xl font-bold text-slate-800">403</h1>
        <p className="mt-2 text-sm text-slate-600">Anda tidak memiliki akses ke halaman ini.</p>
        <Link to="/login" className="mt-4 inline-block text-sm font-semibold text-slate-700 underline">
          Kembali ke Login
        </Link>
      </div>
    </div>
  )
}
