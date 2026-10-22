export interface Vendor {
  id: string;
  name: string;
  category: 'photographer' | 'venue' | 'caterer' | 'decorator' | 'makeup' | 'music';
  location: string;
  rating: number;
  reviewCount: number;
  startingPrice: number;
  image: string;
  tags: string[];
  portfolioImages: string[];
  description: string;
  services: string[];
  availability: 'available' | 'limited' | 'booked';
}

export const VENDOR_CATEGORIES = [
  { id: 'photographer', label: 'Photographer', icon: '📸' },
  { id: 'venue', label: 'Venue', icon: '🏛️' },
  { id: 'caterer', label: 'Caterer', icon: '🍽️' },
  { id: 'decorator', label: 'Decorator', icon: '🎨' },
  { id: 'makeup', label: 'Makeup Artist', icon: '💄' },
  { id: 'music', label: 'Music & DJ', icon: '🎵' },
];

export const MOCK_VENDORS: Vendor[] = [
  {
    id: 'v1',
    name: 'Eternal Frames Studio',
    category: 'photographer',
    location: 'Mumbai, Maharashtra',
    rating: 4.9,
    reviewCount: 127,
    startingPrice: 75000,
    image: 'https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=400',
    tags: ['Candid', 'Cinematic', 'Drone'],
    portfolioImages: [
      'https://images.unsplash.com/photo-1519741497674-611481863552?w=600',
      'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=600',
      'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=600',
    ],
    description: 'Award winning wedding photography with cinematic storytelling',
    services: ['Full day coverage', 'Pre-wedding shoot', 'Drone videography', 'Photo album'],
    availability: 'available',
  },
  {
    id: 'v2',
    name: 'Royal Palace Gardens',
    category: 'venue',
    location: 'Jaipur, Rajasthan',
    rating: 4.8,
    reviewCount: 89,
    startingPrice: 500000,
    image: 'https://images.unsplash.com/photo-1519167758481-83f29da8d3d0?w=400',
    tags: ['Heritage', 'Outdoor', 'Palace'],
    portfolioImages: [
      'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=600',
      'https://images.unsplash.com/photo-1478146896981-b80fe463b330?w=600',
      'https://images.unsplash.com/photo-1505236858219-8359eb29e329?w=600',
    ],
    description: 'Majestic heritage venue with royal architecture and gardens',
    services: ['Guest capacity 500+', 'Accommodation', 'Parking', 'In-house catering'],
    availability: 'limited',
  },
  {
    id: 'v3',
    name: 'Spice Route Catering',
    category: 'caterer',
    location: 'Delhi NCR',
    rating: 4.7,
    reviewCount: 203,
    startingPrice: 1200,
    image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400',
    tags: ['Multi-cuisine', 'Live counters', 'Veg & Non-veg'],
    portfolioImages: [
      'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600',
      'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600',
      'https://images.unsplash.com/photo-1529042410759-befb1204b468?w=600',
    ],
    description: 'Premium catering with diverse menu options and live food stations',
    services: ['Buffet setup', 'Live counters', 'Welcome drinks', 'Dessert bar'],
    availability: 'available',
  },
  {
    id: 'v4',
    name: 'Floral Dreams Decor',
    category: 'decorator',
    location: 'Bangalore, Karnataka',
    rating: 4.9,
    reviewCount: 156,
    startingPrice: 150000,
    image: 'https://images.unsplash.com/photo-1510076857177-7470076d4098?w=400',
    tags: ['Floral', 'Stage design', 'Lighting'],
    portfolioImages: [
      'https://images.unsplash.com/photo-1478146896981-b80fe463b330?w=600',
      'https://images.unsplash.com/photo-1519167758481-83f29da8d3d0?w=600',
      'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=600',
    ],
    description: 'Luxury floral arrangements and stage decoration specialists',
    services: ['Stage decoration', 'Entry arch', 'Table centerpieces', 'Lighting design'],
    availability: 'available',
  },
  {
    id: 'v5',
    name: 'Glam Studio by Priya',
    category: 'makeup',
    location: 'Chennai, Tamil Nadu',
    rating: 5.0,
    reviewCount: 94,
    startingPrice: 35000,
    image: 'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=400',
    tags: ['Bridal makeup', 'Airbrush', 'Hairstyling'],
    portfolioImages: [
      'https://images.unsplash.com/photo-1522337660859-02fbefca4702?w=600',
      'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=600',
      'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=600',
    ],
    description: 'Professional bridal makeup artist specializing in traditional and modern looks',
    services: ['Bridal makeup', 'Hairstyling', 'Saree draping', 'Touch-up service'],
    availability: 'limited',
  },
  {
    id: 'v6',
    name: 'Rhythm & Beats Entertainment',
    category: 'music',
    location: 'Goa',
    rating: 4.8,
    reviewCount: 112,
    startingPrice: 50000,
    image: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=400',
    tags: ['DJ', 'Live band', 'Sound system'],
    portfolioImages: [
      'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600',
      'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600',
      'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=600',
    ],
    description: 'Professional DJ and live music services for unforgettable celebrations',
    services: ['DJ service', 'Live band', 'Sound & lighting', 'Playlist customization'],
    availability: 'available',
  },
  {
    id: 'v7',
    name: 'Timeless Captures',
    category: 'photographer',
    location: 'Udaipur, Rajasthan',
    rating: 4.7,
    reviewCount: 78,
    startingPrice: 60000,
    image: 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=400',
    tags: ['Traditional', 'Portrait', 'Destination'],
    portfolioImages: [
      'https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=600',
      'https://images.unsplash.com/photo-1606800052052-c7d53c75e140?w=600',
      'https://images.unsplash.com/photo-1591604466107-ec97de577aff?w=600',
    ],
    description: 'Destination wedding specialists capturing authentic moments',
    services: ['Destination coverage', 'Traditional photography', 'Albums', 'Digital files'],
    availability: 'available',
  },
  {
    id: 'v8',
    name: 'The Grand Ballroom',
    category: 'venue',
    location: 'Hyderabad, Telangana',
    rating: 4.6,
    reviewCount: 65,
    startingPrice: 300000,
    image: 'https://images.unsplash.com/photo-1519167758481-83f29da8d3d0?w=400',
    tags: ['Indoor', 'AC halls', 'Urban'],
    portfolioImages: [
      'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=600',
      'https://images.unsplash.com/photo-1505236858219-8359eb29e329?w=600',
      'https://images.unsplash.com/photo-1478146896981-b80fe463b330?w=600',
    ],
    description: 'Modern banquet hall with state-of-the-art facilities in city center',
    services: ['AC halls', 'Guest rooms', 'Valet parking', 'In-house catering'],
    availability: 'available',
  },
];

export const formatPrice = (price: number): string => {
  if (price >= 100000) {
    return `₹${(price / 100000).toFixed(1)}L`;
  }
  return `₹${(price / 1000).toFixed(0)}K`;
};
