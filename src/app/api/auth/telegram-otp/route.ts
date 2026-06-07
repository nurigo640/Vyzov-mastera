import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase-server'

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

async function sendTelegramCode(phone: string, code: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return false

  const admin = getAdminClient()

  const { data: profile } = await admin
    .from('profiles')
    .select('telegram_chat_id')
    .eq('phone', phone)
    .single()

  if (!profile?.telegram_chat_id) return false

  const text = `🔐 Ваш код входа: <b>${code}</b>\n\nКод действителен 10 минут.\nНе сообщайте код никому.`

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: profile.telegram_chat_id, text, parse_mode: 'HTML' })
  })

  return res.ok
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { phone, action, code } = body

  if (!phone) return NextResponse.json({ error: 'Phone required' }, { status: 400 })

  const admin = getAdminClient()

  // ─── SEND ─────────────────────────────────────────────────────
  if (action === 'send') {
    await admin.from('telegram_otp').delete().eq('phone', phone)

    const newCode = generateCode()
    await admin.from('telegram_otp').insert({ phone, code: newCode, used: false })

    const sent = await sendTelegramCode(phone, newCode)
    if (!sent) {
      return NextResponse.json(
        { error: 'Telegram не привязан. Откройте бота и отправьте свой номер телефона.' },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true })
  }

  // ─── VERIFY ───────────────────────────────────────────────────
  if (action === 'verify') {
    if (!code) return NextResponse.json({ error: 'Code required' }, { status: 400 })

    const { data: otpRow } = await admin
      .from('telegram_otp')
      .select('*')
      .eq('phone', phone)
      .eq('code', code)
      .eq('used', false)
      .gte('expires_at', new Date().toISOString())
      .single()

    if (!otpRow) {
      return NextResponse.json({ error: 'Неверный или истёкший код' }, { status: 401 })
    }

    await admin.from('telegram_otp').update({ used: true }).eq('id', otpRow.id)

    // Найти профиль по телефону
    const { data: profile } = await admin
      .from('profiles')
      .select('id, email')
      .eq('phone', phone)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Пользователь не найден. Сначала откройте бота.' }, { status: 404 })
    }

    // Создать magic link для входа по email профиля
    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: profile.email,
    })

    if (linkError || !linkData) {
      return NextResponse.json({ error: 'Ошибка создания сессии' }, { status: 500 })
    }

    // Извлечь токены из hashed_token через verifyOtp
    const { data: sessionData, error: sessionError } = await admin.auth.admin.getUserById(profile.id)
    if (sessionError) {
      return NextResponse.json({ error: 'Ошибка сессии' }, { status: 500 })
    }

    // Вернуть ссылку для редиректа — клиент перейдёт по ней
    const actionLink = (linkData as any).action_link ?? linkData.properties?.action_link
    return NextResponse.json({ success: true, action_link: actionLink })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
