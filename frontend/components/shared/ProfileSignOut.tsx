'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/lib/store/authStore'

export default function ProfileSignOut() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function signOut() {
    setBusy(true)
    await supabase.auth.signOut()
    useAuthStore.getState().clearAuth()
    router.replace('/')
    router.refresh()
  }

  return <button className="profile-signout" type="button" onClick={signOut} disabled={busy}><LogOut size={17} />{busy ? 'Signing out' : 'Sign out'}</button>
}
