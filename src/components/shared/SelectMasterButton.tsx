'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function SelectMasterButton({ requestId, responseId }: { requestId: string; responseId: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function select() {
    setLoading(true)
    await fetch(`/api/requests/${requestId}/select-master`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ response_id: responseId })
    })
    router.refresh()
    setLoading(false)
  }

  return (
    <button className="btn-primary w-full text-sm" onClick={select} disabled={loading}>
      {loading ? 'Выбираем...' : 'Выбрать мастера'}
    </button>
  )
}
