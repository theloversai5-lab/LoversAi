import React from 'react';

const Maintenance = () => {
  return (
    <div 
      className="min-h-screen w-full flex flex-col items-center justify-center relative overflow-hidden px-4"
      style={{
        background: 'radial-gradient(circle at center, #1e1215 0%, #0a0506 100%)',
        fontFamily: "'Outfit', 'Inter', sans-serif"
      }}
    >
      {/* Dynamic Animated Glowing Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-[#D48C8C]/10 blur-[100px] animate-pulse duration-[6000ms]" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-[#E5C3B2]/10 blur-[100px] animate-pulse duration-[8000ms]" />

      {/* Floating Particle Elements */}
      <div className="absolute inset-0 pointer-events-none opacity-40">
        <div className="absolute top-1/3 left-1/5 w-2 h-2 rounded-full bg-[#D48C8C] animate-ping duration-[3000ms]" />
        <div className="absolute top-2/3 right-1/4 w-3 h-3 rounded-full bg-[#E5C3B2] animate-bounce duration-[4000ms]" />
        <div className="absolute bottom-1/5 left-1/3 w-1.5 h-1.5 rounded-full bg-[#fff] animate-pulse duration-[2000ms]" />
      </div>

      {/* Main Glass Content Box */}
      <div 
        className="max-w-xl w-full text-center p-8 sm:p-12 rounded-3xl relative z-10 transition-all duration-500 scale-100"
        style={{
          background: 'linear-gradient(152.97deg, rgba(255, 232, 225, 0.05) 0%, rgba(255, 232, 225, 0.01) 100%)',
          backdropFilter: 'blur(24px)',
          border: '1px solid rgba(255, 232, 225, 0.08)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
        }}
      >
        {/* LoversAI Image Logo */}
        <div className="flex justify-center mb-6">
          <div className="relative group">
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-[#D48C8C] to-[#E5C3B2] blur-2xl opacity-20 group-hover:opacity-40 transition-opacity duration-500 animate-pulse" />
            <img 
              src="/images/logo copy.png" 
              alt="Lovers AI Logo" 
              className="h-20 w-auto object-contain relative z-10 transition-transform duration-300 hover:scale-105"
            />
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D48C8C] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#D48C8C]"></span>
            </span>
            <span className="text-xs uppercase tracking-widest text-[#E5C3B2] font-semibold">Under Maintenance</span>
          </div>
        </div>

        {/* Premium Typography Heading */}
        <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight mb-4 leading-tight">
          Under Construction <br />
          <span className="bg-gradient-to-r from-[#D48C8C] via-[#E5C3B2] to-[#fff] bg-clip-text text-transparent">
            We'll Be Back Soon
          </span>
        </h1>

        {/* Detailed Message */}
        <p className="text-gray-400 text-sm sm:text-base leading-relaxed mb-8 max-w-md mx-auto">
          LoversAI is undergoing major upgrades to craft the future of digital wedding planning. Thank you for your patience as we build something beautiful for you.
        </p>

        {/* Interactive Loader Indicator */}
        <div className="w-full max-w-[240px] h-[3px] bg-white/10 rounded-full mx-auto overflow-hidden mb-8">
          <div 
            className="h-full rounded-full bg-gradient-to-r from-[#D48C8C] to-[#E5C3B2] animate-[loading_2.5s_infinite_ease-in-out]" 
            style={{
              width: '40%'
            }}
          />
        </div>

        {/* Support Contact */}
        <div className="text-xs text-gray-500">
          Need immediate assistance? Reach us at{' '}
          <a href="mailto:support@theloversai.co.in" className="text-[#D48C8C] hover:underline hover:text-[#E5C3B2] transition-colors">
            support@theloversai.co.in
          </a>
        </div>
      </div>

      {/* Embedded CSS Animation for the custom loading bar */}
      <style>{`
        @keyframes loading {
          0% {
            transform: translateX(-150%);
          }
          50% {
            transform: translateX(150%);
          }
          100% {
            transform: translateX(-150%);
          }
        }
      `}</style>
    </div>
  );
};

export default Maintenance;
