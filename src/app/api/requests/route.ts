import { NextRequest, NextResponse } from 'next/server'
import { getServerClient, getAdminClient } from '@/lib/supabase-server'
import { emitEvent } from '@/lib/events'
import { notifyMasters } from '@/lib/notify'

export async function POST(req: NextRequest) {
  const db = await getServerClient()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { restaurant_id, equipment_type, urgency, description, equipment_brand, equipment_model, contact_person } = body

  if (!restaurant_id || !equipment_type || !description) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const admin = getAdminClient()
  const { data: request, error } = await admin.from('requests').insert({
    restaurant_id,
    client_id: user.id,
    status: 'waiting_master_offers',
    equipment_type,
    urgency: urgency ?? 'normal',
    description,
    equipment_brand: equipment_brand ?? null,
    equipment_model: equipment_model ?? null,
    contact_person: contact_person ?? null,
    photos: [],
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await emitEvent(request.id, 'request_created', user.id)
  await emitEvent(request.id, 'master_notified', null)

  const { data: masters } = await admin
    .from('profiles')
    .select('telegram_chat_id, master_profiles!inner(is_active)')
    .eq('role', 'master')
    .eq('master_profiles.is_active', true)

  const { data: restaurant } = await admin.from('restaurants').select('name').eq('id', restaurant_id).single()

  if (masters?.length) {
    await notifyMasters(masters as any, equipment_type, urgency ?? 'normal', restaurant?.name ?? '', request.id)
  }

  return NextResponse.json({ request }, { status: 201 })
}

export async function GET(req: NextRequest) {
  const db = await getServerClient()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')

  let query = db.from('requests')
    .select('id, status, equipment_type, urgency, created_at, restaurant:restaurants(name, address)')
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ requests: data })
}
