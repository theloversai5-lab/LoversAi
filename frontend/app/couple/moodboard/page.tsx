'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCartStore } from '@/lib/store/cartStore'
import { generateMockImages, weddingThemes } from '@/lib/mock/themes'
import { ShoppingCart, Heart, ArrowRight, Check } from 'lucide-react'

export default function MoodboardPage() {
  const router = useRouter()
  const { items, addItem, hasItem } = useCartStore()
  const [images] = useState(() => {
    // Generate a full set of moodboard images
    const allImages = weddingThemes.flatMap(theme => 
      generateMockImages(theme.id, theme.description)
    )
    return allImages
  })

  const handleAddToCart = (image: typeof images[0]) => {
    if (!hasItem(image.id)) {
      addItem({
        id: image.id,
        imageUrl: image.url,
        theme: image.theme,
        prompt: image.prompt,
        addedAt: new Date().toISOString(),
      })
    }
  }

  return (
    <div className="min-h-screen couple-theme" style={{
      background: '#1E4636'
    }}>
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-primary mb-2">
              Your wedding moodboard
            </h1>
            <p className="text-secondary">
              Select images that capture your vision
            </p>
          </div>
          <button
            onClick={() => router.push('/couple/cart')}
            className="btn btn-primary-couple"
          >
            <ShoppingCart size={20} />
            <span>Cart ({items.length})</span>
          </button>
        </div>

        {/* Image Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
          {images.map((image) => {
            const inCart = hasItem(image.id)
            
            return (
              <div
                key={image.id}
                className="group relative aspect-square bg-[#3A2563]/30 rounded-lg overflow-hidden"
              >
                <img
                  src={image.url}
                  alt="Moodboard inspiration"
                  className="w-full h-full object-cover"
                />
                
                {/* Overlay */}
                <div className="absolute inset-0 bg-[#1E4636]/0 group-hover:bg-[#1E4636]/50 transition-all duration-200">
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    {inCart ? (
                      <div className="flex items-center gap-2 px-4 py-2 bg-[#E2B451] text-[#1E4636] rounded-full">
                        <Check size={16} />
                        <span className="text-sm font-medium text-[#1E4636]">In Cart</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleAddToCart(image)}
                        className="flex items-center gap-2 px-4 py-2 bg-[#E2B451] text-[#1E4636] rounded-full hover:bg-[#F08A3C] transition-colors"
                      >
                        <Heart size={16} />
                        <span className="text-sm font-medium">Add to Cart</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Cart indicator */}
                {inCart && (
                  <div className="absolute top-2 right-2 w-8 h-8 bg-gold rounded-full flex items-center justify-center">
                    <Check size={16} className="text-green" />
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Continue button */}
        {items.length > 0 && (
          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-primary mb-1">
                  {items.length} {items.length === 1 ? 'image' : 'images'} selected
                </h3>
                <p className="text-sm text-secondary">
                  Review your selections and continue planning
                </p>
              </div>
              <button
                onClick={() => router.push('/couple/cart')}
                className="btn btn-primary-couple"
              >
                <span>Review Cart</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
