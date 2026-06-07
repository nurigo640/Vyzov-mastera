'use client'
import { useState } from 'react'
import { getBrowserClient } from '@/lib/supabase-browser'

export default function LoginPage() {
  const [step, setStep] = useState<'email' | 'otp'>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function sendOTP() {
    setLoading(true)
    setError('')
    const sb = getBrowserClient()
    const { error: e } = await sb.auth.signInWithOtp({ email, options: { shouldCreateUser: true } })
    if (e) setError(e.message)
    else setStep('otp')
    setLoading(false)
  }

  async function verifyOTP() {
    setLoading(true)
    setError('')
    const sb = getBrowserClient()
    const { error: e } = await sb.auth.verifyOtp({ email, token: otp, type: 'email' })
    if (e) { setError(e.message); setLoading(false); return }
    window.location.href = '/'
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="card w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="text-4xl mb-3">🔧</div>
          <h1 className="text-xl font-semibold">Вызов мастера</h1>
          <p className="text-sm text-gray-500 mt-1">
            {step === 'email' ? 'Войдите по email' : `Код отправлен на ${email}`}
          </p>
        </div>

        {step === 'email' ? (
          <div className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input
                className="input"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && email.includes('@') && sendOTP()}
                autoFocus
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button
              className="btn-primary w-full"
              onClick={sendOTP}
              disabled={loading || !email.includes('@')}
            >
              {loading ? 'Отправка...' : 'Получить код'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="label">Код из письма</label>
              <input
                className="input text-center tracking-widest text-lg"
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                onKeyDown={e => e.key === 'Enter' && otp.length === 6 && verifyOTP()}
                autoFocus
              />
              <p className="text-xs text-gray-400 mt-1">Проверьте папку «Спам»</p>
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button
              className="btn-primary w-full"
              onClick={verifyOTP}
              disabled={loading || otp.length < 6}
            >
              {loading ? 'Проверка...' : 'Войти'}
            </button>
            <button className="btn-secondary w-full" onClick={() => { setStep('email'); setOtp(''); setError('') }}>
              ← Изменить email
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
