'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCoupleStore } from '@/lib/store/coupleStore';

export default function RequestPlannerPage() {
  const router = useRouter();
  const weddingProfile = useCoupleStore((state) => state.weddingProfile);
  const [formData, setFormData] = useState({
    services: [] as string[],
    priorities: [] as string[],
    additionalInfo: '',
  });
  const [submitted, setSubmitted] = useState(false);

  const serviceOptions = [
    { id: 'full', label: 'Full service planning', desc: 'End to end planning' },
    { id: 'partial', label: 'Partial planning', desc: 'Selected services only' },
    { id: 'coordination', label: 'Day coordination', desc: 'Manage the wedding day' },
    { id: 'design', label: 'Design & decor', desc: 'Visual concept only' },
  ];

  const priorityOptions = [
    { id: 'budget', label: 'Budget management', icon: '💰' },
    { id: 'vendor', label: 'Vendor selection', icon: '🤝' },
    { id: 'timeline', label: 'Timeline planning', icon: '📅' },
    { id: 'design', label: 'Creative design', icon: '🎨' },
    { id: 'stress', label: 'Stress-free process', icon: '😌' },
  ];

  const toggleService = (id: string) => {
    setFormData({
      ...formData,
      services: formData.services.includes(id)
        ? formData.services.filter((s) => s !== id)
        : [...formData.services, id],
    });
  };

  const togglePriority = (id: string) => {
    setFormData({
      ...formData,
      priorities: formData.priorities.includes(id)
        ? formData.priorities.filter((p) => p !== id)
        : [...formData.priorities, id],
    });
  };

  const handleSubmit = () => {
    // Mock submission - in real app would create planner request
    setSubmitted(true);
    setTimeout(() => {
      router.push('/couple/cart');
    }, 3000);
  };

  const isValid = formData.services.length > 0 && formData.priorities.length > 0;

  return (
    <div className="min-h-screen bg-[#1E4636]">
      {/* Header */}
      <div className="bg-[#E2B451] border-b-4 border-[#3A2563] px-6 py-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold text-[#1E4636] mb-2">Request planner</h1>
          <p className="text-[#1E4636]/70">Tell us what you need</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8">
        {!submitted ? (
          <>
            {/* Wedding Summary */}
            <div className="bg-[#E2B451]/10 rounded-lg p-6 mb-8">
              <h2 className="text-xl font-bold text-[#E2B451] mb-4">Your wedding</h2>
              <div className="grid grid-cols-2 gap-4 text-[#E2B451]">
                <div>
                  <p className="text-[#E2B451]/60 text-sm">Date</p>
                  <p className="font-semibold">{weddingProfile?.weddingDate || 'Not set'}</p>
                </div>
                <div>
                  <p className="text-[#E2B451]/60 text-sm">Location</p>
                  <p className="font-semibold">{weddingProfile?.city || 'Not set'}</p>
                </div>
                <div>
                  <p className="text-[#E2B451]/60 text-sm">Guest count</p>
                  <p className="font-semibold">{weddingProfile?.guestCount || 'Not set'}</p>
                </div>
                <div>
                  <p className="text-[#E2B451]/60 text-sm">Budget</p>
                  <p className="font-semibold">{weddingProfile?.budget ? `₹${weddingProfile.budget}` : 'Not set'}</p>
                </div>
              </div>
            </div>

            {/* Services Needed */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-[#E2B451] mb-2">Services needed</h2>
              <p className="text-[#E2B451]/60 mb-4 text-sm">Select all that apply</p>
              <div className="grid gap-3">
                {serviceOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => toggleService(option.id)}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      formData.services.includes(option.id)
                        ? 'border-[#F08A3C] bg-[#F08A3C]/10'
                        : 'border-[#E2B451]/20 bg-[#E2B451]/5 hover:border-[#E2B451]/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-[#E2B451]">{option.label}</p>
                        <p className="text-[#E2B451]/60 text-sm">{option.desc}</p>
                      </div>
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                          formData.services.includes(option.id)
                            ? 'border-[#F08A3C] bg-[#F08A3C]'
                            : 'border-[#E2B451]/40'
                        }`}
                      >
                        {formData.services.includes(option.id) && (
                          <svg className="w-3 h-3 text-[#1E4636]" viewBox="0 0 12 12" fill="currentColor">
                            <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" fill="none" />
                          </svg>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Priorities */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-[#E2B451] mb-2">Your priorities</h2>
              <p className="text-[#E2B451]/60 mb-4 text-sm">What matters most?</p>
              <div className="grid grid-cols-2 gap-3">
                {priorityOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => togglePriority(option.id)}
                    className={`p-4 rounded-lg border-2 text-center transition-all ${
                      formData.priorities.includes(option.id)
                        ? 'border-[#F08A3C] bg-[#F08A3C]/10'
                        : 'border-[#E2B451]/20 bg-[#E2B451]/5 hover:border-[#E2B451]/40'
                    }`}
                  >
                    <div className="text-3xl mb-2">{option.icon}</div>
                    <p className="font-semibold text-[#E2B451] text-sm">{option.label}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Additional Info */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-[#E2B451] mb-2">Anything else?</h2>
              <p className="text-[#E2B451]/60 mb-4 text-sm">Optional details</p>
              <textarea
                value={formData.additionalInfo}
                onChange={(e) => setFormData({ ...formData, additionalInfo: e.target.value })}
                placeholder="Share any specific requirements or preferences"
                className="input-field w-full h-32 resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-4">
              <button onClick={() => router.back()} className="btn-secondary flex-1">
                Go back
              </button>
              <button
                onClick={handleSubmit}
                disabled={!isValid}
                className="btn-primary flex-1"
              >
                Send request
              </button>
            </div>
          </>
        ) : (
          <div className="text-center py-16">
            <div className="mb-6">
              <div className="w-20 h-20 bg-[#F08A3C] rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-[#1E4636]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-[#E2B451] mb-2">Request sent!</h2>
              <p className="text-[#E2B451]/80">
                Local planners will review
                <br />
                your wedding details
              </p>
            </div>
            <div className="text-[#E2B451]/60 text-sm">
              Redirecting to your cart...
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
