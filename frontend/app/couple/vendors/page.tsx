'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MOCK_VENDORS, VENDOR_CATEGORIES, formatPrice, type Vendor } from '@/lib/mock/vendors';

export default function VendorsPage() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredVendors = MOCK_VENDORS.filter((vendor) => {
    const matchesCategory = selectedCategory === 'all' || vendor.category === selectedCategory;
    const matchesSearch = vendor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vendor.location.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getAvailabilityBadge = (availability: Vendor['availability']) => {
    switch (availability) {
      case 'available':
        return <span className="rounded-full bg-[#E2B451]/20 px-2 py-1 text-xs text-[#E2B451]">Available</span>;
      case 'limited':
        return <span className="rounded-full bg-[#F08A3C]/20 px-2 py-1 text-xs text-[#F08A3C]">Limited slots</span>;
      case 'booked':
        return <span className="rounded-full bg-[#3A2563] px-2 py-1 text-xs text-[#E2B451]">Fully booked</span>;
    }
  };

  return (
    <div className="min-h-screen bg-[#1E4636]">
      {/* Header */}
      <div className="bg-[#E2B451] border-b-4 border-[#F08A3C]">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold text-[#1E4636] mb-2">
                Find your vendors
              </h1>
              <p className="text-[#1E4636]/70">
                Browse trusted professionals
              </p>
            </div>
            <button
              onClick={() => router.push('/couple/cart')}
              className="btn-secondary"
            >
              View cart
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search by name or location"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field w-full pl-12"
            />
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#1E4636]/50"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Category Filters */}
        <div className="flex flex-wrap gap-3 mb-8">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              selectedCategory === 'all'
                ? 'bg-[#F08A3C] text-[#1E4636]'
                : 'bg-[#E2B451]/20 text-[#E2B451] hover:bg-[#E2B451]/30'
            }`}
          >
            All vendors
          </button>
          {VENDOR_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-[#F08A3C] text-[#1E4636]'
                  : 'bg-[#E2B451]/20 text-[#E2B451] hover:bg-[#E2B451]/30'
              }`}
            >
              {cat.icon} {cat.label}
            </button>
          ))}
        </div>

        {/* Results Count */}
        <div className="text-[#E2B451] mb-6">
          {filteredVendors.length} {filteredVendors.length === 1 ? 'vendor' : 'vendors'} found
        </div>

        {/* Vendor Grid */}
        {filteredVendors.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-[#E2B451] text-lg mb-4">No vendors found</p>
            <button
              onClick={() => {
                setSelectedCategory('all');
                setSearchQuery('');
              }}
              className="btn-secondary"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVendors.map((vendor) => (
              <div
                key={vendor.id}
                className="bg-[#E2B451]/10 rounded-lg overflow-hidden hover:bg-[#E2B451]/20 transition-colors cursor-pointer"
                onClick={() => router.push(`/couple/vendors/${vendor.id}`)}
              >
                {/* Image */}
                <div className="relative h-48 bg-[#1E4636]/50">
                  <img
                    src={vendor.image}
                    alt={vendor.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 right-3">
                    {getAvailabilityBadge(vendor.availability)}
                  </div>
                </div>

                {/* Content */}
                <div className="p-6">
                  <h3 className="text-xl font-bold text-[#E2B451] mb-2">
                    {vendor.name}
                  </h3>
                  
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[#F08A3C] font-semibold">
                      {vendor.rating.toFixed(1)} ★
                    </span>
                    <span className="text-[#E2B451]/60 text-sm">
                      ({vendor.reviewCount} reviews)
                    </span>
                  </div>

                  <p className="text-[#E2B451]/70 text-sm mb-4">
                    📍 {vendor.location}
                  </p>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {vendor.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-1 bg-[#1E4636]/50 text-[#E2B451] text-xs rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-[#E2B451]/20">
                    <div>
                      <p className="text-[#E2B451]/60 text-xs">Starting from</p>
                      <p className="text-[#F08A3C] font-bold text-lg">
                        {formatPrice(vendor.startingPrice)}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/couple/vendors/${vendor.id}`);
                      }}
                      className="btn-primary text-sm"
                    >
                      View details
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Back Button */}
        <div className="mt-12 text-center">
          <button
            onClick={() => router.back()}
            className="text-[#E2B451]/70 hover:text-[#E2B451] transition-colors"
          >
            ← Go back
          </button>
        </div>
      </div>
    </div>
  );
}
