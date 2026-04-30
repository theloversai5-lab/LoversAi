import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { vendorAPI } from '../../api/api';

const activityDot = { request: 'bg-amber-400', earning: 'bg-emerald-400', message: 'bg-blue-400', view: 'bg-purple-400' };

export default function VendorDashboard() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ newRequestsToday: 0, activeQuotes: 0, earningsThisMonth: '₹0' });
  const [performance, setPerformance] = useState({ quoteAcceptanceRate: 0, avgResponseTime: 'N/A', portfolioViews: 0, repeatPlanners: 0 });
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    vendorAPI.getDashboard().then(res => {
      if (res.success) {
        setStats(res.stats || stats);
        setPerformance(res.performance || performance);
        setActivity(res.activity || []);
      }
    }).catch(err => {
      console.error('Dashboard fetch error:', err);
    }).finally(() => setLoading(false));
  }, []);

  const businessName = currentUser?.vendorProfile?.businessName || currentUser?.fullName || currentUser?.email?.split('@')[0] || 'Vendor';

  return (
    <div className="space-y-6 animate-fadeInUp">
      {/* ── Welcome Card (matches piyush_loverai reference) ── */}
      <div className="glass-card-strong rounded-2xl p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-loverai-gold/10 via-transparent to-purple-500/5 pointer-events-none" />
        <div className="relative">
          <h1 className="font-heading text-2xl sm:text-3xl text-white mb-2">
            Welcome back, <span className="loverai-gradient-text">{businessName}</span> ✨
          </h1>
          <p className="text-white/40 text-sm mb-4">Your wedding vendors hub — manage inventory, respond to planners, and grow your business.</p>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => navigate('/vendor/requests')} className="loverai-btn-primary text-sm py-2 px-4 rounded-xl flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              View Requests
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
            <button onClick={() => navigate('/vendor/inventory')} className="loverai-btn-outline text-sm py-2 px-4 rounded-xl">
              Manage Inventory
            </button>
          </div>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'New Requests Today', value: loading ? '...' : stats.newRequestsToday, color: 'bg-amber-500/15 text-amber-400', icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> },
          { label: 'Active Quotes', value: loading ? '...' : stats.activeQuotes, color: 'bg-blue-500/15 text-blue-400', icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg> },
          { label: 'Earnings This Month', value: loading ? '...' : stats.earningsThisMonth, color: 'bg-emerald-500/15 text-emerald-400', icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
        ].map(s => (
          <div key={s.label} className="glass-card rounded-2xl p-5 hover-lift hover-glow">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${s.color}`}>{s.icon}</div>
              <div>
                <p className="text-2xl font-heading text-white">{s.value}</p>
                <p className="text-xs text-white/40">{s.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Performance + Recent Activity (matches piyush_loverai reference layout) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Performance — list layout matching reference */}
        <div className="glass-card rounded-2xl p-5 space-y-4">
          <h2 className="font-heading text-lg text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-loverai-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
            Performance
          </h2>
          <div className="space-y-3">
            {/* Acceptance Rate Bar */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-sm text-white/40">Quote Acceptance Rate</span>
                <span className="text-sm font-semibold text-emerald-400">{loading ? '...' : `${performance.quoteAcceptanceRate}%`}</span>
              </div>
              <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-700" style={{ width: `${performance.quoteAcceptanceRate}%` }} />
              </div>
            </div>
            {/* List metrics */}
            <div className="flex justify-between items-center">
              <span className="text-sm text-white/40">Response Time</span>
              <span className="text-sm font-semibold text-loverai-gold">{loading ? '...' : performance.avgResponseTime}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-white/40">Portfolio Views</span>
              <span className="text-sm font-semibold text-blue-400">{loading ? '...' : `${performance.portfolioViews} total`}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-white/40">Repeat Planners</span>
              <span className="text-sm font-semibold text-amber-400">{loading ? '...' : performance.repeatPlanners}</span>
            </div>
          </div>
        </div>

        {/* Activity Feed */}
        <div className="glass-card rounded-2xl p-5 space-y-3">
          <h2 className="font-heading text-lg text-white">Recent Activity</h2>
          <div className="space-y-2">
            {loading ? (
              <p className="text-sm text-white/30 text-center py-4">Loading activity...</p>
            ) : activity.length === 0 ? (
              <p className="text-sm text-white/30 text-center py-4">No recent activity. Start by completing your profile!</p>
            ) : activity.map(a => (
              <div key={a.id} className="flex items-start gap-3 p-3 glass-card-subtle rounded-xl">
                <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${activityDot[a.type] || 'bg-white/20'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white/70">{a.text}</p>
                  <p className="text-[10px] text-white/20 mt-0.5">{a.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
