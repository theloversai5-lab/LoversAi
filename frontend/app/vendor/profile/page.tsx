'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function VendorProfilePage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    businessName: 'Eternal Frames Studio',
    category: 'photographer',
    ownerName: 'Rahul Kapoor',
    email: 'rahul@eternalframes.com',
    phone: '+91 98765 12345',
    city: 'Mumbai',
    state: 'Maharashtra',
    experience: '10',
    services: ['Full day coverage', 'Pre-wedding shoot', 'Drone videography', 'Photo album'],
    tags: ['Candid', 'Cinematic', 'Drone'],
    bio: 'Award-winning wedding photographer specializing in cinematic storytelling and candid moments.',
    startingPrice: '75000',
    availability: 'available',
  });
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setEditing(false);
    setTimeout(() => setSaved(false), 3000);
  };

  const addService = () => {
    setFormData({
      ...formData,
      services: [...formData.services, ''],
    });
  };

  const updateService = (index: number, value: string) => {
    const newServices = [...formData.services];
    newServices[index] = value;
    setFormData({ ...formData, services: newServices });
  };

  const removeService = (index: number) => {
    setFormData({
      ...formData,
      services: formData.services.filter((_, i) => i !== index),
    });
  };

  const addTag = () => {
    setFormData({
      ...formData,
      tags: [...formData.tags, ''],
    });
  };

  const updateTag = (index: number, value: string) => {
    const newTags = [...formData.tags];
    newTags[index] = value;
    setFormData({ ...formData, tags: newTags });
  };

  const removeTag = (index: number) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="min-h-screen bg-[#1E4636]">
      {/* Header */}
      <div className="bg-[#E2B451] border-b-4 border-[#F08A3C]">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <button
            onClick={() => router.push('/vendor')}
            className="text-[#1E4636]/70 hover:text-[#1E4636] mb-4 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to dashboard
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-[#1E4636] mb-2">
                Business profile
              </h1>
              <p className="text-[#1E4636]/70">
                Manage your vendor information
              </p>
            </div>
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="px-6 py-3 bg-[#1E4636] text-[#E2B451] rounded-lg font-semibold hover:bg-[#1E4636]/90 transition-colors"
              >
                Edit profile
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {saved && (
          <div className="bg-[#F08A3C] border-2 border-[#E2B451] rounded-lg p-4 mb-6 flex items-center gap-3">
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
          {/* Basic Information */}
          <div className="bg-[#E2B451]/10 rounded-lg border-2 border-[#E2B451]/20 p-6 mb-6">
            <h2 className="text-2xl font-bold text-[#E2B451] mb-6">Basic information</h2>
            
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
                  className="w-full px-4 py-3 bg-[#1E4636]/20 border-2 border-[#E2B451]/20 rounded-lg text-[#E2B451] placeholder-[#E2B451]/50 disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-[#E2B451] font-semibold mb-2">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  disabled={!editing}
                  className="w-full px-4 py-3 bg-[#1E4636]/20 border-2 border-[#E2B451]/20 rounded-lg text-[#E2B451] disabled:opacity-50"
                >
                  <option value="photographer">Photographer</option>
                  <option value="venue">Venue</option>
                  <option value="caterer">Caterer</option>
                  <option value="decorator">Decorator</option>
                  <option value="makeup">Makeup Artist</option>
                  <option value="music">Music & DJ</option>
                </select>
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
                  className="w-full px-4 py-3 bg-[#1E4636]/20 border-2 border-[#E2B451]/20 rounded-lg text-[#E2B451] placeholder-[#E2B451]/50 disabled:opacity-50"
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
                    className="w-full px-4 py-3 bg-[#1E4636]/20 border-2 border-[#E2B451]/20 rounded-lg text-[#E2B451] placeholder-[#E2B451]/50 disabled:opacity-50"
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
                    className="w-full px-4 py-3 bg-[#1E4636]/20 border-2 border-[#E2B451]/20 rounded-lg text-[#E2B451] placeholder-[#E2B451]/50 disabled:opacity-50"
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
                    className="w-full px-4 py-3 bg-[#1E4636]/20 border-2 border-[#E2B451]/20 rounded-lg text-[#E2B451] placeholder-[#E2B451]/50 disabled:opacity-50"
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
                    className="w-full px-4 py-3 bg-[#1E4636]/20 border-2 border-[#E2B451]/20 rounded-lg text-[#E2B451] placeholder-[#E2B451]/50 disabled:opacity-50"
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
                  className="w-full px-4 py-3 bg-[#1E4636]/20 border-2 border-[#E2B451]/20 rounded-lg text-[#E2B451] placeholder-[#E2B451]/50 disabled:opacity-50"
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
                  className="w-full px-4 py-3 bg-[#1E4636]/20 border-2 border-[#E2B451]/20 rounded-lg text-[#E2B451] placeholder-[#E2B451]/50 disabled:opacity-50 resize-none"
                />
              </div>

              <div>
                <label className="block text-[#E2B451] font-semibold mb-2">
                  Services offered
                </label>
                <div className="space-y-3">
                  {formData.services.map((service, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={service}
                        onChange={(e) => updateService(index, e.target.value)}
                        disabled={!editing}
                        placeholder="e.g., Full day coverage"
                        className="flex-1 px-4 py-3 bg-[#1E4636]/20 border-2 border-[#E2B451]/20 rounded-lg text-[#E2B451] placeholder-[#E2B451]/50 disabled:opacity-50"
                      />
                      {editing && formData.services.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeService(index)}
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
                      onClick={addService}
                      className="px-4 py-2 bg-[#E2B451]/20 text-[#E2B451] rounded-lg hover:bg-[#E2B451]/30 font-semibold"
                    >
                      + Add service
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[#E2B451] font-semibold mb-2">
                  Specialties / Tags
                </label>
                <div className="space-y-3">
                  {formData.tags.map((tag, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={tag}
                        onChange={(e) => updateTag(index, e.target.value)}
                        disabled={!editing}
                        placeholder="e.g., Candid"
                        className="flex-1 px-4 py-3 bg-[#1E4636]/20 border-2 border-[#E2B451]/20 rounded-lg text-[#E2B451] placeholder-[#E2B451]/50 disabled:opacity-50"
                      />
                      {editing && formData.tags.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeTag(index)}
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
                      onClick={addTag}
                      className="px-4 py-2 bg-[#E2B451]/20 text-[#E2B451] rounded-lg hover:bg-[#E2B451]/30 font-semibold"
                    >
                      + Add tag
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Pricing & Availability */}
          <div className="bg-[#E2B451]/10 rounded-lg border-2 border-[#E2B451]/20 p-6 mb-6">
            <h2 className="text-2xl font-bold text-[#E2B451] mb-6">Pricing & availability</h2>
            
            <div className="grid gap-6">
              <div>
                <label className="block text-[#E2B451] font-semibold mb-2">
                  Starting price (₹)
                </label>
                <input
                  type="number"
                  value={formData.startingPrice}
                  onChange={(e) => setFormData({ ...formData, startingPrice: e.target.value })}
                  disabled={!editing}
                  className="w-full px-4 py-3 bg-[#1E4636]/20 border-2 border-[#E2B451]/20 rounded-lg text-[#E2B451] placeholder-[#E2B451]/50 disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-[#E2B451] font-semibold mb-2">
                  Availability status
                </label>
                <select
                  value={formData.availability}
                  onChange={(e) => setFormData({ ...formData, availability: e.target.value })}
                  disabled={!editing}
                  className="w-full px-4 py-3 bg-[#1E4636]/20 border-2 border-[#E2B451]/20 rounded-lg text-[#E2B451] disabled:opacity-50"
                >
                  <option value="available">Available</option>
                  <option value="limited">Limited slots</option>
                  <option value="booked">Fully booked</option>
                </select>
              </div>
            </div>
          </div>

          {/* Actions */}
          {editing && (
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="flex-1 px-6 py-4 bg-[#1E4636]/20 text-[#E2B451] rounded-lg font-semibold hover:bg-[#1E4636]/30 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-6 py-4 bg-[#E2B451] text-[#1E4636] rounded-lg font-semibold hover:bg-[#E2B451]/90 transition-colors"
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
