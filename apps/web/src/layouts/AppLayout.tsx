import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import type { ReactNode } from 'react'
import {
  LayoutDashboard,
  Package,
  ArrowLeftRight,
  ClipboardList,
  FileBarChart,
  FlaskConical,
  Thermometer,
  ListChecks,
  Settings,
  ShieldAlert,
  LogOut,
  PackageCheck,
  Menu,
  X
} from 'lucide-react'
import { useState } from 'react'

export function rolePath(roleCode: string | null): string {
  switch (roleCode) {
    case 'SI':
      return '/dashboard'
    case 'LEADER':
      return '/leader'
    case 'PETUGAS_TRANSIT':
      return '/operator'
    default:
      return '/login'
  }
}

interface NavItem {
  to: string
  label: string
  icon: ReactNode
  roles: string[]
}

const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard SI', icon: <LayoutDashboard className="h-5 w-5" />, roles: ['SI'] },
  { to: '/leader', label: 'Dashboard Leader', icon: <LayoutDashboard className="h-5 w-5" />, roles: ['LEADER'] },
  { to: '/operator', label: 'Dashboard Transit', icon: <LayoutDashboard className="h-5 w-5" />, roles: ['PETUGAS_TRANSIT'] },
  { to: '/stock', label: 'Stock', icon: <Package className="h-5 w-5" />, roles: ['SI', 'LEADER', 'PETUGAS_TRANSIT'] },
  { to: '/consumption', label: 'Konsumsi', icon: <PackageCheck className="h-5 w-5" />, roles: ['SI', 'LEADER', 'PETUGAS_TRANSIT'] },
  { to: '/transfer', label: 'Transfer', icon: <ArrowLeftRight className="h-5 w-5" />, roles: ['SI', 'LEADER', 'PETUGAS_TRANSIT'] },
  { to: '/do', label: 'DO', icon: <ClipboardList className="h-5 w-5" />, roles: ['SI', 'LEADER', 'PETUGAS_TRANSIT'] },
  { to: '/report', label: 'Laporan', icon: <FileBarChart className="h-5 w-5" />, roles: ['SI', 'LEADER', 'PETUGAS_TRANSIT'] },
  { to: '/qc', label: 'QC', icon: <FlaskConical className="h-5 w-5" />, roles: ['SI', 'LEADER', 'PETUGAS_TRANSIT'] },
  { to: '/environment', label: 'Lingkungan', icon: <Thermometer className="h-5 w-5" />, roles: ['SI', 'LEADER', 'PETUGAS_TRANSIT'] },
  { to: '/opname', label: 'Opname', icon: <ListChecks className="h-5 w-5" />, roles: ['SI', 'LEADER', 'PETUGAS_TRANSIT'] },
  { to: '/master', label: 'Master', icon: <Settings className="h-5 w-5" />, roles: ['SI'] },
  { to: '/audit', label: 'Audit', icon: <ShieldAlert className="h-5 w-5" />, roles: ['SI'] }
]

export function AppLayout({ children }: { children: ReactNode }) {
  const { profile, roleCode, signOut } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  const visibleItems = NAV_ITEMS.filter((i) => i.roles.includes(roleCode ?? ''))

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-60 bg-slate-900 text-slate-100 flex-col">
        <div className="px-4 py-4 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <Package className="h-6 w-6 text-emerald-400" />
            <div>
              <p className="font-bold text-sm">EmptyBag-IMS</p>
              <p className="text-xs text-slate-400">Inventory System</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto py-2">
          {visibleItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                  isActive ? 'bg-slate-800 text-white border-l-2 border-emerald-400' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-700">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{profile?.full_name ?? 'User'}</p>
              <p className="text-xs text-slate-400 truncate">{profile?.role?.name ?? roleCode}</p>
            </div>
            <button onClick={handleLogout} className="p-2 rounded-lg hover:bg-slate-800 text-slate-300" title="Logout">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile header */}
      <header className="md:hidden fixed top-0 inset-x-0 z-40 bg-slate-900 text-white flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-emerald-400" />
          <span className="font-bold text-sm">EmptyBag-IMS</span>
        </div>
        <button onClick={() => setMobileOpen(true)} className="p-2">
          <Menu className="h-5 w-5" />
        </button>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-72 bg-slate-900 text-slate-100 flex flex-col">
            <div className="flex items-center justify-between px-4 py-4 border-b border-slate-700">
              <p className="font-bold text-sm">Menu</p>
              <button onClick={() => setMobileOpen(false)} className="p-1 rounded hover:bg-slate-800">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto py-2">
              {visibleItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 text-sm ${
                      isActive ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-800'
                    }`
                  }
                >
                  {item.icon}
                  {item.label}
                </NavLink>
              ))}
            </nav>
            <div className="p-4 border-t border-slate-700 flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{profile?.full_name ?? 'User'}</p>
                <p className="text-xs text-slate-400 truncate">{profile?.role?.name ?? roleCode}</p>
              </div>
              <button onClick={handleLogout} className="p-2 rounded-lg hover:bg-slate-800 text-slate-300">
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="md:ml-60 pt-14 md:pt-0 min-h-screen">
        {children}
      </main>
    </div>
  )
}
