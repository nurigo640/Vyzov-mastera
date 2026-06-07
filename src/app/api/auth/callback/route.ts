import { NextRequest, NextResponse } from 'next/server'
import { getServerClient, getAdminClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await getServerClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      const admin = getAdminClient()
      const { data: existing } = await admin.from('profiles').select('id, role').eq('id', data.user.id).single()

      if (!existing) {
        await admin.from('profiles').insert({
          id: data.user.id,
          email: data.user.email ?? '',
          phone: '',
          name: null,
          role: 'client',
          telegram_chat_id: null
        })
      }

      const role = existing?.role ?? 'client'
      const dest = role === 'admin' ? '/admin/dashboard' : role === 'master' ? '/master/dashboard' : '/dashboard'
      return NextResponse.redirect(`${origin}${dest}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`)
}
