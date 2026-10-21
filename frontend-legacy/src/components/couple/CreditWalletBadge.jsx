import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { creditAPI } from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import CreditPurchaseModal from './CreditPurchaseModal';

const CreditWalletBadge = () => {
  const { currentUser } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchWallet = async () => {
    try {
      const data = await creditAPI.getWallet();
      setWallet(data.data);
    } catch (err) {
      console.error("Failed to load wallet", err);
    } finally {
      setLoading(false);
    }
  };

  // Poll wallet every 15 seconds to ensure it's always up to date after generations
  useEffect(() => {
    if (currentUser) {
      fetchWallet();
      const interval = setInterval(fetchWallet, 15000);
      return () => clearInterval(interval);
    }
  }, [currentUser]);

  if (!currentUser || loading) return null;

  const rawPlan = currentUser?.plan || wallet?.plan || "Free";
  const cleanPlan = String(rawPlan).replace(/^couple_|^planner_/, "");
  const planName = cleanPlan.charAt(0).toUpperCase() + cleanPlan.slice(1);
  const credits = wallet?.credits ?? currentUser?.credits ?? 0;

  return (
    <>
      <motion.div 
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={() => setShowModal(true)}
      className="flex items-center gap-3 backdrop-blur-xl bg-white/10 border border-white/20 shadow-xl px-4 py-2 rounded-full cursor-pointer hover:bg-white/15 hover:scale-105 active:scale-95 transition-all duration-300 mr-2"
    >
      <div className="flex flex-col text-right">
        <span className="text-[10px] text-white/70 uppercase tracking-wider font-semibold">{planName} Plan</span>
        <span className="text-sm text-white font-bold">{credits} Credits</span>
      </div>
      <div className="w-8 h-8 rounded-full bg-[#f2dad0] flex items-center justify-center shadow-lg shadow-[#f2dad0]/20">
        <svg className="w-4 h-4 text-[#3D1B2D]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </div>
    </motion.div>

      <CreditPurchaseModal 
        isOpen={showModal} 
        onClose={() => setShowModal(false)} 
      />
    </>
  );
};

export default CreditWalletBadge;
