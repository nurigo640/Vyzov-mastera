'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function MasterRespondForm({ requestId }: { requestId: string }) {
  const [price, setPrice] = useState('')
  const [time, setTime] = useState('')
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function submit() {
    if (!price || !time) { setError('Укажите цену и время прибытия'); return }
    setLoading(true)
    setError('')
    const res = await fetch('/api/responses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        request_id: requestId,
        proposed_price: Number(price),
        arrival_time: time,
        comment: comment || undefined
      })
    })
    const json = await res.json()
    if (!res.ok) { setError(json.error ?? 'Ошибка'); setLoading(false); return }
    router.refresh()
  }

  return (
    <div className="card">
      <p className="text-sm font-semibold mb-3">Откликнуться на заявку</p>
      <div className="space-y-3">
        <div>
          <label className="label">Предлагаемая цена (₸) *</label>
          <input className="input" type="number" placeholder="15000" value={price} onChange={e => setPrice(e.target.value)} />
        </div>
        <div>
          <label className="label">Время прибытия *</label>
          <input className="input" placeholder="Через 1 час / Сегодня в 15:00" value={time} onChange={e => setTime(e.target.value)} />
        </div>
        <div>
          <label className="label">Комментарий</label>
          <textarea className="input resize-none" rows={2} placeholder="Опыт с данным оборудованием..." value={comment} onChange={e => setComment(e.target.value)} />
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button className="btn-primary w-full" onClick={submit} disabled={loading}>
          {loading ? 'Отправка...' : 'Отправить отклик'}
        </button>
      </div>
    </div>
  )
}
