import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const error_description = requestUrl.searchParams.get('error_description')

  // Handle errors from OAuth or email confirmation
  if (error_description) {
    console.error('Auth callback error:', error_description)
    return NextResponse.redirect(new URL('/auth?error=auth_failed', requestUrl.origin))
  }

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      console.error('Code exchange error:', error)
      return NextResponse.redirect(new URL('/auth?error=confirmation_failed', requestUrl.origin))
    }

    if (data.user) {
      const { data: profile } = await supabase.from('profiles').select('role,is_complete').eq('id', data.user.id).maybeSingle()
      const redirectPath = !profile || !profile.is_complete ? '/profile/setup' : `/${profile.role}`
      return NextResponse.redirect(new URL(redirectPath, requestUrl.origin))
    }
  }

  // No code found
  return NextResponse.redirect(new URL('/auth?error=invalid_link', requestUrl.origin))
}
