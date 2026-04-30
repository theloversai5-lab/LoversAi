import React from 'react';

const AdminSubscriptions = () => {
  const mockPayments = [
    { id: 'pay_ABC123', orderId: 'order_ABC123', user: 'couple_88', plan: 'Basic', amount: '₹ 4,349', status: 'Captured', date: '21 Oct 2026' },
    { id: 'pay_XYZ789', orderId: 'order_XYZ789', user: 'planner_max', plan: 'Premium', amount: '₹ 9,349', status: 'Captured', date: '20 Oct 2026' },
    { id: 'pay_DEF456', orderId: 'order_DEF456', user: 'user_new', plan: 'Basic', amount: '₹ 4,349', status: 'Failed', date: '19 Oct 2026' },
    { id: 'pay_LMN012', orderId: 'order_LMN012', user: 'couple_xyz', plan: 'TopUp (10)', amount: '₹ 170', status: 'Captured', date: '18 Oct 2026' },
  ];

  return (
    <div className="pt-24 md:pt-28 px-4 sm:px-6 lg:px-8 pb-12 w-full max-w-7xl mx-auto">
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
            <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-emerald-300 bg-clip-text text-transparent">
              Razorpay Ledger
            </h1>
            <p className="mt-1 text-sm text-gray-400">Track real-time subscription payments, invoices, and payment statuses via Razorpay.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20 backdrop-blur-xl rounded-2xl p-4">
           <h4 className="text-xs text-emerald-500 font-bold uppercase tracking-widest mb-1">MTD Revenue</h4>
           <div className="text-2xl font-light text-white font-mono">₹ 142,500</div>
        </div>
        <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20 backdrop-blur-xl rounded-2xl p-4">
           <h4 className="text-xs text-purple-500 font-bold uppercase tracking-widest mb-1">Active Subs</h4>
           <div className="text-2xl font-light text-white font-mono">1,024</div>
        </div>
        <div className="bg-gradient-to-br from-rose-500/10 to-rose-600/5 border border-rose-500/20 backdrop-blur-xl rounded-2xl p-4">
           <h4 className="text-xs text-rose-500 font-bold uppercase tracking-widest mb-1">Failed Rate</h4>
           <div className="text-2xl font-light text-white font-mono">2.1%</div>
        </div>
        <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl p-4 flex flex-col justify-center gap-2">
           <button className="text-xs font-bold text-white bg-white/10 px-3 py-1.5 rounded w-full hover:bg-white/20 transition">Sync Webhooks</button>
           <button className="text-xs font-bold text-white bg-white/10 px-3 py-1.5 rounded w-full hover:bg-white/20 transition">Export CSV</button>
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
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider text-right">Amount (INR)</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Razorpay Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {mockPayments.map((pay, i) => (
                 <tr key={i} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-400">
                      <div>{pay.id}</div>
                      <div className="text-[10px] text-gray-600">{pay.orderId}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-amber-400">{pay.user}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      <span className="font-medium bg-black/40 px-2 py-1 rounded text-xs">{pay.plan}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-emerald-400 text-right">{pay.amount}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{pay.date}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 rounded text-[10px] tracking-wider uppercase font-bold ${pay.status === 'Captured' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'}`}>
                        {pay.status}
                      </span>
                    </td>
                 </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="p-4 border-t border-white/10 text-center">
            <span className="text-xs text-white/30">Showing last 4 transactions. Access full ledger in Razorpay Console.</span>
        </div>
      </div>
    </div>
  );
};

export default AdminSubscriptions;
