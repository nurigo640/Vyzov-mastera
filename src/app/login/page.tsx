'use client'
import { useEffect, useRef } from 'react'

export default function LoginPage() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const script = document.createElement('script')
    script.src = 'https://telegram.org/js/telegram-widget.js?22'
    script.setAttribute('data-telegram-login', 'vyzov_master_kz_bot')
    script.setAttribute('data-size', 'large')
    script.setAttribute('data-auth-url', `${window.location.origin}/api/auth/telegram-callback`)
    script.setAttribute('data-request-access', 'write')
    script.async = true

    containerRef.current.appendChild(script)
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="card w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="text-4xl mb-3">🔧</div>
          <h1 className="text-xl font-semibold">Вызов мастера</h1>
          <p className="text-sm text-gray-500 mt-1">
            Войдите через Telegram — быстро и бесплатно
          </p>
        </div>

        <div className="flex justify-center" ref={containerRef} />

        <p className="text-xs text-gray-400 text-center mt-6">
          Нажмите кнопку выше и подтвердите вход в Telegram
        </p>
      </div>
    </div>
  )
}
