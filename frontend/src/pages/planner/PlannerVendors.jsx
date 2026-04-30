import React, { useState, useEffect } from 'react';
import { vendorAPI } from '../../api/api';

const mockVendors = [
  { id: 1, name: 'Bloom & Petal Decor', category: 'Decor', location: 'Mumbai', rating: 4.8, reviews: 124, phone: '+91 98765 00001', bio: 'Premium wedding decor specialists with 10+ years of luxury floral arrangements.', priceRange: '₹2L – ₹8L', portfolio: 42, traditions: ['Hindu', 'Christian', 'Fusion'] },
  { id: 2, name: 'Royal Feast Caterers', category: 'Catering', location: 'Delhi', rating: 4.6, reviews: 89, phone: '+91 98765 00002', bio: 'Multi-cuisine catering for grand celebrations. North Indian, Mughlai, Continental.', priceRange: '₹1.5L – ₹6L', portfolio: 28, traditions: ['Hindu', 'Muslim', 'Sikh'] },
  { id: 3, name: 'Shutter Stories', category: 'Photography', location: 'Jaipur', rating: 4.9, reviews: 210, phone: '+91 98765 00003', bio: 'Award-winning wedding photography and cinematic videography.', priceRange: '₹1L – ₹5L', portfolio: 156, traditions: ['All'] },
  { id: 4, name: 'Melody Makers Band', category: 'Entertainment', location: 'Mumbai', rating: 4.5, reviews: 67, phone: '+91 98765 00004', bio: 'Live band and DJ services for sangeet, mehendi, and reception.', priceRange: '₹80K – ₹3L', portfolio: 15, traditions: ['Hindu', 'Fusion'] },
  { id: 5, name: 'Henna by Priya', category: 'Mehendi', location: 'Udaipur', rating: 4.7, reviews: 156, phone: '+91 98765 00005', bio: 'Intricate bridal mehendi artistry. Arabic, Rajasthani, contemporary.', priceRange: '₹15K – ₹60K', portfolio: 89, traditions: ['Hindu', 'Muslim'] },
  { id: 6, name: 'Stage Craft Studios', category: 'Decor', location: 'Goa', rating: 4.4, reviews: 45, phone: '+91 98765 00006', bio: 'Beachside and destination wedding decor. Rustic, bohemian, tropical.', priceRange: '₹3L – ₹12L', portfolio: 33, traditions: ['Christian', 'Hindu', 'Fusion'] },
  { id: 7, name: 'Glamour by Nisha', category: 'Makeup', location: 'Delhi', rating: 4.8, reviews: 198, phone: '+91 98765 00007', bio: 'Celebrity makeup artist. Airbrush, HD, and traditional techniques.', priceRange: '₹50K – ₹2L', portfolio: 74, traditions: ['Hindu', 'Sikh', 'Muslim'] },
  { id: 8, name: 'The Grand Marquee', category: 'Venue', location: 'Udaipur', rating: 4.9, reviews: 310, phone: '+91 98765 00009', bio: 'Lakeside palace venue with royal heritage. 200–2000 guests.', priceRange: '₹10L – ₹50L', portfolio: 48, traditions: ['All'] },
];

const categories = ['All', 'Decor', 'Catering', 'Photography', 'Entertainment', 'Mehendi', 'Makeup', 'Venue'];
const locations = ['All', 'Mumbai', 'Delhi', 'Jaipur', 'Udaipur', 'Goa'];

export default function PlannerVendors() {
  const [vendors, setVendors] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [location, setLocation] = useState('All');
  const [sortBy, setSortBy] = useState('rating');
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [shortlist, setShortlist] = useState(() => {
    try { return JSON.parse(localStorage.getItem('planner_shortlist') || '[]'); } catch { return []; }
  });
  const [view, setView] = useState('browse');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    vendorAPI.getPublicVendors().then(res => {
      if (res.success && res.vendors?.length > 0) {
        setVendors(res.vendors.map((v, i) => ({
          id: v._id || i, name: v.vendorProfile?.businessName || v.fullName || 'Vendor',
          category: v.vendorProfile?.category || 'General', location: v.vendorProfile?.serviceArea || 'India',
          rating: v.vendorProfile?.rating || 4.5, reviews: Math.floor(Math.random() * 200) + 20,
          bio: v.vendorProfile?.about || '', priceRange: 'Contact for pricing',
          portfolio: v.vendorProfile?.portfolio?.length || 0, traditions: ['All'],
          phone: '', avatar: v.avatar,
        })));
      } else { setVendors(mockVendors); }
    }).catch(() => setVendors(mockVendors)).finally(() => setLoading(false));
  }, []);

  const toggleShortlist = (id) => {
    const next = shortlist.includes(id) ? shortlist.filter(i => i !== id) : [...shortlist, id];
    setShortlist(next);
    localStorage.setItem('planner_shortlist', JSON.stringify(next));
  };

  const filtered = vendors
    .filter(v => {
      const matchSearch = !search || v.name.toLowerCase().includes(search.toLowerCase()) || v.bio.toLowerCase().includes(search.toLowerCase());
      const matchCat = category === 'All' || v.category === category;
      const matchLoc = location === 'All' || v.location === location;
      return matchSearch && matchCat && matchLoc;
    })
    .sort((a, b) => {
      if (sortBy === 'rating') return b.rating - a.rating;
      if (sortBy === 'reviews') return b.reviews - a.reviews;
      return a.name.localeCompare(b.name);
    });

  const shortlistedVendors = vendors.filter(v => shortlist.includes(v.id));
  const displayVendors = view === 'shortlist' ? shortlistedVendors : filtered;

  return (
    <div className="space-y-5 animate-fadeInUp">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-2xl text-white">{view === 'shortlist' ? 'Shortlisted Vendors' : 'Vendor Directory'}</h1>
          <p className="text-xs text-white/30 mt-1">{view === 'shortlist' ? `${shortlistedVendors.length} saved` : 'Browse and connect with verified wedding vendors'}</p>
        </div>
        <div className="flex gap-2">
          {view === 'shortlist' ? (
            <button onClick={() => setView('browse')} className="loverai-btn-outline text-xs py-2 px-4 rounded-lg flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              Browse
            </button>
          ) : (
            <button onClick={() => setView('shortlist')} className="loverai-btn-outline text-xs py-2 px-4 rounded-lg flex items-center gap-1.5">
              <svg className="w-4 h-4 fill-loverai-gold" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>
              Shortlist {shortlist.length > 0 && <span className="bg-loverai-gold text-loverai-dark text-[10px] px-1.5 rounded-full font-bold">{shortlist.length}</span>}
            </button>
          )}
        </div>
      </div>

      {/* Filters - only in browse */}
      {view === 'browse' && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search vendors..." className="w-full glass-input rounded-xl pl-10 pr-4 py-2.5 text-sm" />
          </div>
          <select value={category} onChange={e => setCategory(e.target.value)} className="glass-input rounded-xl px-3 py-2.5 text-sm">
            {categories.map(c => <option key={c} value={c}>{c === 'All' ? 'All Categories' : c}</option>)}
          </select>
          <select value={location} onChange={e => setLocation(e.target.value)} className="glass-input rounded-xl px-3 py-2.5 text-sm hidden sm:block">
            {locations.map(l => <option key={l} value={l}>{l === 'All' ? 'All Locations' : l}</option>)}
          </select>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="glass-input rounded-xl px-3 py-2.5 text-sm hidden md:block">
            <option value="rating">Highest Rated</option>
            <option value="reviews">Most Reviewed</option>
            <option value="name">A – Z</option>
          </select>
        </div>
      )}

      <p className="text-xs text-white/20">{displayVendors.length} vendor{displayVendors.length !== 1 ? 's' : ''}</p>

      {/* Vendor Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-3 text-center text-white/30 py-12">Loading vendors...</div>
        ) : displayVendors.length === 0 ? (
          <div className="col-span-3 text-center text-white/30 py-12">
            {view === 'shortlist' ? 'No vendors shortlisted yet' : 'No vendors match your filters'}
          </div>
        ) : displayVendors.map(vendor => {
          const isFav = shortlist.includes(vendor.id);
          return (
            <div key={vendor.id} className="glass-card rounded-xl hover-lift hover-glow group">
              <div className="p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-loverai-gold/30 to-amber-800/30 flex items-center justify-center text-loverai-gold font-heading shrink-0">
                    {vendor.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate group-hover:text-loverai-gold transition">{vendor.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] px-1.5 py-0 rounded glass-card-subtle text-loverai-gold/60">{vendor.category}</span>
                      <span className="text-[10px] text-white/25 flex items-center gap-0.5">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        {vendor.location}
                      </span>
                    </div>
                  </div>
                  <button onClick={() => toggleShortlist(vendor.id)} className="shrink-0 p-1">
                    <svg className={`w-4 h-4 transition ${isFav ? 'text-loverai-gold fill-loverai-gold' : 'text-white/20 hover:text-loverai-gold'}`} viewBox="0 0 24 24">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                    </svg>
                  </button>
                </div>

                <p className="text-[11px] text-white/30 line-clamp-2">{vendor.bio}</p>

                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5 text-loverai-gold fill-loverai-gold" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                    <span className="text-white font-medium">{vendor.rating}</span>
                    <span className="text-white/25">({vendor.reviews})</span>
                  </div>
                  <span className="text-white/25">{vendor.priceRange}</span>
                </div>

                <div className="flex flex-wrap gap-1">
                  {vendor.traditions.slice(0, 3).map(t => (
                    <span key={t} className="text-[9px] px-1.5 py-0 rounded glass-card-subtle text-white/25">{t}</span>
                  ))}
                  <span className="text-[9px] text-white/15">{vendor.portfolio} portfolio items</span>
                </div>

                <div className="border-t border-white/5 pt-3 flex gap-2">
                  <button onClick={() => setSelectedVendor(vendor)} className="flex-1 loverai-btn-outline text-[11px] py-1.5 rounded-lg flex items-center justify-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    View
                  </button>
                  <button className="loverai-btn-outline text-[11px] py-1.5 px-3 rounded-lg">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Vendor Profile Modal */}
      {selectedVendor && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedVendor(null)}>
          <div className="glass-card-strong rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-white/5 flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-loverai-gold/30 to-amber-800/30 flex items-center justify-center text-loverai-gold font-heading text-xl">
                {selectedVendor.name.charAt(0)}
              </div>
              <div className="flex-1">
                <h2 className="font-heading text-xl text-white">{selectedVendor.name}</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[11px] px-2 py-0 rounded glass-card-subtle text-loverai-gold/60">{selectedVendor.category}</span>
                  <span className="text-xs text-white/25">{selectedVendor.location}</span>
                </div>
              </div>
              <button onClick={() => setSelectedVendor(null)} className="text-white/30 hover:text-white p-1">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-white/60">{selectedVendor.bio}</p>
              <div className="grid grid-cols-3 gap-3">
                <div className="glass-card-subtle rounded-lg p-3 text-center">
                  <p className="text-lg font-heading text-loverai-gold">{selectedVendor.rating}</p>
                  <p className="text-[10px] text-white/25">Rating</p>
                </div>
                <div className="glass-card-subtle rounded-lg p-3 text-center">
                  <p className="text-lg font-heading text-white">{selectedVendor.reviews}</p>
                  <p className="text-[10px] text-white/25">Reviews</p>
                </div>
                <div className="glass-card-subtle rounded-lg p-3 text-center">
                  <p className="text-lg font-heading text-white">{selectedVendor.portfolio}</p>
                  <p className="text-[10px] text-white/25">Portfolio</p>
                </div>
              </div>
              <div>
                <p className="text-[10px] text-white/25 mb-1">Price Range</p>
                <p className="text-sm text-white font-medium">{selectedVendor.priceRange}</p>
              </div>
              <div>
                <p className="text-[10px] text-white/25 mb-1.5">Traditions</p>
                <div className="flex gap-1.5 flex-wrap">
                  {selectedVendor.traditions.map(t => (
                    <span key={t} className="text-[11px] px-2 py-0.5 rounded-full bg-loverai-gold/10 text-loverai-gold/60 border border-loverai-gold/15">{t}</span>
                  ))}
                </div>
              </div>
              <div className="border-t border-white/5 pt-4 flex gap-3">
                <button className="flex-1 loverai-btn-primary text-sm py-2.5 rounded-xl flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                  Send Message
                </button>
                <button className="loverai-btn-outline text-sm py-2.5 px-4 rounded-xl flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                  Call
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
