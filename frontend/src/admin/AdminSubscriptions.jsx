import React, { useState, useEffect } from 'react';
import { adminAPI } from '../api/api';

const AdminSubscriptions = () => {
  const [payments, setPayments] = useState([]);
  const [filteredPayments, setFilteredPayments] = useState([]);
  const [stats, setStats] = useState({
    mtdRevenue: '₹ 0.00',
    activeSubs: 0,
    failedRate: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPlan, setFilterPlan] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const fetchLedger = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminAPI.getRazorpayLedger();
      if (data.success) {
        setPayments(data.payments || []);
        setFilteredPayments(data.payments || []);
        setStats(data.stats || { mtdRevenue: '₹ 0.00', activeSubs: 0, failedRate: 0 });
      } else {
        setError(data.error || 'Failed to load Razorpay ledger data');
      }
    } catch (err) {
      console.error('fetchLedger error:', err);
      setError(err?.response?.data?.error || 'Failed to connect to the backend server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLedger();
  }, []);

  // Filter and Search logic
  useEffect(() => {
    let result = [...payments];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (p) =>
          p.user.toLowerCase().includes(term) ||
          (p.fullName && p.fullName.toLowerCase().includes(term)) ||
          p.id.toLowerCase().includes(term) ||
          p.orderId.toLowerCase().includes(term)
      );
    }

    if (filterPlan) {
      result = result.filter((p) => p.plan === filterPlan);
    }

    if (filterStatus) {
      result = result.filter((p) => p.status === filterStatus);
    }

    setFilteredPayments(result);
  }, [searchTerm, filterPlan, filterStatus, payments]);

  // Extract unique plans for filter dropdown
  const uniquePlans = Array.from(new Set(payments.map((p) => p.plan))).filter(Boolean);

  // Export CSV
  const handleExportCSV = () => {
    if (filteredPayments.length === 0) return;

    const headers = ["Payment ID", "Order ID", "Customer Email", "Customer Name", "Plan Acquired", "Amount (INR)", "Date/Time", "Status"];
    const rows = filteredPayments.map((p) => [
      p.id,
      p.orderId,
      p.user,
      p.fullName || 'N/A',
      p.plan,
      p.amount,
      new Date(p.date).toLocaleString(),
      p.status
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.map(val => `"${val}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `razorpay_ledger_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="pt-24 md:pt-28 px-4 sm:px-6 lg:px-8 pb-12 w-full max-w-7xl mx-auto">
      {/* Header */}
      <div 
        className="rounded-2xl p-6 transition-all duration-300 mb-8"
        style={{
          background: 'linear-gradient(152.97deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.03) 100%)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.10)',
        }}
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-emerald-300 bg-clip-text text-transparent">
                Razorpay Ledger
              </h1>
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                {filteredPayments.length} Payments
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-400">Track real-time subscription payments, invoices, and payment statuses via Razorpay.</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={fetchLedger}
              className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium text-gray-300 bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-all"
            >
              Refresh
            </button>
            <button
              onClick={handleExportCSV}
              disabled={filteredPayments.length === 0}
              className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold text-[#F5E8E1] bg-[#D48C8C] hover:scale-105 transition-all shadow-[0_10px_26px_rgba(0,0,0,0.28)] disabled:opacity-50 disabled:scale-100"
            >
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-8 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl">
          {error}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20 backdrop-blur-xl rounded-2xl p-6">
           <h4 className="text-xs text-emerald-500 font-bold uppercase tracking-widest mb-1">MTD Revenue</h4>
           <div className="text-3xl font-light text-white font-mono">{loading ? '...' : stats.mtdRevenue}</div>
        </div>
        <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20 backdrop-blur-xl rounded-2xl p-6">
           <h4 className="text-xs text-purple-500 font-bold uppercase tracking-widest mb-1">Active Subs</h4>
           <div className="text-3xl font-light text-white font-mono">{loading ? '...' : stats.activeSubs.toLocaleString()}</div>
        </div>
        <div className="bg-gradient-to-br from-rose-500/10 to-rose-600/5 border border-rose-500/20 backdrop-blur-xl rounded-2xl p-6">
           <h4 className="text-xs text-rose-500 font-bold uppercase tracking-widest mb-1">Failed Rate</h4>
           <div className="text-3xl font-light text-white font-mono">{loading ? '...' : `${stats.failedRate}%`}</div>
        </div>
      </div>

      {/* Filters */}
      <div 
        className="rounded-2xl p-5 mb-8 transition-all duration-300"
        style={{
          background: 'linear-gradient(152.97deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.10)',
        }}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <input
              type="text"
              placeholder="Search by customer, payment or order ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all"
            />
          </div>
          <div>
            <select
              value={filterPlan}
              onChange={(e) => setFilterPlan(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50"
            >
              <option value="" className="bg-gray-900">All Plans</option>
              {uniquePlans.map((plan) => (
                <option key={plan} value={plan} className="bg-gray-900">
                  {plan}
                </option>
              ))}
            </select>
          </div>
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50"
            >
              <option value="" className="bg-gray-900">All Statuses</option>
              <option value="Captured" className="bg-gray-900">Captured</option>
              <option value="Failed" className="bg-gray-900">Failed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Ledger Table */}
      <div 
        className="rounded-2xl overflow-hidden"
        style={{
          background: 'linear-gradient(152.97deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.10)',
        }}
      >
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-white/10 text-white">
            <thead className="bg-white/5">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Payment ID / Order ID</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Plan Acquired</th>
                <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Amount (INR)</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Razorpay Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-400">
                    Loading ledger data...
                  </td>
                </tr>
              ) : filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-400">
                    No transactions found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredPayments.map((pay, i) => (
                   <tr key={i} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-400">
                        <div>{pay.id}</div>
                        <div className="text-[10px] text-gray-600">{pay.orderId}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-amber-400">
                        <div>{pay.user}</div>
                        {pay.fullName && (
                          <div className="text-xs text-gray-500 font-normal">{pay.fullName}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        <span className="font-medium bg-black/40 px-2 py-1 rounded text-xs">{pay.plan}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-emerald-400 text-right">{pay.amount}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{new Date(pay.date).toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 py-1 rounded text-[10px] tracking-wider uppercase font-bold ${pay.status === 'Captured' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'}`}>
                          {pay.status}
                        </span>
                      </td>
                   </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        <div className="p-4 border-t border-white/10 text-center">
            <span className="text-xs text-white/30">Showing latest transactions fetched from database. Access full ledger in Razorpay Console.</span>
        </div>
      </div>
    </div>
  );
};

export default AdminSubscriptions;
