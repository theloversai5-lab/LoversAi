import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function VendorProfileRedirect() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth?role=vendor')
  const { data: profile } = await supabase.from('profiles').select('handle,is_complete').eq('id', user.id).maybeSingle()
  if (!profile?.is_complete) redirect('/profile/setup')
  redirect(`/profile/${profile.handle}`)
}
