import React, { useState, useEffect } from "react";
import { paymentAPI } from "../../api/api";
import { format } from "date-fns";
import { CreditCard, History, Zap, ArrowRight, AlertCircle, Package } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function PlannerWallet({ onClose }) {
  const [walletData, setWalletData] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchWalletAndTransactions(1);
  }, []);

  const fetchWalletAndTransactions = async (page) => {
    try {
      setLoading(true);
      const [creditsRes, historyRes] = await Promise.all([
        paymentAPI.getCredits('planner'),
        paymentAPI.getTransactions({ page, limit: 10, wallet: 'planner' })
      ]);

      if (creditsRes.success) {
        setWalletData(creditsRes);
      }
      
      if (historyRes.success) {
        setTransactions(historyRes.transactions);
        setPagination(historyRes.pagination);
      }
    } catch (error) {
      console.error("Error fetching wallet data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full h-full min-h-[400px] flex items-center justify-center p-8 bg-black/40 backdrop-blur-md rounded-2xl border border-white/10">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-pink-500/30 border-t-pink-500 rounded-full animate-spin mb-4"></div>
          <p className="text-white/60">Loading Wallet...</p>
        </div>
      </div>
    );
  }

  // Derive usage metrics securely from backend data
  const plan = walletData?.plan || 'Free';
  const totalCredits = walletData?.wallet?.subscriptionCredits || 0;
  const remaining = walletData?.credits || 0;
  const used = totalCredits > 0 ? Math.max(0, totalCredits - remaining) : 0;
  const progressPercent = totalCredits > 0 ? Math.min(100, (used / totalCredits) * 100) : 0;

  return (
    <div className="w-full bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6 lg:p-8 flex flex-col space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-pink-400" />
            AI Wallet & Credits
          </h2>
          <p className="text-white/60 text-sm mt-1">Manage your credits and generation history</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm text-white/80 transition-colors">
            Close
          </button>
        )}
      </div>

      {/* Insufficient Credits Banner */}
      {remaining < 10 && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-rose-400 font-medium">Low Credits</h4>
            <p className="text-sm text-rose-400/80 mt-1">
              You are running low on AI generation credits. Upgrade your plan to continue using Planner AI tools without interruption.
            </p>
          </div>
        </div>
      )}

      {/* Credit Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-pink-500/20 rounded-xl p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Zap className="w-16 h-16" />
          </div>
          <h3 className="text-white/60 text-sm font-medium mb-1">Available Credits</h3>
          <p className="text-3xl font-bold text-white">{remaining}</p>
          <div className="mt-4 flex items-center gap-2">
            <button onClick={() => { if (onClose) onClose(); navigate('/pricing'); }} className="flex items-center gap-1 text-xs font-semibold text-pink-400 hover:text-pink-300 transition-colors">
              Upgrade Plan <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-5">
          <h3 className="text-white/60 text-sm font-medium mb-1 flex items-center gap-1">
            <Package className="w-4 h-4" /> Current Plan
          </h3>
          <p className="text-xl font-semibold text-white capitalize">{plan.replace('planner_', '')}</p>
          <p className="text-xs text-white/40 mt-1">Monthly allocation: {totalCredits}</p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-white/60 text-sm font-medium mb-1">Usage</h3>
            <p className="text-xl font-semibold text-white">{used} <span className="text-sm font-normal text-white/40">/ {totalCredits}</span></p>
          </div>
          <div className="mt-4 w-full bg-black/40 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-pink-500 to-purple-500 h-2 rounded-full transition-all duration-500" 
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Transaction History */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
          <History className="w-5 h-5 text-white/60" />
          Transaction History
        </h3>
        
        {transactions.length === 0 ? (
          <div className="text-center py-8 text-white/40 bg-white/5 rounded-xl border border-white/5">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No transactions found.</p>
          </div>
        ) : (
          <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-white/80">
                <thead className="bg-black/20 text-white/60">
                  <tr>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Description</th>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {transactions.map((tx) => (
                    <tr key={tx._id} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap text-white/60">
                        {format(new Date(tx.createdAt), "MMM d, yyyy h:mm a")}
                      </td>
                      <td className="px-4 py-3">{tx.reference}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${
                          tx.type === 'credit' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                        }`}>
                          {tx.type}
                        </span>
                      </td>
                      <td className={`px-4 py-3 text-right font-medium ${
                        tx.type === 'credit' ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        {tx.type === 'credit' ? '+' : '-'}{tx.amount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Pagination Controls */}
            {pagination.totalPages > 1 && (
              <div className="px-4 py-3 border-t border-white/10 flex items-center justify-between bg-black/10">
                <button 
                  onClick={() => fetchWalletAndTransactions(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="text-xs text-white/60 hover:text-white disabled:opacity-30 disabled:hover:text-white/60 transition-colors"
                >
                  Previous
                </button>
                <span className="text-xs text-white/40">Page {pagination.page} of {pagination.totalPages}</span>
                <button 
                  onClick={() => fetchWalletAndTransactions(pagination.page + 1)}
                  disabled={pagination.page === pagination.totalPages}
                  className="text-xs text-white/60 hover:text-white disabled:opacity-30 disabled:hover:text-white/60 transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
