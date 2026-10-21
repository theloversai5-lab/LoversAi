import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { userAPI } from '../../api/api';

export default function PlannerProfile() {
  const { currentUser, refreshUser } = useAuth();
  const [profile, setProfile] = useState({
    name: '', company: '', email: '', phone: '', location: '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setProfile({
      name: currentUser?.fullName || '',
      company: currentUser?.company_name || '',
      email: currentUser?.email || '',
      phone: currentUser?.phone || '',
      location: currentUser?.location || '',
    });
  }, [currentUser]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await userAPI.saveProfile({
        fullName: profile.name, company_name: profile.company,
        phone: profile.phone, location: profile.location,
      });
      await refreshUser();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      console.error('Save profile error:', e);
    } finally {
      setSaving(false);
    }
  };

  const stats = [
    { label: 'Total Bids', value: 47, icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg> },
    { label: 'Deals Closed', value: 12, icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg> },
    { label: 'Rating', value: '4.8★', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg> },
  ];

  return (
    <div className="space-y-6 animate-fadeInUp">
      {/* Header */}
      <div className="flex items-center gap-5">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-loverai-gold to-amber-700 flex items-center justify-center text-loverai-dark font-heading text-2xl shadow-lg shadow-loverai-gold/20">
          {(profile.name || 'P').charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 className="font-heading text-2xl text-white">{profile.name || 'Your Name'}</h1>
          <p className="text-sm text-white/30 flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
            {profile.company || 'Company Name'}
          </p>
          <div className="flex items-center gap-1 mt-1">
            <svg className="w-3.5 h-3.5 text-loverai-gold fill-loverai-gold" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
            <span className="text-sm text-white">4.8</span>
            <span className="text-xs text-white/25">(156 reviews)</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {stats.map(s => (
          <div key={s.label} className="glass-card rounded-xl p-4 text-center">
            <div className="text-loverai-gold mx-auto mb-1 flex justify-center">{s.icon}</div>
            <p className="text-lg font-heading text-white">{s.value}</p>
            <p className="text-[10px] text-white/25">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Edit Form */}
      <div className="glass-card rounded-2xl">
        <div className="p-5 border-b border-white/5">
          <h2 className="font-heading text-base text-white">Edit Profile</h2>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs text-white/30">Full Name</label>
              <input value={profile.name} onChange={e => setProfile({ ...profile, name: e.target.value })} className="w-full glass-input rounded-xl px-4 py-2.5 text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-white/30">Company</label>
              <input value={profile.company} onChange={e => setProfile({ ...profile, company: e.target.value })} className="w-full glass-input rounded-xl px-4 py-2.5 text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-white/30">Email</label>
              <input type="email" value={profile.email} disabled className="w-full glass-input rounded-xl px-4 py-2.5 text-sm opacity-50 cursor-not-allowed" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-white/30">Phone</label>
              <input value={profile.phone} onChange={e => setProfile({ ...profile, phone: e.target.value })} className="w-full glass-input rounded-xl px-4 py-2.5 text-sm" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs text-white/30">Location</label>
              <input value={profile.location} onChange={e => setProfile({ ...profile, location: e.target.value })} className="w-full glass-input rounded-xl px-4 py-2.5 text-sm" />
            </div>
          </div>
          <div className="flex justify-end items-center gap-3">
            {saved && <span className="text-xs text-emerald-400">✓ Saved</span>}
            <button onClick={handleSave} disabled={saving} className="loverai-btn-primary text-sm py-2.5 px-6 rounded-xl flex items-center gap-2 disabled:opacity-50">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" /></svg>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
