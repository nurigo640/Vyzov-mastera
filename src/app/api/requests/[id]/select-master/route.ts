import { NextRequest, NextResponse } from 'next/server'
import { getServerClient, getAdminClient } from '@/lib/supabase-server'
import { emitEvent } from '@/lib/events'
import { sendTelegram } from '@/lib/notify'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: requestId } = await params
  const db = await getServerClient()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { response_id } = await req.json()
  const admin = getAdminClient()

  const { data: request } = await admin.from('requests').select('status, client_id, restaurant_id').eq('id', requestId).single()
  if (!request) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (request.client_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (request.status !== 'waiting_client_selection') return NextResponse.json({ error: 'Not in selection phase' }, { status: 409 })

  const { data: response } = await admin.from('master_responses').select('master_id, proposed_price').eq('id', response_id).eq('request_id', requestId).single()
  if (!response) return NextResponse.json({ error: 'Response not found' }, { status: 404 })

  await admin.from('master_responses').update({ is_selected: false }).eq('request_id', requestId)
  await admin.from('master_responses').update({ is_selected: true }).eq('id', response_id)
  await admin.from('requests').update({
    status: 'master_assigned',
    assigned_master_id: response.master_id,
    estimated_cost: response.proposed_price,
  }).eq('id', requestId)

  await emitEvent(requestId, 'master_selected', user.id, { master_id: response.master_id })

  const { data: masterProfile } = await admin.from('profiles').select('telegram_chat_id, name').eq('id', response.master_id).single()
  const { data: restaurant } = await admin.from('restaurants').select('name, address').eq('id', request.restaurant_id).single()

  if (masterProfile?.telegram_chat_id && restaurant) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
    await sendTelegram(
      masterProfile.telegram_chat_id,
      `<b>Вас выбрали!</b>\n\n📍 ${restaurant.name}\n🗺️ ${restaurant.address}\n\n👉 ${appUrl}/master/request/${requestId}`
    )
  }

  return NextResponse.json({ success: true })
}
