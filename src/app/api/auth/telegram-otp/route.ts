import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase-server'

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

async function sendTelegramCode(phone: string, code: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return false

  const admin = getAdminClient()

  // Найти пользователя по телефону и получить telegram_chat_id
  const { data: profile } = await admin
    .from('profiles')
    .select('telegram_chat_id, name')
    .eq('phone', phone)
    .single()

  if (!profile?.telegram_chat_id) {
    // Пользователь ещё не связал Telegram
    return false
  }

  const text = `🔐 Ваш код входа: <b>${code}</b>\n\nКод действителен 10 минут.\nНе сообщайте код никому.`

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: profile.telegram_chat_id,
      text,
      parse_mode: 'HTML'
    })
  })

  return res.ok
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { phone, action, code } = body

  if (!phone) return NextResponse.json({ error: 'Phone required' }, { status: 400 })

  const admin = getAdminClient()

  // ─── SEND ────────────────────────────────────────────────────
  if (action === 'send') {
    // Удалить старые коды
    await admin.from('telegram_otp').delete().eq('phone', phone)

    const newCode = generateCode()

    // Сохранить код
    await admin.from('telegram_otp').insert({
      phone,
      code: newCode,
      used: false,
    })

    const sent = await sendTelegramCode(phone, newCode)

    if (!sent) {
      return NextResponse.json(
        { error: 'Telegram не привязан. Сначала напишите боту /start и укажите свой номер телефона.' },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true })
  }

  // ─── VERIFY ──────────────────────────────────────────────────
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

    // Пометить код использованным
    await admin.from('telegram_otp').update({ used: true }).eq('id', otpRow.id)

    // Найти или создать пользователя
    let { data: profile } = await admin
      .from('profiles')
      .select('id')
      .eq('phone', phone)
      .single()

    if (!profile) {
      // Создать auth user
      const { data: newUser } = await admin.auth.admin.createUser({
        phone,
        phone_confirm: true,
      })

      if (!newUser.user) {
        return NextResponse.json({ error: 'Ошибка создания пользователя' }, { status: 500 })
      }

      // Профиль создастся автоматически через триггер
      profile = { id: newUser.user.id }
    }

    // Создать сессию
    const { data: session } = await admin.auth.admin.createUser({
      phone,
      phone_confirm: true,
    })

    // Получить ссылку для входа
    const { data: link } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: `${phone.replace(/\+/g, '').replace(/\s/g, '')}@phone.local`,
    })

    if (!link) {
      return NextResponse.json({ error: 'Ошибка создания сессии' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      access_token: link.properties?.access_token,
      refresh_token: link.properties?.refresh_token,
    })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
