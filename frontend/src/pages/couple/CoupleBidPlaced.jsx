import React from 'react';
import { useNavigate } from 'react-router-dom';

const CoupleBidPlaced = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen loverai-page-bg flex items-center justify-center pt-20 px-4">
      <div className="max-w-md w-full glass-card rounded-3xl p-10 text-center animate-fadeInUp">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center border border-green-500/20">
            <svg className="w-10 h-10 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
        <h1 className="font-heading text-4xl text-white mb-4">Bid Placed!</h1>
        <p className="text-white/60 mb-8 text-sm">
          Your wedding vision has been successfully submitted to planners. They will review your details and send you personalized quotes shortly.
        </p>
        <div className="space-y-4">
          <button
            onClick={() => navigate('/couple/profile')}
            className="w-full loverai-btn-primary !rounded-xl !py-4 text-sm font-semibold hover:shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-shadow"
          >
            Track Bid Progress
          </button>
          <button
            onClick={() => navigate('/couples')}
            className="w-full bg-white/5 text-white/70 hover:bg-white/10 hover:text-white rounded-xl py-4 flex items-center justify-center transition-all text-sm font-semibold"
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default CoupleBidPlaced;
