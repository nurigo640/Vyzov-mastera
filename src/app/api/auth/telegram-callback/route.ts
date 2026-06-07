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

  // Проверить подпись Telegram
  if (!verifyTelegramAuth(data, botToken)) {
    return NextResponse.redirect(`${origin}/login?error=invalid_signature`)
  }

  // Проверить что данные не старше 24 часов
  const authDate = parseInt(data.auth_date ?? '0')
  if (Date.now() / 1000 - authDate > 86400) {
    return NextResponse.redirect(`${origin}/login?error=expired`)
  }

  const telegramId = data.id
  const firstName = data.first_name ?? ''
  const lastName = data.last_name ?? ''
  const username = data.username ?? ''
  const name = [firstName, lastName].filter(Boolean).join(' ')

  const admin = getAdminClient()

  // Найти профиль по telegram_chat_id
  let { data: profile } = await admin
    .from('profiles')
    .select('id, email')
    .eq('telegram_chat_id', telegramId)
    .single()

  const email = `tg_${telegramId}@telegram.local`

  if (!profile) {
    // Создать нового пользователя
    const { data: newUser, error } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { name, username, telegram_id: telegramId }
    })

    if (error || !newUser.user) {
      return NextResponse.redirect(`${origin}/login?error=create_failed`)
    }

    // Обновить профиль
    await admin.from('profiles').upsert({
      id: newUser.user.id,
      email,
      phone: '',
      name,
      role: 'client',
      telegram_chat_id: telegramId,
    })

    profile = { id: newUser.user.id, email }
  } else {
    // Обновить имя если изменилось
    await admin.from('profiles').update({ name, telegram_chat_id: telegramId }).eq('id', profile.id)
  }

  // Создать magic link для входа
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: profile.email ?? email,
  })

  if (linkError || !linkData) {
    return NextResponse.redirect(`${origin}/login?error=session_failed`)
  }

  const actionLink = (linkData as any).properties?.action_link
  if (actionLink) {
    return NextResponse.redirect(actionLink)
  }

  return NextResponse.redirect(`${origin}/`)
}
