import { getAdminClient } from './supabase-server'
import { canTransition } from '@/types'

export async function emitEvent(
  requestId: string,
  eventType: string,
  actorId: string | null,
  payload: Record<string, unknown> = {}
) {
  const db = getAdminClient()
  await db.from('request_events').insert({ request_id: requestId, event_type: eventType, actor_id: actorId, payload })
}

export async function transitionStatus(requestId: string, newStatus: string, actorId: string) {
  const db = getAdminClient()
  const { data: req } = await db.from('requests').select('status').eq('id', requestId).single()
  if (!req) throw new Error('Request not found')
  if (!canTransition(req.status, newStatus)) throw new Error(`Invalid: ${req.status} -> ${newStatus}`)
  await db.from('requests').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', requestId)
  const map: Record<string, string> = { in_progress: 'work_started', completed: 'work_finished', closed: 'request_closed' }
  if (map[newStatus]) await emitEvent(requestId, map[newStatus], actorId)
}

export async function writeFinancialLog(params: {
  requestId: string, masterId?: string, estimatedCost?: number, finalCost?: number
}) {
  const db = getAdminClient()
  const enabled = process.env.MONETIZATION_ENABLED === 'true'
  const pct = enabled ? 10 : 0
  const commission = enabled ? Math.round((params.finalCost ?? 0) * pct / 100) : 0
  await db.from('financial_logs').insert({
    request_id: params.requestId,
    master_id: params.masterId ?? null,
    estimated_cost: params.estimatedCost ?? null,
    final_cost: params.finalCost ?? null,
    commission_percent: pct,
    commission_calculated: commission,
    billing_mode: enabled ? 'active' : 'disabled'
  })
}
