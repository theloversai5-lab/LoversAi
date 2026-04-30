import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { bidAPI, chatAPI } from '../../api/api';
import { io } from 'socket.io-client';

const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';

const statusColor = {
  open: 'badge-open', pending: 'badge-pending', accepted: 'bg-blue-500/15 text-blue-400 border border-blue-500/25',
  quoted: 'bg-purple-500/15 text-purple-400 border border-purple-500/25', closed: 'badge-closed',
};

export default function PlannerBids() {
  const navigate = useNavigate();
  const [bids, setBids] = useState([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [selectedBid, setSelectedBid] = useState(null);
  const [showChat, setShowChat] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBids = () => {
      bidAPI.getBids().then(res => {
        if (res.success && res.bids?.length > 0) {
          setBids(res.bids.map(b => ({
            _id: b._id,
            couple: b.coupleId?.fullName || 'Couple',
            budget: `₹${(b.budget / 100000).toFixed(1)}L`,
            city: b.location || 'N/A',
            religion: 'N/A', // Bids don't have religion yet, could be added to model
            prompt: b.description || '',
            status: b.status || 'open',
            date: new Date(b.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }),
            images: b.aiImages || [],
            userId: b.coupleId?._id,
          })));
        } else {
          setBids([]);
        }
      }).catch(err => {
        console.error('Failed to fetch bids:', err);
        setBids([]);
      }).finally(() => setLoading(false));
    };

    fetchBids();

    // Socket.io real-time listener for new bids
    const socket = io(apiBaseUrl, { transports: ['websocket', 'polling'] });
    socket.on('new_bid', (data) => {
      console.log('🔔 New bid received:', data.bid);
      fetchBids(); // Re-fetch all bids to ensure consistency and proper sorting
    });

    return () => {
      socket.off('new_bid');
      socket.disconnect();
    };
  }, []);

  const filtered = bids.filter(b => {
    const matchSearch = !search || b.couple.toLowerCase().includes(search.toLowerCase()) || b.city.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'All' || b.status === filterStatus.toLowerCase();
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-5 animate-fadeInUp">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl text-white">Incoming Bids</h1>
          <p className="text-xs text-white/30 mt-1">Couples looking for wedding planners</p>
        </div>
        <span className="badge-open text-xs px-3 py-1 rounded-full font-medium">{filtered.length} bids</span>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by couple or city..."
            className="w-full glass-input rounded-xl pl-10 pr-4 py-2.5 text-sm" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="glass-input rounded-xl px-4 py-2.5 text-sm min-w-[140px]">
          <option value="All">All Status</option>
          <option value="Open">Open</option>
          <option value="Pending">Pending</option>
          <option value="Quoted">Quoted</option>
          <option value="Accepted">Accepted</option>
          <option value="Closed">Closed</option>
        </select>
      </div>

      {/* Bids Table */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left text-[11px] text-white/30 font-medium p-4 uppercase tracking-wider">Couple</th>
                <th className="text-left text-[11px] text-white/30 font-medium p-4 uppercase tracking-wider hidden md:table-cell">Budget</th>
                <th className="text-left text-[11px] text-white/30 font-medium p-4 uppercase tracking-wider hidden md:table-cell">City</th>
                <th className="text-left text-[11px] text-white/30 font-medium p-4 uppercase tracking-wider hidden lg:table-cell">Religion</th>
                <th className="text-left text-[11px] text-white/30 font-medium p-4 uppercase tracking-wider hidden xl:table-cell">AI Vision</th>
                <th className="text-left text-[11px] text-white/30 font-medium p-4 uppercase tracking-wider">Status</th>
                <th className="text-right text-[11px] text-white/30 font-medium p-4 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr><td colSpan={7} className="p-8 text-center text-white/30">Loading bids...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="p-8 text-center text-white/30">No bids match your filters</td></tr>
              ) : filtered.map(bid => (
                <tr key={bid._id} className="hover:bg-white/[0.02] transition cursor-pointer" onClick={() => setSelectedBid(bid)}>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-loverai-gold/30 to-amber-800/30 flex items-center justify-center text-loverai-gold font-heading text-sm shrink-0">
                        {bid.couple.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{bid.couple}</p>
                        <p className="text-[10px] text-white/25 sm:hidden">{bid.city} · {bid.budget}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-white/60 hidden md:table-cell">{bid.budget}</td>
                  <td className="p-4 text-sm text-white/60 hidden md:table-cell">{bid.city}</td>
                  <td className="p-4 text-sm text-white/40 hidden lg:table-cell">{bid.religion}</td>
                  <td className="p-4 hidden xl:table-cell">
                    {bid.images?.[0] && <img src={bid.images[0]?.url || bid.images[0]} alt="Moodboard Vision" className="w-16 h-10 rounded-md object-cover border border-white/10" />}
                  </td>
                  <td className="p-4">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusColor[bid.status] || 'badge-pending'}`}>
                      {bid.status.charAt(0).toUpperCase() + bid.status.slice(1)}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button className="text-loverai-gold/60 hover:text-loverai-gold transition">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bid Detail Modal */}
      {selectedBid && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => { setSelectedBid(null); setShowChat(false); }}>
          <div className="glass-card-strong rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <div>
                <h2 className="font-heading text-xl text-white">{selectedBid.couple}</h2>
                <p className="text-xs text-white/30 mt-0.5">{selectedBid.city} · {selectedBid.religion} · {selectedBid.budget}</p>
              </div>
              <button onClick={() => { setSelectedBid(null); setShowChat(false); }} className="text-white/30 hover:text-white transition p-1">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              {selectedBid.prompt && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-white/30 mb-1">AI Vision Prompt</p>
                  <p className="text-sm text-white/70 italic">"{selectedBid.prompt}"</p>
                </div>
              )}
              {selectedBid.images?.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-white/30 mb-2">Vision Images</p>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedBid.images.map((img, i) => (
                      <img key={i} src={img.url || img} alt="Vision preview" className="w-full h-28 rounded-lg object-cover border border-white/10" />
                    ))}
                  </div>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowChat(!showChat)} className="flex-1 loverai-btn-outline text-sm py-2.5 rounded-xl flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                  Message Couple
                </button>
                <button onClick={() => navigate(`/planner/build-quote/${selectedBid._id}`)} className="flex-1 loverai-btn-primary text-sm py-2.5 rounded-xl flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  Build Quote
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
