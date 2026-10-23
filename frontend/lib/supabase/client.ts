// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)

export type UserRole = 'couple' | 'planner' | 'vendor'

export interface UserProfile {
  id: string
  email: string
  role: UserRole
  full_name?: string
  handle?: string
  created_at: string
}
