// lib/mock/leads.ts
export interface MockLead {
  id: string
  coupleName: string
  budget: string
  city: string
  tradition: string
  weddingDate: string
  guestCount: number
  venue?: string
  notes: string
  images: string[]
  status: 'pending' | 'quoted' | 'accepted'
  createdAt: string
  isUnlocked?: boolean
}

export const mockLeads: MockLead[] = [
  {
    id: 'lead-1',
    coupleName: 'Priya & Arjun',
    budget: '20-25L',
    city: 'Udaipur',
    tradition: 'Hindu',
    weddingDate: '2026-12-15',
    guestCount: 300,
    venue: 'Heritage Palace Hotel',
    notes: 'Looking for a royal Rajasthani wedding with traditional mandap, elephant entry, and fireworks. Prefer gold and maroon color scheme.',
    images: [
      '/couple.png',
      '/planner.png',
      '/vendor.png'
    ],
    status: 'pending',
    createdAt: '2026-02-10T10:30:00Z',
  },
  {
    id: 'lead-2',
    coupleName: 'Neha & Rahul',
    budget: '15-20L',
    city: 'Goa',
    tradition: 'Christian',
    weddingDate: '2026-11-20',
    guestCount: 150,
    venue: 'Beach Resort',
    notes: 'Intimate beach wedding with sunset ceremony. Modern tropical aesthetic with white and blue theme.',
    images: [],
    status: 'pending',
    createdAt: '2026-02-12T14:20:00Z',
  },
  {
    id: 'lead-3',
    coupleName: 'Anjali & Karan',
    budget: '30-35L',
    city: 'Jaipur',
    tradition: 'Hindu',
    weddingDate: '2027-01-10',
    guestCount: 500,
    venue: 'Amber Fort',
    notes: 'Grand destination wedding at historical venue. Need complete coordination including guest management and logistics.',
    images: [],
    status: 'pending',
    createdAt: '2026-02-15T09:00:00Z',
  },
  {
    id: 'lead-4',
    coupleName: 'Fatima & Ali',
    budget: '10-12L',
    city: 'Hyderabad',
    tradition: 'Muslim',
    weddingDate: '2026-10-25',
    guestCount: 200,
    venue: 'Banquet Hall',
    notes: 'Traditional Nikah ceremony followed by Walima reception. Elegant setup with pastel colors.',
    images: [],
    status: 'pending',
    createdAt: '2026-02-18T16:45:00Z',
  },
  {
    id: 'lead-5',
    coupleName: 'Meera & Vikram',
    budget: '8-10L',
    city: 'Mumbai',
    tradition: 'Hindu',
    weddingDate: '2026-09-30',
    guestCount: 100,
    venue: 'Garden Venue',
    notes: 'Simple, elegant garden wedding. Focus on meaningful moments over grandeur.',
    images: [],
    status: 'pending',
    createdAt: '2026-02-20T11:30:00Z',
  },
]

// Track which leads have been unlocked (mock state)
const unlockedLeadIds = new Set<string>()

export function isLeadUnlocked(leadId: string): boolean {
  return unlockedLeadIds.has(leadId)
}

export function unlockLead(leadId: string): void {
  unlockedLeadIds.add(leadId)
}

export function getLeadById(leadId: string): MockLead | undefined {
  return mockLeads.find(lead => lead.id === leadId)
}
