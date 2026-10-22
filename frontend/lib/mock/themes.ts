// lib/mock/themes.ts
export interface WeddingTheme {
  id: string
  name: string
  description: string
  image: string
  tags: string[]
}

export const weddingThemes: WeddingTheme[] = [
  {
    id: 'royal-traditional',
    name: 'Royal Traditional',
    description: 'Grand heritage aesthetics with golden mandaps and marigold decor',
    image: '/couple.png',
    tags: ['Traditional', 'Grand', 'Heritage'],
  },
  {
    id: 'modern-minimalist',
    name: 'Modern Minimalist',
    description: 'Clean lines, white spaces, and contemporary elegance',
    image: '/planner.png',
    tags: ['Modern', 'Minimalist', 'Contemporary'],
  },
  {
    id: 'beach-destination',
    name: 'Beach Destination',
    description: 'Tropical paradise with ocean views and sunset ceremonies',
    image: '/vendor.png',
    tags: ['Beach', 'Destination', 'Tropical'],
  },
  {
    id: 'garden-romantic',
    name: 'Garden Romantic',
    description: 'Lush greenery, floral arches, and fairy lights',
    image: '/couple.png',
    tags: ['Garden', 'Romantic', 'Outdoor'],
  },
  {
    id: 'palace-luxury',
    name: 'Palace Luxury',
    description: 'Rajasthani opulence with intricate details and rich colors',
    image: '/planner.png',
    tags: ['Luxury', 'Palace', 'Opulent'],
  },
  {
    id: 'bohemian-chic',
    name: 'Bohemian Chic',
    description: 'Free-spirited vibe with dreamcatchers and earthy tones',
    image: '/vendor.png',
    tags: ['Bohemian', 'Chic', 'Relaxed'],
  },
]

export interface GeneratedImage {
  id: string
  url: string
  theme: string
  prompt: string
  createdAt: string
}

// Mock function to simulate AI image generation
export function generateMockImages(theme: string, prompt: string): GeneratedImage[] {
  const mockImages = [
    '/couple.png',
    '/planner.png',
    '/vendor.png',
    '/couple.png',
  ]

  return mockImages.map((url, index) => ({
    id: `${theme}-${Date.now()}-${index}`,
    url,
    theme,
    prompt,
    createdAt: new Date().toISOString(),
  }))
}
