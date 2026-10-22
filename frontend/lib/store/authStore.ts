// lib/store/authStore.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UserRole, UserProfile } from '../supabase/client'

interface AuthState {
  user: UserProfile | null
  role: UserRole | null
  isLoading: boolean
  setUser: (user: UserProfile | null) => void
  setRole: (role: UserRole | null) => void
  setLoading: (loading: boolean) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      role: null,
      isLoading: true,
      setUser: (user) => set({ user }),
      setRole: (role) => set({ role }),
      setLoading: (isLoading) => set({ isLoading }),
      clearAuth: () => set({ user: null, role: null }),
    }),
    {
      name: 'auth-storage',
    }
  )
)
