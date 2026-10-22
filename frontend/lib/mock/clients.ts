export interface Client {
  id: string;
  coupleNames: string;
  weddingDate: string;
  location: string;
  status: 'planning' | 'upcoming' | 'completed';
  progress: number;
  budget: number;
  guestCount: number;
  services: string[];
  nextMilestone: string;
  lastContact: string;
  avatar: string;
}

export const MOCK_CLIENTS: Client[] = [
  {
    id: 'c1',
    coupleNames: 'Neha & Arjun',
    weddingDate: '2026-11-15',
    location: 'Jaipur, Rajasthan',
    status: 'planning',
    progress: 65,
    budget: 4500000,
    guestCount: 400,
    services: ['Full service planning', 'Vendor coordination', 'Day-of management'],
    nextMilestone: 'Venue final walkthrough',
    lastContact: '2 days ago',
    avatar: 'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=200',
  },
  {
    id: 'c2',
    coupleNames: 'Riya & Karthik',
    weddingDate: '2026-12-20',
    location: 'Bangalore, Karnataka',
    status: 'planning',
    progress: 45,
    budget: 3200000,
    guestCount: 250,
    services: ['Partial planning', 'Design & decor'],
    nextMilestone: 'Caterer tasting session',
    lastContact: '5 hours ago',
    avatar: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=200',
  },
  {
    id: 'c3',
    coupleNames: 'Ananya & Vivaan',
    weddingDate: '2027-01-10',
    location: 'Udaipur, Rajasthan',
    status: 'planning',
    progress: 30,
    budget: 5500000,
    guestCount: 500,
    services: ['Full service planning', 'Budget management', 'Timeline coordination'],
    nextMilestone: 'Initial vendor meetings',
    lastContact: '1 day ago',
    avatar: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=200',
  },
];

export const formatBudget = (amount: number): string => {
  return `₹${(amount / 100000).toFixed(1)}L`;
};

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
};

export const getStatusColor = (status: Client['status']): string => {
  switch (status) {
    case 'planning':
      return '#F08A3C';
    case 'upcoming':
      return '#E2B451';
    case 'completed':
      return '#1E4636';
  }
};

export const getStatusLabel = (status: Client['status']): string => {
  switch (status) {
    case 'planning':
      return 'In planning';
    case 'upcoming':
      return 'Upcoming';
    case 'completed':
      return 'Completed';
  }
};
