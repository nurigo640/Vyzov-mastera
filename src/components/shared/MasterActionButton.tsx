'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const LABELS: Record<string, string> = {
  master_assigned: 'Начать работу',
  in_progress: 'Завершить работу',
}
const NEXT: Record<string, string> = {
  master_assigned: 'in_progress',
  in_progress: 'completed',
}

export function MasterActionButton({ requestId, status }: { requestId: string; status: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  if (!LABELS[status]) return null

  async function update() {
    setLoading(true)
    await fetch(`/api/requests/${requestId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: NEXT[status] })
    })
    router.refresh()
    setLoading(false)
  }

  return (
    <button className="btn-primary w-full" onClick={update} disabled={loading}>
      {loading ? 'Обновление...' : LABELS[status]}
    </button>
  )
}
