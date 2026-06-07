import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const message = body?.message
  if (!message) return NextResponse.json({ ok: true })

  const chatId = message.chat.id
  const text = message.text ?? ''
  const token = process.env.TELEGRAM_BOT_TOKEN!

  async function reply(msg: string) {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: 'HTML' })
    })
  }

  const admin = getAdminClient()

  // /start
  if (text.startsWith('/start')) {
    await reply(
      '👋 Добро пожаловать в <b>Вызов мастера</b>!\n\n' +
      'Для входа на сайт отправьте ваш номер телефона в формате:\n' +
      '<code>+77001234567</code>'
    )
    return NextResponse.json({ ok: true })
  }

  // Номер телефона
  const phoneMatch = text.match(/\+?[\d\s\-()]{10,}/)
  if (phoneMatch) {
    const phone = '+' + phoneMatch[0].replace(/\D/g, '')

    // Найти профиль и сохранить chat_id
    const { data: profile } = await admin
      .from('profiles')
      .select('id')
      .eq('phone', phone)
      .single()

    if (profile) {
      await admin.from('profiles')
        .update({ telegram_chat_id: String(chatId) })
        .eq('id', profile.id)

      await reply(`✅ Телефон <b>${phone}</b> привязан!\n\nТеперь вы можете войти на сайт — код будет приходить сюда.`)
    } else {
      // Новый пользователь — создать профиль
      const { data: newUser } = await admin.auth.admin.createUser({
        phone,
        phone_confirm: true,
      })

      if (newUser.user) {
        await admin.from('profiles')
          .update({ telegram_chat_id: String(chatId), phone })
          .eq('id', newUser.user.id)

        await reply(`✅ Аккаунт создан для <b>${phone}</b>!\n\nТеперь войдите на сайт.`)
      } else {
        await reply('❌ Ошибка. Попробуйте ещё раз.')
      }
    }

    return NextResponse.json({ ok: true })
  }

  await reply('Отправьте номер телефона в формате +77001234567')
  return NextResponse.json({ ok: true })
}
