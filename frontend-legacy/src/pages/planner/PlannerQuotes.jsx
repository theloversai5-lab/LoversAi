import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { quoteAPI } from '../../api/api';

const statusColor = {
  sent: 'badge-pending', accepted: 'badge-open', pending: 'badge-pending',
  declined: 'bg-red-500/15 text-red-400 border border-red-500/25', revised: 'bg-blue-500/15 text-blue-400 border border-blue-500/25',
};

const mockQuotes = [
  { _id: 'q1', couple: 'Priya & Arjun', status: 'sent', date: 'Mar 28, 2026', total: '₹8.5L', budget: '₹15L', items: 3, vendors: ['Bloom & Petal Decor', 'Shutter Stories', 'Royal Feast Caterers'], thumbnail: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=200&h=150&fit=crop', itemsData: [ { name: 'Decor package', vendor: 'Bloom & Petal Decor', price: '₹4.0L', image: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=200&h=150' }, { name: 'Cinematic Package', vendor: 'Shutter Stories', price: '₹2.5L', image: 'https://images.unsplash.com/photo-1523438885200-e635ba2c371e?w=200&h=150' }, { name: 'Catering', vendor: 'Royal Feast Caterers', price: '₹2.0L', image: 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=200&h=150' } ] },
  { _id: 'q2', couple: 'Sneha & Rahul', status: 'sent', date: 'Mar 3, 2026', total: '₹21.5L', budget: '₹25L', items: 3, vendors: ['The Grand Marquee', 'Bloom & Petal Decor', 'Royal Feast Caterers'], thumbnail: 'https://images.unsplash.com/photo-1478146059778-26028b07395a?w=200&h=150&fit=crop', itemsData: [ { name: 'Lakeside Palace (Full Day)', vendor: 'The Grand Marquee', price: '₹15.0L', image: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=200&h=150' }, { name: 'Floral Stage Design', vendor: 'Bloom & Petal Decor', price: '₹2.5L', image: 'https://images.unsplash.com/photo-1478146059778-26028b07395a?w=200&h=150' }, { name: 'North Indian Feast (500 pax)', vendor: 'Royal Feast Caterers', price: '₹4.0L', image: 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=200&h=150' } ] },
  { _id: 'q3', couple: 'Anjali & Karan', status: 'pending', date: 'Mar 26, 2026', total: '₹12L', budget: '₹25L', items: 5, vendors: ['Bloom & Petal Decor', 'Melody Makers'], thumbnail: 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=200&h=150&fit=crop', itemsData: [] },
  { _id: 'q4', couple: 'Ananya & Vikram', status: 'declined', date: 'Mar 25, 2026', total: '₹3.8L', budget: '₹8L', items: 2, vendors: ['Henna by Priya'], thumbnail: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=200&h=150&fit=crop', itemsData: [] },
];

export default function PlannerQuotes() {
  const { currentUser } = useAuth();
  const [quotes, setQuotes] = useState([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;
    quoteAPI.getMySent().then(res => {
      if (res.success && res.quotes?.length > 0) {
        setQuotes(res.quotes.map(q => {
          const myResp = q.responses?.find(r => r.planner._id === currentUser.id || r.planner === currentUser.id);
          const myPrice = myResp ? myResp.quotedPrice : 0;
          return {
            _id: q._id, couple: q.couple?.fullName || 'Couple', status: myResp?.status || q.status || 'sent',
            date: new Date(q.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }),
            total: myPrice ? `₹${(myPrice / 100000).toFixed(1)}L` : 'N/A',
            budget: q.eventDetails?.budget || 'N/A', items: q.images?.length || 0,
            vendors: [], thumbnail: q.images?.[0]?.url || '',
            itemsData: []
          };
        }));
      } else { setQuotes(mockQuotes); }
    }).catch(() => setQuotes(mockQuotes)).finally(() => setLoading(false));
  }, [currentUser]);

  const stats = {
    total: quotes.length, accepted: quotes.filter(q => q.status === 'accepted').length,
    awaiting: quotes.filter(q => q.status === 'sent' || q.status === 'pending').length,
    declined: quotes.filter(q => q.status === 'declined').length,
  };

  const filtered = quotes.filter(q => {
    const matchSearch = !search || q.couple.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'All' || q.status === filterStatus.toLowerCase();
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-5 animate-fadeInUp">
      <h1 className="font-heading text-2xl text-white">Quote History</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Sent', value: stats.total, color: 'text-white' },
          { label: 'Accepted', value: stats.accepted, color: 'text-emerald-400' },
          { label: 'Awaiting', value: stats.awaiting, color: 'text-amber-400' },
          { label: 'Declined', value: stats.declined, color: 'text-red-400' },
        ].map(s => (
          <div key={s.label} className="glass-card rounded-xl p-4 text-center">
            <p className={`text-xl font-heading ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-white/30 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search quotes..." className="w-full glass-input rounded-xl pl-10 pr-4 py-2.5 text-sm" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="glass-input rounded-xl px-4 py-2.5 text-sm min-w-[140px]">
          <option value="All">All Status</option>
          <option value="Sent">Sent</option>
          <option value="Accepted">Accepted</option>
          <option value="Pending">Pending</option>
          <option value="Declined">Declined</option>
        </select>
      </div>

      {/* Quote Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-2 text-center text-white/30 py-12">Loading quotes...</div>
        ) : filtered.length === 0 ? (
          <div className="col-span-2 text-center text-white/30 py-12">No quotes match your filters</div>
        ) : filtered.map(q => (
          <div key={q._id} className="glass-card rounded-xl overflow-hidden hover-lift hover-glow cursor-pointer" onClick={() => setSelectedQuote(q)}>
            <div className="flex">
              {q.thumbnail && <img src={q.thumbnail} alt="" className="w-24 h-full object-cover hidden sm:block" />}
              <div className="flex-1 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-sm text-white">{q.couple}</p>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusColor[q.status] || 'badge-pending'}`}>
                    {q.status.charAt(0).toUpperCase() + q.status.slice(1)}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-white/30">
                  <span>{q.date}</span>
                  <span>•</span>
                  <span className="text-loverai-gold font-semibold">{q.total}</span>
                  <span>/ {q.budget}</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-white/25">
                  <span>{q.items} items</span>
                  <span>•</span>
                  <span>{q.vendors.slice(0, 2).join(', ')}{q.vendors.length > 2 ? ` +${q.vendors.length - 2}` : ''}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quote Detail Modal */}
      {selectedQuote && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedQuote(null)}>
          <div className="bg-[#1C120C] border border-white/5 rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto custom-scrollbar" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <h2 className="font-heading text-xl text-white flex items-center gap-2">
                <span className="text-loverai-gold">📄</span> {`Quote for ${selectedQuote.couple}`}
              </h2>
              <button onClick={() => setSelectedQuote(null)} className="text-white/30 hover:text-white p-1">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Status & Date */}
              <div className="flex items-center gap-2">
                <span className={`text-xs px-3 py-1 rounded-full font-medium flex items-center gap-1.5 ${statusColor[selectedQuote.status] || 'badge-pending'}`}>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                  {selectedQuote.status.charAt(0).toUpperCase() + selectedQuote.status.slice(1)}
                </span>
                <span className="text-xs text-white/40">Sent {selectedQuote.date}</span>
              </div>

              {/* Budget Row */}
              <div className="flex justify-between items-center bg-white/[0.03] border border-white/[0.08] rounded-xl px-5 py-4">
                <span className="text-sm font-medium text-white/60">Couple Budget</span>
                <span className="text-sm font-bold text-white">{selectedQuote.budget}</span>
              </div>

              {/* Vendors List */}
              <div className="space-y-6">
                {(selectedQuote.itemsData && selectedQuote.itemsData.length > 0) ? selectedQuote.itemsData.map((item, i) => (
                  <div key={i} className="space-y-3">
                    <p className="text-[11px] font-bold text-loverai-gold uppercase tracking-[0.1em]">{item.vendor}</p>
                    <div className="flex gap-4">
                      {item.image && <img src={item.image} alt={item.name} className="w-16 h-12 rounded-lg object-cover" />}
                      <div className="flex-1 flex justify-between">
                        <span className="text-sm text-white/90">{item.name}</span>
                        <span className="text-sm text-loverai-gold">{item.price}</span>
                      </div>
                    </div>
                    <div className="text-right text-xs text-white/40">
                      Subtotal: {item.price}
                    </div>
                  </div>
                )) : (
                  <div className="text-sm text-white/40 p-4 border border-dashed border-white/10 rounded-xl text-center">
                    No detailed items mock data
                  </div>
                )}
              </div>

              {/* Grand Total */}
              <div className="border-t border-white/10 pt-4 flex justify-between items-center">
                <span className="text-lg font-bold text-white">Grand Total</span>
                <span className="text-xl font-heading text-loverai-gold">{selectedQuote.total}</span>
              </div>

              {/* Action Button */}
              <button className="w-full bg-transparent border border-loverai-gold/40 text-loverai-gold font-medium py-3 rounded-xl hover:bg-loverai-gold/10 transition-colors flex justify-center items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                Resend Quote
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
