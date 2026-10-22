// lib/store/coupleStore.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface WeddingProfile {
  partner1Name: string
  partner2Name: string
  weddingDate: string
  budget: string
  guestCount: number
  city: string
  venue: string
  tradition: string
  notes: string
  completed: boolean
}

interface CoupleState {
  weddingProfile: WeddingProfile | null
  setWeddingProfile: (profile: WeddingProfile) => void
  updateWeddingProfile: (updates: Partial<WeddingProfile>) => void
  clearWeddingProfile: () => void
}

export const useCoupleStore = create<CoupleState>()(
  persist(
    (set) => ({
      weddingProfile: null,
      setWeddingProfile: (profile) => set({ weddingProfile: profile }),
      updateWeddingProfile: (updates) =>
        set((state) => ({
          weddingProfile: state.weddingProfile
            ? { ...state.weddingProfile, ...updates }
            : null,
        })),
      clearWeddingProfile: () => set({ weddingProfile: null }),
    }),
    {
      name: 'couple-storage',
    }
  )
)
