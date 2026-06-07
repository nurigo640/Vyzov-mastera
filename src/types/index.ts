export type UserRole = 'client' | 'master' | 'admin'

export type RequestStatus =
  | 'new'
  | 'waiting_for_masters'
  | 'waiting_master_offers'
  | 'waiting_client_selection'
  | 'master_assigned'
  | 'in_progress'
  | 'completed'
  | 'closed'

export type EquipmentType =
  | 'refrigerator' | 'oven' | 'dishwasher' | 'fryer'
  | 'grill' | 'coffee_machine' | 'ice_maker' | 'ventilation' | 'other'

export type Urgency = 'urgent' | 'normal'

export type EventType =
  | 'qr_scanned' | 'request_created' | 'master_notified'
  | 'master_responded' | 'master_selected'
  | 'work_started' | 'work_finished' | 'request_closed'

export interface Profile {
  id: string
  email: string
  phone: string
  name: string | null
  role: UserRole
  telegram_chat_id: string | null
  created_at: string
}

export interface Restaurant {
  id: string
  organization_id: string
  name: string
  address: string
}

export interface RequestRow {
  id: string
  restaurant_id: string
  client_id: string
  status: string
  description: string
  equipment_type: string
  urgency: string
  contact_person: string | null
  equipment_brand: string | null
  equipment_model: string | null
  photos: string[]
  preferred_time: string | null
  assigned_master_id: string | null
  estimated_cost: number | null
  final_cost: number | null
  created_at: string
  updated_at: string
}

export interface MasterResponseRow {
  id: string
  request_id: string
  master_id: string
  proposed_price: number
  arrival_time: string
  comment: string | null
  is_selected: boolean
  created_at: string
}

export interface EventRow {
  id: string
  request_id: string
  event_type: string
  actor_id: string | null
  payload: Record<string, unknown>
  created_at: string
}

export const STATUS_TRANSITIONS: Record<string, string[]> = {
  new:                       ['waiting_for_masters'],
  waiting_for_masters:       ['waiting_master_offers'],
  waiting_master_offers:     ['waiting_client_selection'],
  waiting_client_selection:  ['master_assigned'],
  master_assigned:           ['in_progress'],
  in_progress:               ['completed'],
  completed:                 ['closed'],
  closed:                    [],
}

export function canTransition(from: string, to: string): boolean {
  return (STATUS_TRANSITIONS[from] ?? []).includes(to)
}
