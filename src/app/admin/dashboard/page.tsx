import { requireRole } from '@/lib/auth'
import { getAdminClient } from '@/lib/supabase-server'
import { StatusBadge } from '@/components/shared/StatusBadge'
import Link from 'next/link'

export default async function AdminDashboardPage() {
  await requireRole('admin')
  const db = getAdminClient()

  const [
    { count: totalRequests },
    { count: openRequests },
    { count: totalMasters },
    { data: recentRequests }
  ] = await Promise.all([
    db.from('requests').select('*', { count: 'exact', head: true }),
    db.from('requests').select('*', { count: 'exact', head: true }).not('status', 'in', '("completed","closed")'),
    db.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'master'),
    db.from('requests')
      .select('id, status, equipment_type, created_at, restaurant:restaurants(name)')
      .order('created_at', { ascending: false })
      .limit(20)
  ])

  const requests = (recentRequests ?? []) as any[]

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <h1 className="text-lg font-semibold">Панель администратора</h1>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Всего заявок', value: totalRequests ?? 0 },
          { label: 'Открытых', value: openRequests ?? 0 },
          { label: 'Мастеров', value: totalMasters ?? 0 },
        ].map(s => (
          <div key={s.label} className="card text-center">
            <p className="text-2xl font-bold text-brand-600">{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div>
        <p className="text-sm font-semibold text-gray-600 mb-2">Последние заявки</p>
        <div className="space-y-2">
          {requests.map((r: any) => (
            <Link key={r.id} href={`/request/${r.id}`}>
              <div className="card flex items-center justify-between hover:border-brand-300 transition-colors">
                <div>
                  <p className="text-sm font-medium capitalize">{r.equipment_type.replace(/_/g, ' ')}</p>
                  <p className="text-xs text-gray-500">{r.restaurant?.name} · {new Date(r.created_at).toLocaleDateString('ru-RU')}</p>
                </div>
                <StatusBadge status={r.status} />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
