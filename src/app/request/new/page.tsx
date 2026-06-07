'use client'
import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

const EQUIPMENT = [
  { value: 'refrigerator',   label: 'Холодильник' },
  { value: 'oven',           label: 'Духовой шкаф / Печь' },
  { value: 'dishwasher',     label: 'Посудомоечная машина' },
  { value: 'fryer',          label: 'Фритюрница' },
  { value: 'grill',          label: 'Гриль' },
  { value: 'coffee_machine', label: 'Кофемашина' },
  { value: 'ice_maker',      label: 'Льдогенератор' },
  { value: 'ventilation',    label: 'Вентиляция' },
  { value: 'other',          label: 'Другое' },
]

function NewRequestForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const restaurantId = searchParams.get('restaurant_id') ?? ''

  const [equipmentType, setEquipmentType] = useState('')
  const [urgency, setUrgency] = useState('normal')
  const [description, setDescription] = useState('')
  const [brand, setBrand] = useState('')
  const [model, setModel] = useState('')
  const [contact, setContact] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit() {
    if (!restaurantId) { setError('Ресторан не найден. Отсканируйте QR заново.'); return }
    if (!equipmentType) { setError('Выберите тип оборудования'); return }
    if (description.length < 10) { setError('Опишите проблему подробнее (минимум 10 символов)'); return }

    setLoading(true)
    setError('')

    const res = await fetch('/api/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        restaurant_id: restaurantId,
        equipment_type: equipmentType,
        urgency,
        description,
        equipment_brand: brand || undefined,
        equipment_model: model || undefined,
        contact_person: contact || undefined,
      })
    })

    const json = await res.json()
    if (!res.ok) { setError(json.error ?? 'Ошибка'); setLoading(false); return }
    router.push(`/request/${json.request.id}`)
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-6">
      <h1 className="text-lg font-semibold mb-6">Новая заявка на ремонт</h1>
      <div className="space-y-4">
        <div>
          <label className="label">Тип оборудования *</label>
          <select className="input" value={equipmentType} onChange={e => setEquipmentType(e.target.value)}>
            <option value="">Выберите...</option>
            {EQUIPMENT.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <div>
          <label className="label">Срочность *</label>
          <div className="flex gap-3">
            {[
              { value: 'normal', label: '🟡 Обычная' },
              { value: 'urgent', label: '🔴 Срочно' },
            ].map(u => (
              <button
                key={u.value}
                type="button"
                onClick={() => setUrgency(u.value)}
                className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  urgency === u.value
                    ? 'bg-brand-50 border-brand-400 text-brand-700'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {u.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label">Описание проблемы *</label>
          <textarea
            className="input min-h-[100px] resize-none"
            placeholder="Что сломалось? Какие симптомы?"
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Марка</label>
            <input className="input" placeholder="Beko, Electrolux..." value={brand} onChange={e => setBrand(e.target.value)} />
          </div>
          <div>
            <label className="label">Модель</label>
            <input className="input" placeholder="Модель..." value={model} onChange={e => setModel(e.target.value)} />
          </div>
        </div>

        <div>
          <label className="label">Контактное лицо</label>
          <input className="input" placeholder="Имя, телефон" value={contact} onChange={e => setContact(e.target.value)} />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button className="btn-primary w-full py-3" onClick={submit} disabled={loading}>
          {loading ? 'Отправка...' : 'Отправить заявку'}
        </button>
      </div>
    </div>
  )
}

export default function NewRequestPage() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-400">Загрузка...</div>}>
      <NewRequestForm />
    </Suspense>
  )
}
