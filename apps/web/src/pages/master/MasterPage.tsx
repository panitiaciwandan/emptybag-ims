import { useQuery } from '@tanstack/react-query'
import { Page } from '@/components/ui/Page'
import { Card, CardBody, EmptyState } from '@/components/ui/Card'
import { getUsers } from '@/services/auth'
import { Badge } from '@/components/ui/Badge'
import { DataTable } from '@/components/ui/Table'
import type { UserProfile } from '@/types'
import { Tabs } from '@/components/ui/Tabs'
import { useState } from 'react'

export default function MasterPage() {
  const [tab, setTab] = useState('users')

  return (
    <Page title="Master Management">
      <div className="mb-4">
        <Tabs
          tabs={[
            { key: 'users', label: 'Users' },
            { key: 'roles', label: 'Roles' }
          ]}
          active={tab}
          onChange={setTab}
        />
      </div>
      {tab === 'users' ? <UsersTab /> : <RolesTab />}
    </Page>
  )
}

function UsersTab() {
  const { data, isLoading } = useQuery({ queryKey: ['users'], queryFn: getUsers })
  return (
    <Card>
      <CardBody className="p-0">
        {!data || data.length === 0 ? (
          <EmptyState message="Belum ada user" />
        ) : (
          <DataTable<UserProfile>
            data={data}
            loading={isLoading}
            columns={[
              { key: 'name', header: 'Nama', render: (r) => <span className="font-medium">{r.full_name}</span> },
              { key: 'email', header: 'Email', render: (r) => r.email ?? '-' },
              { key: 'emp', header: 'NIP', render: (r) => r.employee_id ?? '-' },
              { key: 'role', header: 'Role', render: (r) => <Badge color="bg-slate-900 text-white">{r.role?.name ?? '-'}</Badge> },
              { key: 'locations', header: 'Lokasi', render: (r) => r.location_ids?.length ? `${r.location_ids.length} lokasi` : '-' },
              { key: 'active', header: 'Status', render: (r) => (
                <Badge color={r.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}>
                  {r.is_active ? 'Aktif' : 'Nonaktif'}
                </Badge>
              ) }
            ]}
          />
        )}
      </CardBody>
    </Card>
  )
}

function RolesTab() {
  const { data, isLoading } = useQuery({ queryKey: ['roles'], queryFn: () => import('@/services/master').then(m => m.getRoles()) })
  return (
    <Card>
      <CardBody className="p-0">
        {!data || data.length === 0 ? (
          <EmptyState message="Belum ada role" />
        ) : (
          <DataTable
            data={data}
            loading={isLoading}
            columns={[
              { key: 'code', header: 'Kode', render: (r) => <Badge color="bg-slate-900 text-white">{r.code}</Badge> },
              { key: 'name', header: 'Nama', render: (r) => r.name },
              { key: 'desc', header: 'Deskripsi', render: (r) => r.description ?? '-' }
            ]}
          />
        )}
      </CardBody>
    </Card>
  )
}
