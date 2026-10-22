'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function PlannerProfilePage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    businessName: 'Elegant Events by Priya',
    ownerName: 'Priya Sharma',
    email: 'priya@elegantevents.com',
    phone: '+91 98765 43210',
    city: 'Mumbai',
    state: 'Maharashtra',
    experience: '8',
    specialties: ['Luxury weddings', 'Destination planning', 'South Indian traditions'],
    bio: 'Passionate wedding planner with 8 years of experience creating unforgettable celebrations. Specializing in luxury and destination weddings across India.',
    portfolio: 'https://elegantevents.com',
    instagram: '@elegantevents',
    minBudget: '20',
    maxClients: '6',
  });
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Mock save
    setSaved(true);
    setEditing(false);
    setTimeout(() => setSaved(false), 3000);
  };

  const addSpecialty = () => {
    setFormData({
      ...formData,
      specialties: [...formData.specialties, ''],
    });
  };

  const updateSpecialty = (index: number, value: string) => {
    const newSpecialties = [...formData.specialties];
    newSpecialties[index] = value;
    setFormData({ ...formData, specialties: newSpecialties });
  };

  const removeSpecialty = (index: number) => {
    setFormData({
      ...formData,
      specialties: formData.specialties.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="min-h-screen bg-[#3A2563]">
      {/* Header */}
      <div className="bg-[#E2B451] border-b-4 border-[#3A2563]">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <button
            onClick={() => router.push('/planner')}
            className="text-[#3A2563]/70 hover:text-[#3A2563] mb-4 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to dashboard
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-[#3A2563] mb-2">
                My profile
              </h1>
              <p className="text-[#3A2563]/70">
                Update your business information
              </p>
            </div>
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="px-6 py-3 bg-[#3A2563] text-[#E2B451] rounded-lg font-semibold hover:bg-[#3A2563]/90 transition-colors"
              >
                Edit profile
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {saved && (
          <div className="bg-[#1E4636] border-2 border-[#E2B451] rounded-lg p-4 mb-6 flex items-center gap-3">
            <svg
              className="w-6 h-6 text-[#E2B451]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <p className="text-[#E2B451] font-semibold">Profile updated successfully</p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Business Information */}
          <div className="bg-[#E2B451]/10 rounded-lg border-2 border-[#E2B451]/20 p-6 mb-6">
            <h2 className="text-2xl font-bold text-[#E2B451] mb-6">Business information</h2>
            
            <div className="grid gap-6">
              <div>
                <label className="block text-[#E2B451] font-semibold mb-2">
                  Business name
                </label>
                <input
                  type="text"
                  value={formData.businessName}
                  onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                  disabled={!editing}
                  className="w-full px-4 py-3 bg-[#3A2563]/20 border-2 border-[#E2B451]/20 rounded-lg text-[#E2B451] placeholder-[#E2B451]/50 disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-[#E2B451] font-semibold mb-2">
                  Owner name
                </label>
                <input
                  type="text"
                  value={formData.ownerName}
                  onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                  disabled={!editing}
                  className="w-full px-4 py-3 bg-[#3A2563]/20 border-2 border-[#E2B451]/20 rounded-lg text-[#E2B451] placeholder-[#E2B451]/50 disabled:opacity-50"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#E2B451] font-semibold mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    disabled={!editing}
                    className="w-full px-4 py-3 bg-[#3A2563]/20 border-2 border-[#E2B451]/20 rounded-lg text-[#E2B451] placeholder-[#E2B451]/50 disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="block text-[#E2B451] font-semibold mb-2">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    disabled={!editing}
                    className="w-full px-4 py-3 bg-[#3A2563]/20 border-2 border-[#E2B451]/20 rounded-lg text-[#E2B451] placeholder-[#E2B451]/50 disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#E2B451] font-semibold mb-2">
                    City
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    disabled={!editing}
                    className="w-full px-4 py-3 bg-[#3A2563]/20 border-2 border-[#E2B451]/20 rounded-lg text-[#E2B451] placeholder-[#E2B451]/50 disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="block text-[#E2B451] font-semibold mb-2">
                    State
                  </label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    disabled={!editing}
                    className="w-full px-4 py-3 bg-[#3A2563]/20 border-2 border-[#E2B451]/20 rounded-lg text-[#E2B451] placeholder-[#E2B451]/50 disabled:opacity-50"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Professional Details */}
          <div className="bg-[#E2B451]/10 rounded-lg border-2 border-[#E2B451]/20 p-6 mb-6">
            <h2 className="text-2xl font-bold text-[#E2B451] mb-6">Professional details</h2>
            
            <div className="grid gap-6">
              <div>
                <label className="block text-[#E2B451] font-semibold mb-2">
                  Years of experience
                </label>
                <input
                  type="number"
                  value={formData.experience}
                  onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                  disabled={!editing}
                  className="w-full px-4 py-3 bg-[#3A2563]/20 border-2 border-[#E2B451]/20 rounded-lg text-[#E2B451] placeholder-[#E2B451]/50 disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-[#E2B451] font-semibold mb-2">
                  Bio
                </label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  disabled={!editing}
                  rows={4}
                  className="w-full px-4 py-3 bg-[#3A2563]/20 border-2 border-[#E2B451]/20 rounded-lg text-[#E2B451] placeholder-[#E2B451]/50 disabled:opacity-50 resize-none"
                />
              </div>

              <div>
                <label className="block text-[#E2B451] font-semibold mb-2">
                  Specialties
                </label>
                <div className="space-y-3">
                  {formData.specialties.map((specialty, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={specialty}
                        onChange={(e) => updateSpecialty(index, e.target.value)}
                        disabled={!editing}
                        placeholder="e.g., Luxury weddings"
                        className="flex-1 px-4 py-3 bg-[#3A2563]/20 border-2 border-[#E2B451]/20 rounded-lg text-[#E2B451] placeholder-[#E2B451]/50 disabled:opacity-50"
                      />
                      {editing && formData.specialties.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeSpecialty(index)}
                          className="px-4 py-3 bg-red-500/20 text-red-500 rounded-lg hover:bg-red-500/30"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                  {editing && (
                    <button
                      type="button"
                      onClick={addSpecialty}
                      className="px-4 py-2 bg-[#E2B451]/20 text-[#E2B451] rounded-lg hover:bg-[#E2B451]/30 font-semibold"
                    >
                      + Add specialty
                    </button>
                  )}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#E2B451] font-semibold mb-2">
                    Portfolio website
                  </label>
                  <input
                    type="url"
                    value={formData.portfolio}
                    onChange={(e) => setFormData({ ...formData, portfolio: e.target.value })}
                    disabled={!editing}
                    placeholder="https://..."
                    className="w-full px-4 py-3 bg-[#3A2563]/20 border-2 border-[#E2B451]/20 rounded-lg text-[#E2B451] placeholder-[#E2B451]/50 disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="block text-[#E2B451] font-semibold mb-2">
                    Instagram handle
                  </label>
                  <input
                    type="text"
                    value={formData.instagram}
                    onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                    disabled={!editing}
                    placeholder="@username"
                    className="w-full px-4 py-3 bg-[#3A2563]/20 border-2 border-[#E2B451]/20 rounded-lg text-[#E2B451] placeholder-[#E2B451]/50 disabled:opacity-50"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Business Settings */}
          <div className="bg-[#E2B451]/10 rounded-lg border-2 border-[#E2B451]/20 p-6 mb-6">
            <h2 className="text-2xl font-bold text-[#E2B451] mb-6">Business settings</h2>
            
            <div className="grid gap-6">
              <div>
                <label className="block text-[#E2B451] font-semibold mb-2">
                  Minimum budget (₹ Lakhs)
                </label>
                <input
                  type="number"
                  value={formData.minBudget}
                  onChange={(e) => setFormData({ ...formData, minBudget: e.target.value })}
                  disabled={!editing}
                  className="w-full px-4 py-3 bg-[#3A2563]/20 border-2 border-[#E2B451]/20 rounded-lg text-[#E2B451] placeholder-[#E2B451]/50 disabled:opacity-50"
                />
                <p className="text-[#E2B451]/60 text-sm mt-2">
                  Only see leads with budgets above this amount
                </p>
              </div>

              <div>
                <label className="block text-[#E2B451] font-semibold mb-2">
                  Max clients per year
                </label>
                <input
                  type="number"
                  value={formData.maxClients}
                  onChange={(e) => setFormData({ ...formData, maxClients: e.target.value })}
                  disabled={!editing}
                  className="w-full px-4 py-3 bg-[#3A2563]/20 border-2 border-[#E2B451]/20 rounded-lg text-[#E2B451] placeholder-[#E2B451]/50 disabled:opacity-50"
                />
                <p className="text-[#E2B451]/60 text-sm mt-2">
                  Limit active clients to maintain quality
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          {editing && (
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="flex-1 px-6 py-4 bg-[#3A2563]/20 text-[#E2B451] rounded-lg font-semibold hover:bg-[#3A2563]/30 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-6 py-4 bg-[#E2B451] text-[#3A2563] rounded-lg font-semibold hover:bg-[#E2B451]/90 transition-colors"
              >
                Save changes
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
