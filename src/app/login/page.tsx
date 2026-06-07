'use client'
import { useState } from 'react'

type Step = 'phone' | 'otp'

export default function LoginPage() {
  const [step, setStep] = useState<Step>('phone')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [telegramSent, setTelegramSent] = useState(false)

  async function sendCode() {
    setLoading(true)
    setError('')
    const normalized = phone.startsWith('+') ? phone : `+${phone}`

    const res = await fetch('/api/auth/telegram-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: normalized, action: 'send' })
    })

    const json = await res.json()
    if (!res.ok) { setError(json.error ?? 'Ошибка'); setLoading(false); return }

    setTelegramSent(true)
    setStep('otp')
    setLoading(false)
  }

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

    if (json.action_link) {
      window.location.href = json.action_link
    } else {
      window.location.href = '/'
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="card w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="text-4xl mb-3">🔧</div>
          <h1 className="text-xl font-semibold">Вызов мастера</h1>
          <p className="text-sm text-gray-500 mt-1">
            {step === 'phone' ? 'Войдите по номеру телефона' : 'Введите код из Telegram'}
          </p>
        </div>

        {step === 'phone' ? (
          <div className="space-y-4">
            <div>
              <label className="label">Номер телефона</label>
              <input
                className="input"
                type="tel"
                placeholder="+7 701 234 56 78"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && phone.length > 5 && sendCode()}
                autoFocus
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button
              className="btn-primary w-full"
              onClick={sendCode}
              disabled={loading || phone.length < 6}
            >
              {loading ? 'Отправка...' : '📱 Получить код в Telegram'}
            </button>
            <p className="text-xs text-gray-400 text-center">
              Код придёт в Telegram от бота
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {telegramSent && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
                ✅ Код отправлен в Telegram. Проверьте сообщения от бота.
              </div>
            )}
            <div>
              <label className="label">Код из Telegram</label>
              <input
                className="input text-center tracking-widest text-lg"
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                onKeyDown={e => e.key === 'Enter' && otp.length === 6 && verifyCode()}
                autoFocus
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button
              className="btn-primary w-full"
              onClick={verifyCode}
              disabled={loading || otp.length < 6}
            >
              {loading ? 'Проверка...' : 'Войти'}
            </button>
            <button
              className="btn-secondary w-full"
              onClick={() => { setStep('phone'); setOtp(''); setError('') }}
            >
              ← Изменить номер
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
