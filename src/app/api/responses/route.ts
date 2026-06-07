import { NextRequest, NextResponse } from 'next/server'
import { getServerClient, getAdminClient } from '@/lib/supabase-server'
import { emitEvent } from '@/lib/events'
import { sendTelegram } from '@/lib/notify'

export async function POST(req: NextRequest) {
  const db = await getServerClient()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { request_id, proposed_price, arrival_time, comment } = body
  if (!request_id || !proposed_price || !arrival_time) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const admin = getAdminClient()

  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'master') return NextResponse.json({ error: 'Masters only' }, { status: 403 })

  const { data: request } = await admin.from('requests').select('status, client_id').eq('id', request_id).single()
  if (!request) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!['waiting_master_offers', 'waiting_client_selection'].includes(request.status)) {
    return NextResponse.json({ error: 'Not accepting responses' }, { status: 409 })
  }

  const { data: existing } = await admin.from('master_responses').select('id').eq('request_id', request_id).eq('master_id', user.id).single()
  if (existing) return NextResponse.json({ error: 'Already responded' }, { status: 409 })

  const { data: response, error } = await admin.from('master_responses').insert({
    request_id, master_id: user.id, proposed_price, arrival_time, comment: comment ?? null, is_selected: false
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await emitEvent(request_id, 'master_responded', user.id, { proposed_price })

  if (request.status === 'waiting_master_offers') {
    await admin.from('requests').update({ status: 'waiting_client_selection' }).eq('id', request_id)
  }

  const { data: clientProfile } = await admin.from('profiles').select('telegram_chat_id').eq('id', request.client_id).single()
  const { data: masterProfile } = await admin.from('profiles').select('name').eq('id', user.id).single()

  if (clientProfile?.telegram_chat_id) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
    await sendTelegram(
      clientProfile.telegram_chat_id,
      `<b>Мастер откликнулся</b>\n\n👷 ${masterProfile?.name ?? 'Мастер'}\n💰 ${Number(proposed_price).toLocaleString('ru-RU')} ₸\n🕐 ${arrival_time}\n\n👉 ${appUrl}/request/${request_id}`
    )
  }

  return NextResponse.json({ response }, { status: 201 })
}
