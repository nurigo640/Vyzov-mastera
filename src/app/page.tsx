import { redirect } from 'next/navigation'
import { getProfile } from '@/lib/auth'

export default async function HomePage() {
  const profile = await getProfile()
  if (!profile) redirect('/login')
  if (profile.role === 'master') redirect('/master/dashboard')
  if (profile.role === 'admin') redirect('/admin/dashboard')
  redirect('/dashboard')
}
