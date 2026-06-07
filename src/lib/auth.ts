import { redirect } from 'next/navigation'
import { getServerClient } from './supabase-server'
import type { UserRole } from '@/types'

export async function getProfile() {
  const supabase = await getServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  return data
}

export async function requireRole(role: UserRole) {
  const profile = await getProfile()
  if (!profile) redirect('/login')
  if (profile.role !== role) redirect('/unauthorized')
  return profile
}

export async function requireAnyRole(roles: UserRole[]) {
  const profile = await getProfile()
  if (!profile) redirect('/login')
  if (!roles.includes(profile.role as UserRole)) redirect('/unauthorized')
  return profile
}
