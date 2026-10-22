import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const role = requestUrl.searchParams.get('role') || 'couple'
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
      // Get role from user metadata or URL param
      const userRole = data.user.user_metadata?.role || role
      
      const redirectPath = userRole === 'planner' 
        ? '/planner/leads' 
        : userRole === 'vendor'
        ? '/vendor/dashboard'
        : '/couple'
      
      return NextResponse.redirect(new URL(redirectPath, requestUrl.origin))
    }
  }

  // No code found
  return NextResponse.redirect(new URL('/auth?error=invalid_link', requestUrl.origin))
}
