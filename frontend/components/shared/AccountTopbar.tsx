'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MessageCircle, UserRound } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import type { UserRole } from '@/lib/supabase/client'

type AccountLinks = { role: UserRole; profilePath: string }

const rolePaths: Record<UserRole, { messages: string; home: string }> = {
  couple: { messages: '/couple/messages', home: '/couple' },
  planner: { messages: '/planner/messages', home: '/planner' },
  vendor: { messages: '/vendor/messages', home: '/vendor' },
}

export default function AccountTopbar() {
  const pathname = usePathname()
  const [account, setAccount] = useState<AccountLinks | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let active = true
    let requestId = 0
    const loadAccount = async (userId?: string) => {
      const currentRequest = ++requestId
      if (!userId) {
        if (active) setAccount(null)
        return
      }
      const { data, error } = await supabase.from('profiles')
        .select('role,handle,is_complete').eq('id', userId).maybeSingle()
      if (!active || currentRequest !== requestId) return
      if (error || !data || !['couple', 'planner', 'vendor'].includes(data.role)) {
        setAccount(null)
        return
      }
      const role = data.role as UserRole
      const profilePath = data.is_complete && data.handle ? `/profile/${data.handle}` : '/profile/setup'
      setAccount({ role, profilePath })
    }

    void supabase.auth.getUser()
      .then(({ data }) => loadAccount(data.user?.id))
      .catch(() => { if (active) setAccount(null) })
      .finally(() => { if (active) setReady(true) })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      window.setTimeout(() => { void loadAccount(session?.user.id) }, 0)
    })
    return () => { active = false; subscription.unsubscribe() }
  }, [])

  const isRoleArea = /^\/(couple|planner|vendor)(\/|$)/.test(pathname)
    || pathname === '/profile/setup'
    || /^\/profile\/[^/]+$/.test(pathname)
  // The couple landing page already renders its own account controls.
  // Do not let a stale Supabase role reveal a second bar over that header.
  const isCoupleHomeWithAccountControls = pathname === '/couple'
  const isOwnProfile = Boolean(account && account.profilePath !== '/profile/setup' && pathname === account.profilePath)
  const isPlannerOrVendorMessages = (account?.role === 'planner' || account?.role === 'vendor')
    && /^\/(planner|vendor)\/messages$/.test(pathname)
  if (!ready || !account || !isRoleArea || pathname.startsWith('/auth')
    || isCoupleHomeWithAccountControls || isOwnProfile || isPlannerOrVendorMessages) return null

  const paths = rolePaths[account.role]
  return (
    <header className={`account-topbar account-topbar-${account.role}`}>
      <Link className="account-topbar-brand" href={paths.home}>A Lovers Card</Link>
      <nav className="account-topbar-actions" aria-label="Your account">
        <Link href={paths.messages} aria-label="Messages"><MessageCircle size={18} /><span>Messages</span></Link>
        <Link href={account.profilePath} aria-label="Your profile"><UserRound size={18} /><span>Profile</span></Link>
      </nav>
    </header>
  )
}
