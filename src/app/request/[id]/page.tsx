import { requireAnyRole } from '@/lib/auth'
import { getServerClient } from '@/lib/supabase-server'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { RequestTimeline } from '@/components/shared/RequestTimeline'
import { SelectMasterButton } from '@/components/shared/SelectMasterButton'
import { MasterActionButton } from '@/components/shared/MasterActionButton'

export default async function RequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const profile = await requireAnyRole(['client', 'master', 'admin'])
  const db = await getServerClient()

  const { data: req } = await db
    .from('requests')
    .select(`
      id, status, description, equipment_type, urgency,
      equipment_brand, equipment_model, final_cost, assigned_master_id,
      restaurant:restaurants(name, address),
      master:profiles!assigned_master_id(id, name, phone),
      responses:master_responses(
        id, proposed_price, arrival_time, comment, is_selected,
        master:profiles!master_id(id, name, phone, master_profiles(rating, completed_count))
      ),
      events:request_events(id, event_type, created_at)
    `)
    .eq('id', id)
    .single()

  if (!req) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12 text-center text-gray-500">
        Заявка не найдена
      </div>
    )
  }

  const isClient = profile.role === 'client'
  const isMaster = profile.role === 'master'
  const canSelect = isClient && req.status === 'waiting_client_selection'
  const restaurant = req.restaurant as { name: string; address: string } | null
  const master = req.master as { id: string; name: string | null; phone: string } | null
  const responses = (req.responses as any[]) ?? []
  const events = (req.events as any[]) ?? []

  return (
    <div className="max-w-xl mx-auto px-4 py-6 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-semibold capitalize text-lg">
            {String(req.equipment_type).replace(/_/g, ' ')}
          </h1>
          <p className="text-sm text-gray-500">{restaurant?.name} · {restaurant?.address}</p>
        </div>
        <StatusBadge status={req.status} />
      </div>

      <div className="card">
        <p className="text-sm font-medium text-gray-700 mb-1">Описание</p>
        <p className="text-sm text-gray-600">{req.description}</p>
        {req.equipment_brand && (
          <p className="text-xs text-gray-400 mt-2">{req.equipment_brand} {req.equipment_model}</p>
        )}
      </div>

      {canSelect && responses.length > 0 && (
        <div>
          <p className="text-sm font-semibold mb-2">Отклики мастеров ({responses.length})</p>
          <div className="space-y-3">
            {responses.map((r: any) => (
              <div key={r.id} className="card">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-medium text-sm">{r.master?.name ?? 'Мастер'}</p>
                    {r.master?.master_profiles && (
                      <p className="text-xs text-gray-500">
                        ★ {Number(r.master.master_profiles.rating).toFixed(1)} · {r.master.master_profiles.completed_count} заказов
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-sm">{Number(r.proposed_price).toLocaleString('ru-RU')} ₸</p>
                    <p className="text-xs text-gray-500">{r.arrival_time}</p>
                  </div>
                </div>
                {r.comment && <p className="text-sm text-gray-600 mb-2">{r.comment}</p>}
                {!r.is_selected && (
                  <SelectMasterButton requestId={id} responseId={r.id} />
                )}
                {r.is_selected && (
                  <p className="text-sm font-medium text-green-700 text-center">✓ Выбран</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {master && (
        <div className="card">
          <p className="text-sm font-medium text-gray-700 mb-2">Мастер</p>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center font-semibold text-brand-700">
              {master.name?.charAt(0) ?? 'М'}
            </div>
            <div>
              <p className="font-medium text-sm">{master.name}</p>
              <p className="text-xs text-gray-500">{master.phone}</p>
            </div>
          </div>
          {req.final_cost && (
            <p className="mt-2 text-sm font-medium text-green-700">
              Итого: {Number(req.final_cost).toLocaleString('ru-RU')} ₸
            </p>
          )}
        </div>
      )}

      {isMaster && req.assigned_master_id === profile.id && (
        <MasterActionButton requestId={id} status={req.status} />
      )}

      {isClient && req.status === 'completed' && (
        <div className="card bg-green-50 border-green-200">
          <p className="text-sm font-medium text-green-800 mb-3">Работа завершена. Подтвердите и оставьте оценку.</p>
          <a href={`/request/${id}/confirm`} className="btn-primary w-full text-center block bg-green-600 hover:bg-green-700">
            Подтвердить
          </a>
        </div>
      )}

      <RequestTimeline events={events} />
    </div>
  )
}
