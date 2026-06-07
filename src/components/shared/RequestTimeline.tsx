const LABELS: Record<string, string> = {
  qr_scanned:       'QR-код отсканирован',
  request_created:  'Заявка создана',
  master_notified:  'Мастера уведомлены',
  master_responded: 'Мастер откликнулся',
  master_selected:  'Мастер выбран',
  work_started:     'Работа начата',
  work_finished:    'Работа завершена',
  request_closed:   'Заявка закрыта',
}

interface Event { id: string; event_type: string; created_at: string }

export function RequestTimeline({ events }: { events: Event[] }) {
  if (!events.length) return null
  const sorted = [...events].sort((a, b) => a.created_at.localeCompare(b.created_at))
  return (
    <div className="card">
      <p className="text-sm font-semibold text-gray-700 mb-3">История</p>
      <div className="space-y-3">
        {sorted.map((ev, i) => (
          <div key={ev.id} className="flex items-start gap-3">
            <div className={`w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0 ${i === sorted.length - 1 ? 'bg-brand-500' : 'bg-gray-300'}`} />
            <div>
              <p className="text-sm text-gray-700">{LABELS[ev.event_type] ?? ev.event_type}</p>
              <p className="text-xs text-gray-400">{new Date(ev.created_at).toLocaleString('ru-RU')}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
