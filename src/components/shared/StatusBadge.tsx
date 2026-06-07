const CONFIG: Record<string, { label: string; cls: string }> = {
  new:                      { label: 'Новая',           cls: 'bg-gray-100 text-gray-600' },
  waiting_for_masters:      { label: 'Ищем мастеров',   cls: 'bg-blue-50 text-blue-600' },
  waiting_master_offers:    { label: 'Ждём отклики',    cls: 'bg-blue-100 text-blue-700' },
  waiting_client_selection: { label: 'Выбор мастера',   cls: 'bg-amber-100 text-amber-700' },
  master_assigned:          { label: 'Мастер назначен', cls: 'bg-purple-100 text-purple-700' },
  in_progress:              { label: 'В работе',        cls: 'bg-orange-100 text-orange-700' },
  completed:                { label: 'Выполнено',       cls: 'bg-green-100 text-green-700' },
  closed:                   { label: 'Закрыта',         cls: 'bg-gray-100 text-gray-400' },
}

export function StatusBadge({ status }: { status: string }) {
  const c = CONFIG[status] ?? { label: status, cls: 'bg-gray-100 text-gray-500' }
  return <span className={`badge ${c.cls}`}>{c.label}</span>
}
