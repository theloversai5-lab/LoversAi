import type { UserRole } from '@/lib/supabase/client'

const LOCAL_ORIGIN = 'https://aloverscard.invalid'

export function roleRedirectPath(role: UserRole, candidate?: string | null) {
  const fallback = role === 'couple' ? '/couple' : `/${role}/profile`
  if (!candidate || !candidate.startsWith('/') || candidate.startsWith('//') || candidate.includes('\\')) return fallback

  try {
    const target = new URL(candidate, LOCAL_ORIGIN)
    if (target.origin !== LOCAL_ORIGIN) return fallback
    const pathAllowed = target.pathname === `/${role}` || target.pathname.startsWith(`/${role}/`)
      || (role === 'vendor' && (target.pathname === '/planner/leads' || target.pathname.startsWith('/planner/leads/')))
    if (!pathAllowed) return fallback
    return `${target.pathname}${target.search}${target.hash}`
  } catch {
    return fallback
  }
}
