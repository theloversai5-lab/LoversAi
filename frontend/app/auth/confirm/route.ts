import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  
  // Supabase sends these parameters
  const token_hash = requestUrl.searchParams.get('token_hash')
  const type = requestUrl.searchParams.get('type')
  
  // Also check for legacy format
  const access_token = requestUrl.searchParams.get('access_token')
  const refresh_token = requestUrl.searchParams.get('refresh_token')

  const supabase = await createClient()

  // Handle token_hash (PKCE flow)
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type: type as any,
      token_hash,
    })

    if (error) {
      console.error('OTP verification error:', error)
      return NextResponse.redirect(new URL('/auth?error=confirmation_failed', requestUrl.origin))
    }
  } 
  // Handle legacy access_token format
  else if (access_token && refresh_token) {
    const { error } = await supabase.auth.setSession({
      access_token,
      refresh_token,
    })

    if (error) {
      console.error('Session set error:', error)
      return NextResponse.redirect(new URL('/auth?error=confirmation_failed', requestUrl.origin))
    }
  } else {
    // No valid tokens found
    return NextResponse.redirect(new URL('/auth?error=invalid_link', requestUrl.origin))
  }

  // Get user to determine redirect
  const { data: { user } } = await supabase.auth.getUser()
  
  if (user) {
    const { data: profile } = await supabase.from('profiles').select('role,is_complete').eq('id', user.id).maybeSingle()
    const redirectPath = !profile || !profile.is_complete ? '/profile/setup' : `/${profile.role}`
    
    return NextResponse.redirect(new URL(redirectPath, requestUrl.origin))
  }

  // Fallback error
  return NextResponse.redirect(new URL('/auth?error=confirmation_failed', requestUrl.origin))
}
