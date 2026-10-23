import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { roleRedirectPath } from '@/lib/auth/redirect'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
        },
      },
    },
  )

  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname
  const bypassCookie = process.env.NODE_ENV !== 'production' && request.cookies.get('bypass_auth')
  const protectedPaths = ['/couple/onboarding', '/couple/moodboard', '/couple/vision', '/couple/request', '/couple/requests', '/couple/cart', '/couple/messages', '/couple/vendors', '/couple/decide', '/planner/leads', '/planner/clients', '/planner/messages', '/planner/profile', '/vendor/messages', '/vendor/profile', '/vendor/portfolio', '/vendor/inquiries', '/profile/setup']
  const isProtectedPath = protectedPaths.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))

  let profile: { role: 'couple' | 'planner' | 'vendor'; is_complete: boolean } | null = null
  if (user) {
    const { data } = await supabase.from('profiles').select('role,is_complete').eq('id', user.id).maybeSingle()
    profile = data
  }

  const isPlannerLeadsPath = path === '/planner/leads' || path.startsWith('/planner/leads/')
  if (isProtectedPath && !user && (!bypassCookie || isPlannerLeadsPath)) {
    const queryRole = request.nextUrl.searchParams.get('role')
    const requestedRole = queryRole === 'vendor' ? 'vendor' : path.startsWith('/couple') ? 'couple' : path.startsWith('/vendor') ? 'vendor' : 'planner'
    const url = request.nextUrl.clone()
    url.pathname = '/auth'
    url.searchParams.set('role', requestedRole)
    url.searchParams.set('next', `${path}${request.nextUrl.search}`)
    return NextResponse.redirect(url)
  }

  if (user && profile && isProtectedPath && path !== '/profile/setup') {
    const allowed = path.startsWith('/couple/') ? profile.role === 'couple'
      : path.startsWith('/vendor/') ? profile.role === 'vendor'
        : path === '/planner/leads' || path.startsWith('/planner/leads/') ? profile.role === 'planner' || profile.role === 'vendor'
          : path.startsWith('/planner/') ? profile.role === 'planner'
            : true
    if (!allowed) {
      const url = request.nextUrl.clone()
      url.pathname = `/${profile.role}`
      url.search = ''
      return NextResponse.redirect(url)
    }
  }

  if (user && isProtectedPath && path !== '/profile/setup' && profile && !profile.is_complete) {
    const url = request.nextUrl.clone()
    url.pathname = '/profile/setup'
    const next = roleRedirectPath(profile.role, `${path}${request.nextUrl.search}`)
    url.search = `?next=${encodeURIComponent(next)}`
    return NextResponse.redirect(url)
  }

  if (user && path === '/profile/setup' && profile?.is_complete) {
    const url = request.nextUrl.clone()
    const next = roleRedirectPath(profile.role, request.nextUrl.searchParams.get('next'))
    const destination = new URL(next, request.nextUrl.origin)
    url.pathname = destination.pathname
    url.search = destination.search
    url.hash = destination.hash
    return NextResponse.redirect(url)
  }

  if (path === '/auth' && user) {
    const requestedRole = request.nextUrl.searchParams.get('role')
    const role = profile?.role ?? (requestedRole === 'planner' || requestedRole === 'vendor' || requestedRole === 'couple' ? requestedRole : null)
    const url = request.nextUrl.clone()
    const next = role ? roleRedirectPath(role, request.nextUrl.searchParams.get('next')) : '/couple'
    const completePath = new URL(next, request.nextUrl.origin)
    url.pathname = user && (!profile || !profile.is_complete) ? '/profile/setup' : completePath.pathname
    url.search = user && (!profile || !profile.is_complete)
      ? (request.nextUrl.searchParams.has('next') ? `?next=${encodeURIComponent(request.nextUrl.searchParams.get('next') ?? '')}` : '')
      : completePath.search
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
