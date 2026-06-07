import Link from 'next/link'
import { requireRole } from '@/lib/auth'
import { getServerClient } from '@/lib/supabase-server'
import { StatusBadge } from '@/components/shared/StatusBadge'

export default async function MasterDashboardPage() {
  const profile = await requireRole('master')
  const db = await getServerClient()

  const { data: available } = await db
    .from('requests')
    .select('id, status, equipment_type, urgency, created_at, restaurant:restaurants(name, address)')
    .in('status', ['waiting_master_offers', 'waiting_client_selection'])
    .order('created_at', { ascending: false })
    .limit(20)

  const { data: mine } = await db
    .from('requests')
    .select('id, status, equipment_type, created_at, restaurant:restaurants(name)')
    .eq('assigned_master_id', profile.id)
    .not('status', 'in', '("completed","closed")')
    .order('created_at', { ascending: false })

  const { data: responded } = await db
    .from('master_responses')
    .select('request_id')
    .eq('master_id', profile.id)

  const respondedSet = new Set((responded ?? []).map((r: any) => r.request_id))

  const availableList = (available ?? []) as any[]
  const mineList = (mine ?? []) as any[]

  return (
    <div className="max-w-xl mx-auto px-4 py-6 space-y-6">
      <h1 className="text-lg font-semibold">Привет, {profile.name ?? profile.email}</h1>

      {mineList.length > 0 && (
        <section>
          <p className="text-sm font-semibold text-gray-600 mb-2">Мои активные заявки</p>
          <div className="space-y-2">
            {mineList.map((r: any) => (
              <Link key={r.id} href={`/master/request/${r.id}`}>
                <div className="card flex items-center justify-between hover:border-brand-300 transition-colors">
                  <div>
                    <p className="text-sm font-medium capitalize">{r.equipment_type.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-gray-500">{r.restaurant?.name}</p>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <p className="text-sm font-semibold text-gray-600 mb-2">Доступные заявки</p>
        {availableList.length === 0 && (
          <div className="card text-center py-8 text-gray-400 text-sm">Новых заявок нет</div>
        )}
        <div className="space-y-2">
          {availableList.map((r: any) => (
            <Link key={r.id} href={`/master/request/${r.id}`}>
              <div className="card hover:border-brand-300 transition-colors">
                <div className="flex justify-between items-start mb-1">
                  <p className="text-sm font-medium capitalize">{r.equipment_type.replace(/_/g, ' ')}</p>
                  <div className="flex gap-1">
                    {r.urgency === 'urgent' && <span className="badge bg-red-100 text-red-700">Срочно</span>}
                    {respondedSet.has(r.id) && <span className="badge bg-gray-100 text-gray-500">Откликнулся</span>}
                  </div>
                </div>
                <p className="text-xs text-gray-500">{r.restaurant?.name} · {r.restaurant?.address}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
