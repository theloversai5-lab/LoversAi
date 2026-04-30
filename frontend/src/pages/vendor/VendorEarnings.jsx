import React, { useState, useEffect } from 'react';
import { vendorAPI } from '../../api/api';

const mockTransactions = [
  { id: 'TXN-001', planner: 'Dream Events', amount: '₹1.2L', date: 'Mar 25, 2026', status: 'Paid' },
  { id: 'TXN-002', planner: 'Beach Weddings Co', amount: '₹85K', date: 'Mar 22, 2026', status: 'Paid' },
  { id: 'TXN-003', planner: 'Luxe Weddings', amount: '₹2.5L', date: 'Mar 18, 2026', status: 'Pending' },
  { id: 'TXN-004', planner: 'City Celebrations', amount: '₹60K', date: 'Mar 14, 2026', status: 'Paid' },
  { id: 'TXN-005', planner: 'Royal Planners', amount: '₹1.8L', date: 'Mar 10, 2026', status: 'Paid' },
  { id: 'TXN-006', planner: 'Dream Events', amount: '₹90K', date: 'Mar 5, 2026', status: 'Paid' },
];

export default function VendorEarnings() {
  const [earnings, setEarnings] = useState({ thisMonth: '₹3.8L', lastMonth: '₹3.4L', lifetime: '₹28.5L', growth: '+12%' });
  const [transactions, setTransactions] = useState(mockTransactions);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    vendorAPI.getEarnings().then(res => {
      if (res.success && res.earnings) {
        setEarnings({
          thisMonth: res.earnings.thisMonth || earnings.thisMonth,
          lastMonth: res.earnings.lastMonth || earnings.lastMonth,
          lifetime: res.earnings.lifetime || earnings.lifetime,
          growth: res.earnings.growth || earnings.growth,
        });
        if (res.transactions?.length > 0) setTransactions(res.transactions);
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 animate-fadeInUp">
      <h1 className="font-heading text-2xl text-white">Earnings</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card-strong rounded-2xl p-5 hover-glow relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none" />
          <div className="relative">
            <p className="text-xs text-white/30">This Month</p>
            <div className="flex items-baseline gap-2 mt-1">
              <p className="text-2xl font-heading loverai-gradient-text">{earnings.thisMonth}</p>
              <span className="text-xs text-emerald-400 font-medium">{earnings.growth}</span>
            </div>
          </div>
        </div>
        <div className="glass-card rounded-2xl p-5 hover-glow">
          <p className="text-xs text-white/30">Last Month</p>
          <p className="text-2xl font-heading text-white mt-1">{earnings.lastMonth}</p>
        </div>
        <div className="glass-card rounded-2xl p-5 hover-glow">
          <p className="text-xs text-white/30">Total Lifetime</p>
          <p className="text-2xl font-heading text-white mt-1">{earnings.lifetime}</p>
        </div>
      </div>

      {/* Transaction History */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-white/5">
          <h2 className="font-heading text-lg text-white">Transaction History</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left text-[11px] text-white/30 font-medium p-4 uppercase tracking-wider">TXN ID</th>
                <th className="text-left text-[11px] text-white/30 font-medium p-4 uppercase tracking-wider">Planner</th>
                <th className="text-left text-[11px] text-white/30 font-medium p-4 uppercase tracking-wider">Amount</th>
                <th className="text-left text-[11px] text-white/30 font-medium p-4 uppercase tracking-wider hidden sm:table-cell">Date</th>
                <th className="text-left text-[11px] text-white/30 font-medium p-4 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {transactions.map(t => (
                <tr key={t.id} className="hover:bg-white/[0.02] transition">
                  <td className="p-4 text-xs text-white/30 font-mono">{t.id}</td>
                  <td className="p-4 text-sm font-medium text-white">{t.planner}</td>
                  <td className="p-4 text-sm font-semibold text-loverai-gold">{t.amount}</td>
                  <td className="p-4 text-xs text-white/30 hidden sm:table-cell">{t.date}</td>
                  <td className="p-4">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${t.status === 'Paid' ? 'badge-open' : 'badge-pending'}`}>{t.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
