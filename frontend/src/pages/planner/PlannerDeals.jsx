import React, { useState, useEffect } from 'react';
import { quoteAPI } from '../../api/api';

const mockDeals = [
  { _id: 'd1', couple: 'Neha & Rahul', status: 'active', location: 'Goa', date: 'Jun 15, 2026', guests: 200, budget: '₹10L', services: ['Decor', 'Photography'], vendors: ['Stage Craft Studios', 'Shutter Stories'] },
  { _id: 'd2', couple: 'Anjali & Karan', status: 'active', location: 'Jaipur', date: 'Apr 20, 2026', guests: 500, budget: '₹25L', services: ['Decor', 'Catering', 'Entertainment'], vendors: ['Bloom & Petal', 'Royal Feast', 'Melody Makers'] },
  { _id: 'd3', couple: 'Priya & Arjun', status: 'completed', location: 'Udaipur', date: 'Mar 10, 2026', guests: 350, budget: '₹20L', services: ['Decor', 'Catering'], vendors: ['Bloom & Petal', 'Royal Feast'] },
];

export default function PlannerDeals() {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [closingDeal, setClosingDeal] = useState(null);
  const [assigningDeal, setAssigningDeal] = useState(null);

  useEffect(() => {
    quoteAPI.getMyDeals().then(res => {
      if (res.success && res.deals?.length > 0) {
        setDeals(res.deals.map(d => ({
          _id: d._id, couple: d.coupleId?.fullName || 'Couple', status: d.status || 'active',
          location: d.eventDetails?.city || 'N/A', date: d.eventDetails?.weddingDate ? new Date(d.eventDetails.weddingDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }) : 'TBD',
          guests: d.eventDetails?.guestCount || 0, budget: d.eventDetails?.budget || 'N/A',
          services: d.items?.map(i => i.category) || [], vendors: d.items?.map(i => i.vendorName) || [],
        })));
      } else { setDeals(mockDeals); }
    }).catch(() => setDeals(mockDeals)).finally(() => setLoading(false));
  }, []);

  const activeDeals = deals.filter(d => d.status === 'active');

  const handleCloseDeal = (dealId) => {
    setDeals(prev => prev.map(d => d._id === dealId ? { ...d, status: 'completed' } : d));
    setClosingDeal(null);
  };

  return (
    <div className="space-y-5 animate-fadeInUp">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl text-white">My Deals</h1>
          <p className="text-xs text-white/30 mt-1">Manage your active wedding projects</p>
        </div>
        <span className="badge-open text-xs px-3 py-1 rounded-full font-medium">{activeDeals.length} Active</span>
      </div>

      {loading ? (
        <div className="text-center text-white/30 py-12">Loading deals...</div>
      ) : deals.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center">
          <svg className="w-12 h-12 mx-auto mb-3 text-white/10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>
          <p className="text-white/40">No deals yet. Accept quotes to create deals.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {deals.map(deal => (
            <div key={deal._id} className="glass-card rounded-2xl overflow-hidden hover-glow">
              <div className="p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-loverai-gold/30 to-amber-800/30 flex items-center justify-center text-loverai-gold font-heading">
                      {deal.couple.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-white">{deal.couple}</p>
                      <p className="text-[10px] text-white/25">{deal.location} · {deal.date}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${deal.status === 'active' ? 'badge-open' : 'badge-closed'}`}>
                    {deal.status.charAt(0).toUpperCase() + deal.status.slice(1)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="glass-card-subtle rounded-lg p-2.5">
                    <p className="text-[10px] text-white/25">Guests</p>
                    <p className="text-sm text-white font-medium">{deal.guests}</p>
                  </div>
                  <div className="glass-card-subtle rounded-lg p-2.5">
                    <p className="text-[10px] text-white/25">Budget</p>
                    <p className="text-sm text-loverai-gold font-medium">{deal.budget}</p>
                  </div>
                </div>

                <div>
                  <p className="text-[10px] text-white/25 mb-1.5">Services</p>
                  <div className="flex flex-wrap gap-1.5">
                    {deal.services.map((s, i) => (
                      <span key={i} className="text-[10px] px-2 py-0.5 rounded-full glass-card-subtle text-white/40">{s}</span>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-[10px] text-white/25 mb-1.5">Assigned Vendors</p>
                  <div className="flex flex-wrap gap-1.5">
                    {deal.vendors.map((v, i) => (
                      <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-loverai-gold/10 text-loverai-gold/60 border border-loverai-gold/15">{v}</span>
                    ))}
                  </div>
                </div>

                {deal.status === 'active' && (
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => setAssigningDeal(deal)} className="flex-1 loverai-btn-outline text-xs py-2 rounded-lg">Assign Vendors</button>
                    <button onClick={() => setClosingDeal(deal)} className="flex-1 loverai-btn-primary text-xs py-2 rounded-lg">Close Deal</button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Close Deal Confirmation */}
      {closingDeal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setClosingDeal(null)}>
          <div className="glass-card-strong rounded-2xl w-full max-w-sm p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="font-heading text-lg text-white">Close Deal?</h3>
            <p className="text-sm text-white/50">Mark the wedding project for <span className="text-loverai-gold">{closingDeal.couple}</span> as completed?</p>
            <div className="flex gap-3">
              <button onClick={() => setClosingDeal(null)} className="flex-1 loverai-btn-outline text-sm py-2.5 rounded-xl">Cancel</button>
              <button onClick={() => handleCloseDeal(closingDeal._id)} className="flex-1 loverai-btn-primary text-sm py-2.5 rounded-xl">Confirm Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Vendors Popup */}
      {assigningDeal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setAssigningDeal(null)}>
          <div className="glass-card-strong rounded-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#1C120C]">
              <div>
                <h3 className="font-heading text-xl text-white">Assign Vendors</h3>
                <p className="text-xs text-white/40 mt-1">Select verified vendors for {assigningDeal.couple}'s wedding</p>
              </div>
              <button onClick={() => setAssigningDeal(null)} className="text-white/30 hover:text-white transition">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar bg-[#120D0A] flex-1">
              <div className="relative mb-6">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                <input placeholder="Search directory..." className="w-full glass-input bg-[#1C1613] rounded-xl pl-10 pr-4 py-3 text-sm focus:border-loverai-gold outline-none text-white/80" />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Mock Vendor Cards */}
                {[
                  { name: 'Shutter Stories', type: 'Photography', rating: '4.9 (210)' },
                  { name: 'The Grand Marquee', type: 'Venue', rating: '4.9 (310)' },
                  { name: 'Bloom & Petal Decor', type: 'Decor', rating: '4.8 (124)' },
                  { name: 'Royal Feast Caterers', type: 'Catering', rating: '4.6 (89)' },
                ].map((v, i) => (
                  <div key={i} className="bg-[#1C120C] border border-white/5 rounded-xl p-4 flex flex-col justify-between hover:border-loverai-gold/30 transition-colors cursor-pointer group">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/60 font-heading text-lg">{v.name[0]}</div>
                        <button className="text-white/30 hover:text-loverai-gold"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg></button>
                      </div>
                      <h4 className="text-white font-medium text-sm">{v.name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-loverai-gold px-2 py-0.5 rounded-full border border-loverai-gold/20 bg-loverai-gold/5">{v.type}</span>
                        <span className="text-[10px] text-white/40">★ {v.rating}</span>
                      </div>
                    </div>
                    <button className="w-full mt-4 bg-transparent border border-white/10 text-white/60 font-medium py-2 rounded-lg text-xs hover:bg-white/5 transition-colors group-hover:border-white/20">
                      Assign to Deal
                    </button>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="p-4 border-t border-white/5 bg-[#1C120C] flex justify-end">
              <button onClick={() => setAssigningDeal(null)} className="loverai-btn-primary px-6 py-2 rounded-xl text-sm">Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
