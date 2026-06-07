import { redirect } from 'next/navigation'
import { getServerClient, getAdminClient } from '@/lib/supabase-server'

export default async function QRPage({ params }: { params: Promise<{ restaurantId: string }> }) {
  const { restaurantId } = await params
  const admin = getAdminClient()
  const { data: restaurant } = await admin.from('restaurants').select('id, name').eq('id', restaurantId).single()

  if (!restaurant) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="card text-center p-8">
          <p className="text-gray-500">QR-код не найден</p>
        </div>
      </div>
    )
  }

  const supabase = await getServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect(`/request/new?restaurant_id=${restaurantId}`)
  } else {
    redirect(`/login?redirect=/request/new?restaurant_id=${restaurantId}`)
  }
}
