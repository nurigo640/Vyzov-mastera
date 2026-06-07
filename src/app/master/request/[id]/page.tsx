import { requireRole } from '@/lib/auth'
import { getServerClient } from '@/lib/supabase-server'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { RequestTimeline } from '@/components/shared/RequestTimeline'
import { MasterActionButton } from '@/components/shared/MasterActionButton'
import { MasterRespondForm } from '@/components/shared/MasterRespondForm'

export default async function MasterRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const profile = await requireRole('master')
  const db = await getServerClient()

  const { data: req } = await db
    .from('requests')
    .select(`
      id, status, description, equipment_type, urgency,
      equipment_brand, equipment_model, assigned_master_id,
      restaurant:restaurants(name, address),
      events:request_events(id, event_type, created_at)
    `)
    .eq('id', id)
    .single()

  if (!req) {
    return <div className="max-w-xl mx-auto px-4 py-12 text-center text-gray-500">Заявка не найдена</div>
  }

  const { data: myResponse } = await db
    .from('master_responses')
    .select('id, proposed_price, arrival_time, comment')
    .eq('request_id', id)
    .eq('master_id', profile.id)
    .single()

  const canRespond = !myResponse && ['waiting_master_offers', 'waiting_client_selection'].includes(req.status)
  const isAssigned = req.assigned_master_id === profile.id
  const restaurant = req.restaurant as unknown as { name: string; address: string } | null
  const events = ((req.events as unknown as any[]) ?? [])

  return (
    <div className="max-w-xl mx-auto px-4 py-6 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-semibold capitalize text-lg">
            {String(req.equipment_type).replace(/_/g, ' ')}
          </h1>
          <p className="text-sm text-gray-500">{restaurant?.name} · {restaurant?.address}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <StatusBadge status={req.status} />
          {req.urgency === 'urgent' && <span className="badge bg-red-100 text-red-700">Срочно</span>}
        </div>
      </div>

      <div className="card">
        <p className="text-sm font-medium text-gray-700 mb-1">Описание</p>
        <p className="text-sm text-gray-600">{req.description}</p>
        {req.equipment_brand && (
          <p className="text-xs text-gray-400 mt-2">{req.equipment_brand} {req.equipment_model}</p>
        )}
      </div>

      {myResponse && (
        <div className="card bg-blue-50 border-blue-200">
          <p className="text-sm font-medium text-blue-800 mb-1">Ваш отклик отправлен</p>
          <p className="text-sm text-blue-700">{Number(myResponse.proposed_price).toLocaleString('ru-RU')} ₸ · {myResponse.arrival_time}</p>
          {myResponse.comment && <p className="text-sm text-blue-600 mt-1">{myResponse.comment}</p>}
        </div>
      )}

      {canRespond && <MasterRespondForm requestId={id} />}

      {isAssigned && <MasterActionButton requestId={id} status={req.status} />}

      <RequestTimeline events={events} />
    </div>
  )
}
