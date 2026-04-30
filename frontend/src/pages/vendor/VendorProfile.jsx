import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { vendorAPI, userAPI } from '../../api/api';

export default function VendorProfile() {
  const { currentUser, refreshUser } = useAuth();
  const [profile, setProfile] = useState({
    businessName: '', category: '', location: '', phone: '', email: '', bio: '', paymentStatus: 'Not added',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch real vendor profile from backend
  useEffect(() => {
    vendorAPI.getProfile().then(res => {
      if (res.success) {
        const p = res.profile || {};
        const b = res.basicInfo || {};
        setProfile({
          businessName: p.businessName || b.fullName || '',
          category: p.category || '',
          location: p.serviceArea || '',
          phone: b.phone || '',
          email: b.email || '',
          bio: p.about || '',
          paymentStatus: p.bankAccount ? 'Payment added' : 'Not added',
        });
      }
    }).catch(err => {
      // Fallback to currentUser
      setProfile({
        businessName: currentUser?.vendorProfile?.businessName || currentUser?.fullName || '',
        category: currentUser?.vendorProfile?.category || '',
        location: currentUser?.vendorProfile?.serviceArea || currentUser?.location || '',
        phone: currentUser?.phone || '',
        email: currentUser?.email || '',
        bio: currentUser?.vendorProfile?.about || '',
        paymentStatus: currentUser?.vendorProfile?.bankAccount ? 'Payment added' : 'Not added',
      });
    }).finally(() => setLoading(false));
  }, [currentUser]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await vendorAPI.updateProfile({
        businessName: profile.businessName, category: profile.category,
        serviceArea: profile.location, about: profile.bio,
        phone: profile.phone,
      });
      if (refreshUser) await refreshUser();
      setSaved(true);
      setEditing(false);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) { console.error('Save error:', e); } finally { setSaving(false); }
  };

  if (loading) {
    return (
      <div className="animate-fadeInUp text-center py-20 text-white/30">
        Loading profile...
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeInUp">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl text-white">Vendor Profile</h1>
        <button onClick={() => setEditing(!editing)} className="loverai-btn-outline text-xs py-2 px-4 rounded-lg flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
          {editing ? 'Cancel' : 'Edit Profile'}
        </button>
      </div>

      {/* Header Card — matches reference screenshot */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-loverai-gold/20 to-amber-800/20 border border-loverai-gold/20 flex items-center justify-center shrink-0">
            <svg className="w-8 h-8 text-loverai-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div>
            <h2 className="font-heading text-xl text-white">{profile.businessName || 'Business Name'}</h2>
            {profile.category && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-loverai-gold/10 text-loverai-gold/80 border border-loverai-gold/20 mt-1 inline-block">
                {profile.category}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Info Grid — matches reference 2x2 layout */}
      <div className="glass-card rounded-2xl p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-5 gap-x-8">
          <div className="flex items-center gap-3">
            <svg className="w-4 h-4 text-white/30 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            <span className="text-sm text-white/70">{profile.location || 'Location not set'}</span>
          </div>
          <div className="flex items-center gap-3">
            <svg className="w-4 h-4 text-white/30 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
            <span className="text-sm text-white/70">{profile.phone || 'Phone not set'}</span>
          </div>
          <div className="flex items-center gap-3">
            <svg className="w-4 h-4 text-white/30 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
            <span className="text-sm text-white/70">{profile.email || 'Email not set'}</span>
          </div>
          <div className="flex items-center gap-3">
            <svg className="w-4 h-4 text-white/30 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
            <span className="text-sm text-white/70">{profile.paymentStatus}</span>
          </div>
        </div>
      </div>

      {/* Bio */}
      <div className="glass-card rounded-2xl p-6">
        <p className="text-[10px] text-white/25 uppercase tracking-wider mb-2">Bio</p>
        {editing ? (
          <textarea value={profile.bio} onChange={e => setProfile({ ...profile, bio: e.target.value })} placeholder="Tell planners about your business..."
            className="w-full glass-input rounded-xl px-4 py-3 text-sm resize-none min-h-[100px]" />
        ) : (
          <p className="text-sm text-white/60 leading-relaxed">{profile.bio || 'No bio added yet. Click Edit Profile to add one.'}</p>
        )}
      </div>

      {/* Edit Form — only when editing */}
      {editing && (
        <div className="glass-card rounded-2xl p-6 space-y-4 animate-fadeInUp">
          <h3 className="font-heading text-base text-white">Edit Details</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs text-white/30">Business Name</label>
              <input value={profile.businessName} onChange={e => setProfile({ ...profile, businessName: e.target.value })} className="w-full glass-input rounded-xl px-4 py-2.5 text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-white/30">Category</label>
              <select value={profile.category} onChange={e => setProfile({ ...profile, category: e.target.value })} className="w-full glass-input rounded-xl px-4 py-2.5 text-sm">
                <option value="">Select category</option>
                <option value="Decor">Decor</option>
                <option value="Catering">Catering</option>
                <option value="Photography">Photography</option>
                <option value="Entertainment">Entertainment</option>
                <option value="Mehendi">Mehendi</option>
                <option value="Makeup">Makeup</option>
                <option value="Venue">Venue</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-white/30">Service Area</label>
              <input value={profile.location} onChange={e => setProfile({ ...profile, location: e.target.value })} className="w-full glass-input rounded-xl px-4 py-2.5 text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-white/30">Phone</label>
              <input value={profile.phone} onChange={e => setProfile({ ...profile, phone: e.target.value })} className="w-full glass-input rounded-xl px-4 py-2.5 text-sm" />
            </div>
          </div>
          <div className="flex justify-end items-center gap-3 pt-2">
            {saved && <span className="text-xs text-emerald-400 flex items-center gap-1"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> Saved</span>}
            <button onClick={() => setEditing(false)} className="loverai-btn-outline text-sm py-2.5 px-4 rounded-xl">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="loverai-btn-primary text-sm py-2.5 px-6 rounded-xl disabled:opacity-50">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
