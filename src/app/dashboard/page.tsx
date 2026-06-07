import Link from 'next/link'
import { requireAnyRole } from '@/lib/auth'
import { getServerClient } from '@/lib/supabase-server'
import { StatusBadge } from '@/components/shared/StatusBadge'

export default async function DashboardPage() {
  const profile = await requireAnyRole(['client', 'admin'])
  const db = await getServerClient()

  const { data } = await db
    .from('requests')
    .select('id, status, equipment_type, urgency, created_at, restaurant:restaurants(name)')
    .eq('client_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(30)

  const requests = (data ?? []) as Array<{
    id: string
    status: string
    equipment_type: string
    urgency: string
    created_at: string
    restaurant: { name: string } | null
  }>

  return (
    <div className="max-w-xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold">Мои заявки</h1>
        <Link href="/request/new" className="btn-primary">+ Новая</Link>
      </div>

      {requests.length === 0 && (
        <div className="card text-center py-12">
          <p className="text-gray-400 mb-4">Заявок пока нет</p>
          <Link href="/request/new" className="btn-primary">Создать заявку</Link>
        </div>
      )}

      <div className="space-y-3">
        {requests.map(r => (
          <Link key={r.id} href={`/request/${r.id}`}>
            <div className="card hover:border-brand-300 transition-colors cursor-pointer">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-sm capitalize">{r.equipment_type.replace(/_/g, ' ')}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {r.restaurant?.name} · {new Date(r.created_at).toLocaleDateString('ru-RU')}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <StatusBadge status={r.status} />
                  {r.urgency === 'urgent' && <span className="badge bg-red-100 text-red-700">Срочно</span>}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
