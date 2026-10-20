import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // Get user role and redirect appropriately
      const { data: { user } } = await supabase.auth.getUser()
      const role = user?.user_metadata?.role

      if (role === 'planner') {
        return NextResponse.redirect(`${origin}/planner/leads`)
      } else if (role === 'couple') {
        return NextResponse.redirect(`${origin}/couple/start`)
      } else if (role === 'vendor') {
        return NextResponse.redirect(`${origin}/vendor/dashboard`)
      }
      
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
