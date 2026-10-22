'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { MOCK_VENDORS, formatPrice } from '@/lib/mock/vendors';
import { useCartStore } from '@/lib/store/cartStore';

export default function VendorDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { addItem } = useCartStore();
  const [showContactModal, setShowContactModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);

  const vendor = MOCK_VENDORS.find((v) => v.id === params.id);

  if (!vendor) {
    return (
      <div className="min-h-screen bg-[#1E4636] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[#E2B451] text-xl mb-4">Vendor not found</p>
          <button onClick={() => router.push('/couple/vendors')} className="btn-primary">
            Back to vendors
          </button>
        </div>
      </div>
    );
  }

  const handleContactVendor = () => {
    // Add to cart as inquiry
    addItem({
      id: vendor.id,
      imageUrl: vendor.image,
      theme: 'vendor inquiry',
      prompt: vendor.name,
      addedAt: new Date().toISOString(),
    });
    setShowContactModal(true);
  };

  return (
    <div className="min-h-screen bg-[#1E4636]">
      {/* Header */}
      <div className="bg-[#E2B451] border-b-4 border-[#F08A3C] px-6 py-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="text-[#1E4636] hover:text-[#1E4636]/70 font-semibold flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to vendors
          </button>
          <button onClick={() => router.push('/couple/cart')} className="btn-secondary">
            View cart
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          {/* Left: Images */}
          <div>
            <div className="mb-4">
              <img
                src={vendor.portfolioImages[selectedImage]}
                alt={vendor.name}
                className="w-full h-96 object-cover rounded-lg"
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              {vendor.portfolioImages.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(idx)}
                  className={`rounded-lg overflow-hidden border-2 transition-all ${
                    selectedImage === idx ? 'border-[#F08A3C]' : 'border-transparent'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-24 object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Right: Details */}
          <div>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-4xl font-bold text-[#E2B451] mb-2">{vendor.name}</h1>
                <p className="text-[#E2B451]/70 flex items-center gap-2">
                  📍 {vendor.location}
                </p>
              </div>
              <span
                className={`px-3 py-1 rounded-lg text-sm font-semibold ${
                  vendor.availability === 'available'
                    ? 'bg-[#1E4636] text-[#E2B451]'
                    : vendor.availability === 'limited'
                    ? 'bg-[#F08A3C] text-[#1E4636]'
                    : 'bg-[#3A2563] text-[#E2B451]'
                }`}
              >
                {vendor.availability === 'available' && 'Available'}
                {vendor.availability === 'limited' && 'Limited slots'}
                {vendor.availability === 'booked' && 'Fully booked'}
              </span>
            </div>

            <div className="flex items-center gap-4 mb-6">
              <div className="flex items-center gap-2">
                <span className="text-[#F08A3C] text-2xl font-bold">
                  {vendor.rating.toFixed(1)} ★
                </span>
                <span className="text-[#E2B451]/60">({vendor.reviewCount} reviews)</span>
              </div>
            </div>

            <div className="bg-[#E2B451]/10 rounded-lg p-6 mb-6">
              <p className="text-[#E2B451]/60 text-sm mb-1">Starting from</p>
              <p className="text-[#F08A3C] text-3xl font-bold">{formatPrice(vendor.startingPrice)}</p>
              <p className="text-[#E2B451]/50 text-sm mt-1">per event</p>
            </div>

            <div className="mb-6">
              <h3 className="text-[#E2B451] font-bold text-xl mb-3">About</h3>
              <p className="text-[#E2B451]/80">{vendor.description}</p>
            </div>

            <div className="mb-6">
              <h3 className="text-[#E2B451] font-bold text-xl mb-3">Services</h3>
              <ul className="space-y-2">
                {vendor.services.map((service, idx) => (
                  <li key={idx} className="flex items-start text-[#E2B451]">
                    <span className="mr-2">✓</span>
                    <span>{service}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mb-6">
              <h3 className="text-[#E2B451] font-bold text-xl mb-3">Specialties</h3>
              <div className="flex flex-wrap gap-2">
                {vendor.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-[#1E4636]/50 text-[#E2B451] rounded-lg"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <button
              onClick={handleContactVendor}
              disabled={vendor.availability === 'booked'}
              className="btn-primary w-full"
            >
              {vendor.availability === 'booked' ? 'Fully booked' : 'Contact vendor'}
            </button>
          </div>
        </div>
      </div>

      {/* Contact Modal */}
      {showContactModal && (
        <div className="fixed inset-0 bg-[#1E4636]/70 flex items-center justify-center p-6 z-50">
          <div className="bg-[#1E4636] border-4 border-[#E2B451] rounded-lg max-w-md w-full p-8">
            <h2 className="text-2xl font-bold text-[#E2B451] mb-4">Inquiry sent!</h2>
            <p className="text-[#E2B451]/80 mb-6">
              Your inquiry has been added to your cart. Complete your wedding profile to send
              inquiries to all selected vendors at once.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowContactModal(false)} className="btn-secondary flex-1">
                Continue browsing
              </button>
              <button onClick={() => router.push('/couple/cart')} className="btn-primary flex-1">
                View cart
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
