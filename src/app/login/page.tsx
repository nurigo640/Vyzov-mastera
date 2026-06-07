async function verifyCode() {
    setLoading(true)
    setError('')
    const normalized = phone.startsWith('+') ? phone : `+${phone}`

    const res = await fetch('/api/auth/telegram-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: normalized, code: otp, action: 'verify' })
    })

    const json = await res.json()
    if (!res.ok) { setError(json.error ?? 'Неверный код'); setLoading(false); return }

    // Редирект по magic link — Supabase сам создаст сессию
    if (json.action_link) {
      window.location.href = json.action_link
    } else {
      window.location.href = '/'
    }
  }
