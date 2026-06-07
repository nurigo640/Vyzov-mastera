export async function sendTelegram(chatId: string, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' })
    })
  } catch (e) {
    console.error('[telegram]', e)
  }
}

export async function notifyMasters(
  masters: { telegram_chat_id: string | null }[],
  equipmentType: string,
  urgency: string,
  restaurantName: string,
  requestId: string
) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const label = urgency === 'urgent' ? '🔴 СРОЧНО' : '🟡 Обычная'
  const text = `<b>Новая заявка</b>\n\n📍 ${restaurantName}\n🔧 ${equipmentType}\n${label}\n\n👉 ${appUrl}/master/request/${requestId}`
  await Promise.allSettled(
    masters.filter(m => m.telegram_chat_id).map(m => sendTelegram(m.telegram_chat_id!, text))
  )
}

export async function notifyClient(
  chatId: string | null,
  message: string
) {
  if (chatId) await sendTelegram(chatId, message)
}
