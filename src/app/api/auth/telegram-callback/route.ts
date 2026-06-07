import { NextRequest, NextResponse } from 'next/server'
import { createHmac } from 'crypto'
import { getAdminClient } from '@/lib/supabase-server'

function verifyTelegramAuth(data: Record<string, string>, botToken: string): boolean {
  const { hash, ...rest } = data
  const checkString = Object.keys(rest)
    .sort()
    .map(k => `${k}=${rest[k]}`)
    .join('\n')
  const secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest()
  const hmac = createHmac('sha256', secretKey).update(checkString).digest('hex')
  return hmac === hash
}

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url)

  const data: Record<string, string> = {}
  searchParams.forEach((value, key) => { data[key] = value })

  const botToken = process.env.TELEGRAM_BOT_TOKEN
  if (!botToken) return NextResponse.redirect(`${origin}/login?error=no_token`)

  if (!verifyTelegramAuth(data, botToken)) {
    return NextResponse.redirect(`${origin}/login?error=invalid`)
  }

  const authDate = parseInt(data.auth_date ?? '0')
  if (Date.now() / 1000 - authDate > 86400) {
    return NextResponse.redirect(`${origin}/login?error=expired`)
  }

  const telegramId = data.id
  const name = [data.first_name, data.last_name].filter(Boolean).join(' ')
  const email = `tg_${telegramId}@telegram.local`

  const admin = getAdminClient()

  // Найти или создать пользователя
  let userId: string

  const { data: existing } = await admin
    .from('profiles')
    .select('id')
    .eq('telegram_chat_id', telegramId)
    .single()

  if (existing) {
    userId = existing.id
    await admin.from('profiles').update({ name }).eq('id', userId)
  } else {
   // Проверить есть ли auth user с таким email
    const { data: users } = await admin.auth.admin.listUsers()
    const existingUser = (users as any)?.users?.find((u: any) => u.email === email)

    if (existingUser) {
      userId = existingUser.id
    } else {
      const { data: newUser, error } = await admin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { name, telegram_id: telegramId }
      })
      if (error || !newUser.user) {
        return NextResponse.redirect(`${origin}/login?error=create_failed`)
      }
      userId = newUser.user.id
    }

    await admin.from('profiles').upsert({
      id: userId,
      email,
      phone: '',
      name,
      role: 'client',
      telegram_chat_id: telegramId,
    })
  }

  // Создать сессию через OTP email — без отправки письма
  const { data: otpData, error: otpError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo: `${origin}/` }
  })

  if (otpError || !otpData) {
    return NextResponse.redirect(`${origin}/login?error=session_failed`)
  }

  // Достать токены напрямую из hashed_token
  const hashedToken = (otpData as any).properties?.hashed_token
  if (!hashedToken) {
    return NextResponse.redirect(`${origin}/login?error=no_token`)
  }

  // Верифицировать OTP чтобы получить сессию
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  const verifyRes = await fetch(`${supabaseUrl}/auth/v1/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': anonKey,
    },
    body: JSON.stringify({
      type: 'magiclink',
      token_hash: hashedToken,
      redirect_to: `${origin}/`
    })
  })

  if (!verifyRes.ok) {
    return NextResponse.redirect(`${origin}/login?error=verify_failed`)
  }

  const session = await verifyRes.json()
  const accessToken = session.access_token
  const refreshToken = session.refresh_token

  if (!accessToken) {
    return NextResponse.redirect(`${origin}/login?error=no_session`)
  }

  // Передать токены на клиент через страницу-мост
  const html = `
<!DOCTYPE html>
<html>
<head><title>Вход...</title></head>
<body>
<script>
  const supabaseUrl = '${supabaseUrl}'
  const key = 'sb-' + supabaseUrl.replace('https://','').split('.')[0] + '-auth-token'
  const session = {
    access_token: '${accessToken}',
    refresh_token: '${refreshToken}',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now()/1000) + 3600
  }
  localStorage.setItem(key, JSON.stringify(session))
  window.location.href = '/'
</script>
<p>Выполняется вход...</p>
</body>
</html>
  `

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html' }
  })
}
