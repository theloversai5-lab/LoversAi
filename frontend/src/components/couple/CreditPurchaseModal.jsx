import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PricingCards from '../PricingCards';

const CreditPurchaseModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-[1200px] max-h-[90vh] overflow-y-auto rounded-3xl border border-white/15 bg-[#140c09]/60 backdrop-blur-3xl shadow-2xl shadow-black/50 loverai-scrollbar"
        >
          {/* Close Button */}
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 p-2 rounded-full bg-black/40 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-all z-50 backdrop-blur-md"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>

          {/* Modal Content Header */}
          <div className="pt-12 pb-6 px-6 text-center">
            <h2 className="text-3xl md:text-4xl font-light text-white font-['Cormorant_Garamond']">
              Upgrade Your Credits
            </h2>
            <p className="mt-3 text-white/60 text-sm max-w-lg mx-auto">
              Get more credits to unlock unlimited AI moodboards, high-resolution downloads, and exclusive premium themes.
            </p>
          </div>

          {/* Pricing Cards Container */}
          <div className="pb-12 px-6">
            <PricingCards />
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CreditPurchaseModal;
