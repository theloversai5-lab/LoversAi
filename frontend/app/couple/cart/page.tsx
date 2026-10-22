'use client'

import { useRouter } from 'next/navigation'
import { useCartStore } from '@/lib/store/cartStore'
import { useCoupleStore } from '@/lib/store/coupleStore'
import { Trash2, ArrowRight, ShoppingBag } from 'lucide-react'

export default function CartPage() {
  const router = useRouter()
  const { items, removeItem } = useCartStore()
  const { weddingProfile } = useCoupleStore()

  const handleContinue = () => {
    router.push('/couple/decide')
  }

  return (
    <div className="min-h-screen couple-theme" style={{
      background: '#1E4636'
    }}>
      <div className="max-w-5xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gold/10 rounded-full mb-4">
            <ShoppingBag size={40} className="text-gold" />
          </div>
          <h1 className="text-4xl font-bold text-primary mb-4">
            Your wedding vision
          </h1>
          <p className="text-lg text-secondary">
            {items.length} {items.length === 1 ? 'image' : 'images'} selected
          </p>
        </div>

        {items.length === 0 ? (
          <div className="card p-12 text-center">
            <p className="text-secondary mb-6">
              Your cart is empty. Add some inspiration to continue.
            </p>
            <button
              onClick={() => router.push('/couple/moodboard')}
              className="btn btn-primary-couple"
            >
              Browse Moodboards
            </button>
          </div>
        ) : (
          <>
            {/* Cart Items */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="card p-0 overflow-hidden group"
                >
                  <div className="aspect-square bg-[#3A2563]/30 relative">
                    <img
                      src={item.imageUrl}
                      alt="Selected inspiration"
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() => removeItem(item.id)}
                      className="absolute top-2 right-2 w-8 h-8 bg-[#F08A3C] text-[#1E4636] rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="p-3">
                    <p className="text-xs text-secondary capitalize">{item.theme.replace('-', ' ')}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Wedding Summary */}
            <div className="card p-6 mb-8">
              <h2 className="text-xl font-bold text-primary mb-4">Wedding Details</h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-secondary">Couple:</span>
                  <p className="text-primary font-medium">
                    {weddingProfile ? `${weddingProfile.partner1Name} & ${weddingProfile.partner2Name}` : 'Not set'}
                  </p>
                </div>
                <div>
                  <span className="text-secondary">Date:</span>
                  <p className="text-primary font-medium">
                    {weddingProfile?.weddingDate ? new Date(weddingProfile.weddingDate).toLocaleDateString('en-IN', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    }) : 'Not set'}
                  </p>
                </div>
                <div>
                  <span className="text-secondary">Location:</span>
                  <p className="text-primary font-medium">{weddingProfile?.city || 'Not set'}</p>
                </div>
                <div>
                  <span className="text-secondary">Guests:</span>
                  <p className="text-primary font-medium">{weddingProfile?.guestCount || 'Not set'}</p>
                </div>
                <div>
                  <span className="text-secondary">Budget:</span>
                  <p className="text-primary font-medium">{weddingProfile?.budget ? `₹${weddingProfile.budget}` : 'Not set'}</p>
                </div>
                <div>
                  <span className="text-secondary">Style:</span>
                  <p className="text-primary font-medium">{weddingProfile?.tradition || 'Not set'}</p>
                </div>
              </div>
            </div>

            {/* Continue Button */}
            <div className="flex justify-center">
              <button
                onClick={handleContinue}
                className="btn btn-primary-couple px-8 py-4 text-lg"
              >
                <span>Continue Planning</span>
                <ArrowRight size={20} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
