import { NextRequest, NextResponse } from 'next/server'
import { getServerClient, getAdminClient } from '@/lib/supabase-server'
import { transitionStatus, writeFinancialLog } from '@/lib/events'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db = await getServerClient()
  const { data, error } = await db
    .from('requests')
    .select(`*, restaurant:restaurants(name, address), responses:master_responses(*, master:profiles!master_id(name, phone)), events:request_events(*)`)
    .eq('id', id)
    .single()
  if (error) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ request: data })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db = await getServerClient()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { status, final_cost } = body

  if (status) {
    await transitionStatus(id, status, user.id)

    if (status === 'completed') {
      const admin = getAdminClient()
      if (final_cost) await admin.from('requests').update({ final_cost }).eq('id', id)
      const { data: r } = await admin.from('requests').select('assigned_master_id, estimated_cost, final_cost').eq('id', id).single()
      if (r) {
        await writeFinancialLog({
          requestId: id,
          masterId: r.assigned_master_id ?? undefined,
          estimatedCost: r.estimated_cost ?? undefined,
          finalCost: final_cost ?? r.final_cost ?? undefined,
        })
      }
    }
  }

  return NextResponse.json({ success: true })
}
