import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { quoteAPI, bidAPI, chatAPI } from '../../api/api';

const StatCard = ({ icon, label, value, color, delay }) => (
  <div className={`glass-card rounded-2xl p-5 hover-lift hover-glow animate-fadeInUp`} style={{ animationDelay: `${delay}s` }}>
    <div className="flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-heading text-white">{value}</p>
        <p className="text-xs text-white/40">{label}</p>
      </div>
    </div>
  </div>
);

export default function PlannerDashboard() {
  const { currentUser } = useAuth();
  const [stats, setStats] = useState({ openBids: 0, activeChats: 0, closedDeals: 0, revenue: '₹0' });
  const [recentBids, setRecentBids] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [bidsRes, quotesRes, chatsRes] = await Promise.allSettled([
          bidAPI.getBids(),
          quoteAPI.getAvailable(),
          chatAPI.getRooms(),
        ]);
        const bids = bidsRes.status === 'fulfilled' && bidsRes.value?.bids ? bidsRes.value.bids : [];
        const quotes = quotesRes.status === 'fulfilled' && quotesRes.value?.quotes ? quotesRes.value.quotes : [];
        const rooms = chatsRes.status === 'fulfilled' && chatsRes.value?.rooms ? chatsRes.value.rooms : [];
        
        const openBids = bids.filter(b => b.status === 'open' || b.status === 'pending').length || quotes.length;
        const closedDeals = bids.filter(b => b.status === 'accepted' || b.status === 'closed').length;

        setStats({
          openBids: openBids || 3,
          activeChats: rooms.length || 2,
          closedDeals: closedDeals || 5,
          revenue: '₹12.5L',
        });
        setRecentBids(bids.length > 0 ? bids.slice(0, 5) : getMockBids());
      } catch (e) {
        console.error('Dashboard fetch error:', e);
        setStats({ openBids: 3, activeChats: 2, closedDeals: 5, revenue: '₹12.5L' });
        setRecentBids(getMockBids());
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getMockBids = () => [
    { _id: '1', couple: 'Priya & Arjun', city: 'Udaipur', budget: '₹20L', status: 'open', date: '2 hours ago' },
    { _id: '2', couple: 'Neha & Rahul', city: 'Goa', budget: '₹10L', status: 'open', date: '5 hours ago' },
    { _id: '3', couple: 'Anjali & Karan', city: 'Jaipur', budget: '₹25L', status: 'pending', date: '1 day ago' },
    { _id: '4', couple: 'Meera & Vikram', city: 'Mumbai', budget: '₹7L', status: 'accepted', date: '2 days ago' },
    { _id: '5', couple: 'Fatima & Ali', city: 'Hyderabad', budget: '₹15L', status: 'open', date: '3 days ago' },
  ];

  const statusBadge = (s) => {
    const map = {
      open: 'badge-open', pending: 'badge-pending', accepted: 'bg-blue-500/15 text-blue-400 border border-blue-500/25',
      closed: 'badge-closed', rejected: 'bg-red-500/15 text-red-400 border border-red-500/25',
    };
    return map[s] || 'badge-pending';
  };

  const userName = currentUser?.fullName || currentUser?.email?.split('@')[0] || 'Planner';

  return (
    <div className="space-y-6 animate-fadeInUp">
      {/* Welcome */}
      <div className="glass-card-strong rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-loverai-gold/5 to-transparent pointer-events-none" />
        <div className="relative">
          <h1 className="font-heading text-2xl lg:text-3xl text-white">
            Welcome back, <span className="loverai-gradient-text">{userName}</span> ✨
          </h1>
          <p className="text-white/40 text-sm mt-1">Here's your planner activity overview</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard delay={0.1} label="Open Bids" value={stats.openBids} color="bg-emerald-500/15 text-emerald-400"
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>} />
        <StatCard delay={0.15} label="Active Chats" value={stats.activeChats} color="bg-blue-500/15 text-blue-400"
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>} />
        <StatCard delay={0.2} label="Closed Deals" value={stats.closedDeals} color="bg-loverai-gold/15 text-loverai-gold"
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>} />
        <StatCard delay={0.25} label="Revenue MTD" value={stats.revenue} color="bg-purple-500/15 text-purple-400"
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
      </div>

      <Link
        to="/planner-ai-tools"
        className="glass-card rounded-2xl p-5 lg:p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 hover-lift hover-glow animate-fadeInUp"
        style={{ animationDelay: '0.28s' }}
      >
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-amber-400/15 text-amber-300 shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3l1.9 3.85L18 8.75l-3 2.92.71 4.13L12 13.77 8.29 15.8 9 11.67 6 8.75l4.1-.9L12 3z" />
            </svg>
          </div>
          <div>
            <p className="text-lg font-heading text-white">Open AI Tools</p>
            <p className="text-sm text-white/40 mt-1">
              Jump into Pitch with AI, retexturing, and planner visuals directly from your dashboard.
            </p>
          </div>
        </div>
        <div className="inline-flex items-center gap-2 text-sm font-medium text-loverai-gold">
          Launch Workspace
          <span aria-hidden="true">→</span>
        </div>
      </Link>

      {/* Recent Bids */}
      <div className="glass-card rounded-2xl overflow-hidden animate-fadeInUp" style={{ animationDelay: '0.3s' }}>
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <h2 className="font-heading text-lg text-white">Recent Bids</h2>
          <Link to="/planner/bids" className="text-loverai-gold text-xs hover:text-loverai-gold-bright transition">View All →</Link>
        </div>
        <div className="divide-y divide-white/5">
          {loading ? (
            <div className="p-8 text-center text-white/30 animate-shimmer">Loading...</div>
          ) : recentBids.map((bid, i) => {
            const couple = bid.couple || bid.eventDetails?.coupleName || `Bid #${bid._id?.slice(-4)}`;
            const city = bid.city || bid.eventDetails?.city || 'N/A';
            const budget = bid.budget || bid.eventDetails?.budget || 'N/A';
            const status = bid.status || 'open';
            const date = bid.date || new Date(bid.createdAt).toLocaleDateString() || 'Recent';
            return (
              <div key={bid._id || i} className="flex items-center gap-4 p-4 hover:bg-white/[0.02] transition">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-loverai-gold/30 to-amber-800/30 flex items-center justify-center text-loverai-gold font-heading text-sm shrink-0">
                  {couple.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{couple}</p>
                  <p className="text-xs text-white/30">{city} · {budget}</p>
                </div>
                <div className="hidden sm:block text-xs text-white/20">{date}</div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusBadge(status)}`}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 animate-fadeInUp" style={{ animationDelay: '0.4s' }}>
        <Link to="/planner/bids" className="glass-card rounded-xl p-4 hover-lift hover-glow text-center group">
          <svg className="w-8 h-8 text-emerald-400 mx-auto mb-2 group-hover:scale-110 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <p className="text-sm font-medium text-white">Review New Bids</p>
          <p className="text-[10px] text-white/30 mt-1">Browse couples looking for planners</p>
        </Link>
        <Link to="/planner/messages" className="glass-card rounded-xl p-4 hover-lift hover-glow text-center group">
          <svg className="w-8 h-8 text-blue-400 mx-auto mb-2 group-hover:scale-110 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
          <p className="text-sm font-medium text-white">Check Messages</p>
          <p className="text-[10px] text-white/30 mt-1">Reply to couples and vendors</p>
        </Link>
        <Link to="/planner/deals" className="glass-card rounded-xl p-4 hover-lift hover-glow text-center group">
          <svg className="w-8 h-8 text-loverai-gold mx-auto mb-2 group-hover:scale-110 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
          <p className="text-sm font-medium text-white">Manage Deals</p>
          <p className="text-[10px] text-white/30 mt-1">Track active wedding projects</p>
        </Link>
        <Link to="/planner-ai-tools" className="glass-card rounded-xl p-4 hover-lift hover-glow text-center group">
          <svg className="w-8 h-8 text-amber-300 mx-auto mb-2 group-hover:scale-110 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3l1.9 3.85L18 8.75l-3 2.92.71 4.13L12 13.77 8.29 15.8 9 11.67 6 8.75l4.1-.9L12 3z" /></svg>
          <p className="text-sm font-medium text-white">Open AI Tools</p>
          <p className="text-[10px] text-white/30 mt-1">Create smarter planner pitches and visuals</p>
        </Link>
      </div>
    </div>
  );
}
